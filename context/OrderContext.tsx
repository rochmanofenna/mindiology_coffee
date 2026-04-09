// context/OrderContext.tsx — order tracking and history state manager
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Sentry from '@sentry/react-native';
import { getOrder, getUserOrders, validatePayment } from '@/services/api';
import { cacheGet, cacheSet, cacheClear } from '@/utils/cache';

const ACTIVE_ORDERS_KEY = 'cache:active_orders';
const HISTORY_KEY = 'cache:order_history';
// 10s — responsive enough for food ops without hammering ESB.
// If ESB rate-limits us, bump this back to 15-20s.
const POLL_INTERVAL_MS = 10_000;
// Delay before first poll after order creation — give ESB time to register the order.
const FIRST_POLL_DELAY_MS = 2_000;
// Delay before graduating a terminal order (completed/cancelled) to history.
// Gives the user a moment to see the final state in the active list.
const GRADUATE_DELAY_MS = 5_000;
const HISTORY_PAGE_SIZE = 10;

export type OrderStatus =
  | 'waiting_payment'
  | 'received'
  | 'processing'
  | 'ready'
  | 'completed'
  | 'cancelled';

export interface Order {
  orderId: string;
  queueNum: string;
  status: OrderStatus;
  items: Array<{ name: string; qty: number; price: number }>;
  total: number;
  orderMode: string;
  createdAt: string;
  branchCode: string;
  paymentMethodID?: string;
  /** ms timestamp of the most recent successful poll */
  lastPolledAt?: number;
}

interface OrderState {
  activeOrders: Order[];
  orderHistory: Order[];
  loadingHistory: boolean;
  historyError: string | null;
  addActiveOrder: (order: Order) => void;
  removeActiveOrder: (orderId: string) => void;
  fetchHistory: (userToken: string) => Promise<void>;
  loadMoreHistory: (userToken: string) => Promise<void>;
  hasMoreHistory: boolean;
}

const OrderContext = createContext<OrderState | null>(null);

// ── ESB status mapping ─────────────────────────────────────────────────
// Empirically derived from production ESB responses (see server/samples/ESB_STATUS_MAP.md).
// Keys are LOWERCASED — we normalize before lookup.
// Unmapped values get captured to Sentry and return null.

const ESB_ORDER_STATUS_MAP: Record<string, OrderStatus> = {
  // Confirmed from production:
  'new': 'waiting_payment', // ESB returns "New" before payment is confirmed — we disambiguate with salesPayment.paymentStatus
  // Inferred — log via Sentry if encountered to confirm:
  'accepted': 'received',
  'confirmed': 'received',
  'received': 'received',
  'diterima': 'received',
  'processing': 'processing',
  'inprogress': 'processing',
  'in_progress': 'processing',
  'preparing': 'processing',
  'diproses': 'processing',
  'ready': 'ready',
  'siap': 'ready',
  'siap_diambil': 'ready',
  'completed': 'completed',
  'complete': 'completed',
  'done': 'completed',
  'selesai': 'completed',
  'cancelled': 'cancelled',
  'canceled': 'cancelled',
  'void': 'cancelled',
  'voided': 'cancelled',
  'dibatalkan': 'cancelled',
};

const ESB_PAYMENT_VALIDATE_TERMINAL: Record<string, OrderStatus> = {
  // If the payment validate endpoint returns one of these, the order is cancelled-equivalent.
  'expired': 'cancelled',
  'failed': 'cancelled',
  'cancelled': 'cancelled',
  'canceled': 'cancelled',
  'declined': 'cancelled',
};

/**
 * Extract the order status from an ESB order detail response.
 * Applies disambiguation logic for the ambiguous "New" state using salesPayment.
 * Returns null for unmapped values and logs to Sentry.
 */
function extractStatus(result: any): OrderStatus | null {
  const raw = result?.status ?? result?.orderStatus ?? result?.order_status
    ?? result?.data?.status ?? result?.data?.orderStatus;

  if (raw == null) {
    Sentry.captureMessage('extractStatus: no status field found in ESB response', {
      level: 'warning',
      extra: {
        responseKeys: Object.keys(result || {}),
        dataKeys: Object.keys(result?.data || {}),
      },
    });
    return null;
  }

  const normalized = String(raw).toLowerCase().trim();
  const mapped = ESB_ORDER_STATUS_MAP[normalized];

  if (!mapped) {
    Sentry.captureMessage(`extractStatus: unmapped ESB status "${raw}"`, {
      level: 'error',
      extra: {
        rawStatus: raw,
        normalized,
        fullResponse: JSON.stringify(result).slice(0, 500),
      },
    });
    return null;
  }

  // Disambiguate "New" — ESB keeps orders in "New" state until the kitchen accepts.
  // If the payment is closed AND there's a paymentDate, the order is actually received.
  // Otherwise "New" means still waiting for payment.
  if (mapped === 'waiting_payment' && normalized === 'new') {
    const paymentStatus = String(result?.salesPayment?.paymentStatus ?? '').toLowerCase();
    const paymentDate = result?.salesPayment?.paymentDate;
    if (paymentStatus === 'closed' && paymentDate) {
      return 'received';
    }
    return 'waiting_payment';
  }

  return mapped;
}

/** Map a payment validate response to a terminal order status override, if applicable. */
function extractPaymentTerminalStatus(result: any): OrderStatus | null {
  const raw = result?.status ?? result?.paymentStatus ?? result?.data?.status;
  if (raw == null) return null;
  const normalized = String(raw).toLowerCase().trim();
  return ESB_PAYMENT_VALIDATE_TERMINAL[normalized] ?? null;
}

/** Best-effort mapping of an ESB history item to our Order shape. */
function mapToOrder(item: any): Order {
  return {
    orderId: item.orderID ?? item.orderId ?? item.order_id ?? item.id ?? '',
    queueNum: String(item.queueNum ?? item.queue_num ?? item.queueNumber ?? ''),
    status: extractStatus(item) ?? 'received',
    items: Array.isArray(item.salesMenus ?? item.items)
      ? (item.salesMenus ?? item.items).map((i: any) => ({
          name: String(i.menuName ?? i.name ?? i.itemName ?? ''),
          qty: Number(i.qty ?? i.quantity ?? 0),
          price: Number(i.sellPrice ?? i.price ?? 0),
        }))
      : [],
    total: Number(item.grandTotal ?? item.total ?? item.totalAmount ?? 0),
    orderMode: String(item.orderType ?? item.orderMode ?? item.order_mode ?? item.mode ?? ''),
    createdAt: String(item.transactionDate ?? item.createdAt ?? item.created_at ?? item.date ?? ''),
    branchCode: String(item.branchCode ?? item.branch_code ?? item.branch ?? ''),
    paymentMethodID: item.salesPayment?.paymentMethodID ?? item.paymentMethodID,
  };
}

export function OrderProvider({ children }: { children: ReactNode }) {
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [historyPage, setHistoryPage] = useState(1);

  // Mutable refs for use inside long-lived closures (polling intervals, AppState listener).
  // activeOrders state is captured via ref to avoid stale closures across interval ticks.
  const activeOrdersRef = useRef<Order[]>([]);
  const pollTimers = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const appState = useRef<AppStateStatus>(AppState.currentState);

  // Keep ref in sync with state on every change.
  useEffect(() => {
    activeOrdersRef.current = activeOrders;
  }, [activeOrders]);

  // ── Persistence ───────────────────────────────────────────────────────

  // Restore active orders + history from cache on mount.
  useEffect(() => {
    (async () => {
      try {
        const cachedActive = await cacheGet<Order[]>(ACTIVE_ORDERS_KEY);
        if (cachedActive && cachedActive.length > 0) {
          setActiveOrders(cachedActive);
          // Start polling for restored orders that are still in-progress.
          cachedActive.forEach(order => {
            if (order.status !== 'completed' && order.status !== 'cancelled') {
              startPolling(order);
            }
          });
        }
        const cachedHistory = await cacheGet<Order[]>(HISTORY_KEY);
        if (cachedHistory && cachedHistory.length > 0) {
          setOrderHistory(cachedHistory);
        }
      } catch (err) {
        Sentry.captureException(err, { tags: { context: 'order_restore_cache' } });
      }
    })();
  }, []);

  // Persist active orders on every change (debounced).
  const activeSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (activeSaveTimeout.current) clearTimeout(activeSaveTimeout.current);
    activeSaveTimeout.current = setTimeout(() => {
      if (activeOrders.length > 0) {
        cacheSet(ACTIVE_ORDERS_KEY, activeOrders).catch(err =>
          Sentry.captureException(err, { tags: { context: 'order_persist_active' } }),
        );
      } else {
        cacheClear(ACTIVE_ORDERS_KEY).catch(() => {});
      }
    }, 500);
    return () => { if (activeSaveTimeout.current) clearTimeout(activeSaveTimeout.current); };
  }, [activeOrders]);

  // Persist history on every change (debounced).
  const historySaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (historySaveTimeout.current) clearTimeout(historySaveTimeout.current);
    historySaveTimeout.current = setTimeout(() => {
      if (orderHistory.length > 0) {
        cacheSet(HISTORY_KEY, orderHistory.slice(0, 50)).catch(err =>
          Sentry.captureException(err, { tags: { context: 'order_persist_history' } }),
        );
      }
    }, 500);
    return () => { if (historySaveTimeout.current) clearTimeout(historySaveTimeout.current); };
  }, [orderHistory]);

  // ── Polling core ──────────────────────────────────────────────────────

  /**
   * Perform a single status check for an order. Extracted so it can be called
   * both from the interval tick and from the immediate-first-poll timeout.
   */
  const pollOrderNow = useCallback(async (order: Order) => {
    const currentOrders = activeOrdersRef.current;
    const currentOrder = currentOrders.find(o => o.orderId === order.orderId);

    // Order was removed from active list — no-op.
    if (!currentOrder) return;

    // Check payment validity while order is still in waiting_payment state.
    // If payment validate returns a terminal status (expired/failed), override to cancelled.
    let paymentTerminal: OrderStatus | null = null;
    if (currentOrder.status === 'waiting_payment') {
      try {
        const payResult = await validatePayment(order.orderId, order.branchCode);
        paymentTerminal = extractPaymentTerminalStatus(payResult);
      } catch (err: any) {
        // Network errors are common during payment flow — only report non-404s.
        const status = err?.status ?? err?.response?.status;
        if (status && status !== 404) {
          Sentry.captureException(err, {
            tags: { context: 'payment_validate', orderId: order.orderId },
          });
        }
      }
    }

    // Fetch order status.
    let newStatus: OrderStatus | null = null;
    try {
      const result = await getOrder(order.orderId, order.branchCode);
      newStatus = extractStatus(result);
    } catch (err) {
      Sentry.captureException(err, {
        tags: { context: 'order_polling', orderId: order.orderId },
      });
      return;
    }

    // Payment terminal status wins over order status (if payment expired, order is cancelled).
    const finalStatus = paymentTerminal ?? newStatus;
    if (!finalStatus) return; // extractStatus already logged to Sentry

    // Update state only if status actually changed.
    if (finalStatus !== currentOrder.status) {
      setActiveOrders(prev =>
        prev.map(o =>
          o.orderId === order.orderId
            ? { ...o, status: finalStatus, lastPolledAt: Date.now() }
            : o,
        ),
      );

      // Haptic feedback on status change.
      if (finalStatus === 'ready') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else if (finalStatus === 'cancelled') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }

      // Terminal states — stop polling and graduate to history after a brief delay.
      if (finalStatus === 'completed' || finalStatus === 'cancelled') {
        const timer = pollTimers.current.get(order.orderId);
        if (timer) {
          clearInterval(timer);
          pollTimers.current.delete(order.orderId);
        }
        setTimeout(() => graduateToHistory(order.orderId), GRADUATE_DELAY_MS);
      }
    } else {
      // Still update lastPolledAt so the UI can show "last checked X seconds ago".
      setActiveOrders(prev =>
        prev.map(o =>
          o.orderId === order.orderId ? { ...o, lastPolledAt: Date.now() } : o,
        ),
      );
    }
  }, []);

  const startPolling = useCallback((order: Order) => {
    // Guard — don't start a duplicate timer.
    if (pollTimers.current.has(order.orderId)) return;

    const timer = setInterval(() => {
      pollOrderNow(order).catch(err =>
        Sentry.captureException(err, {
          tags: { context: 'poll_interval', orderId: order.orderId },
        }),
      );
    }, POLL_INTERVAL_MS);

    pollTimers.current.set(order.orderId, timer);
  }, [pollOrderNow]);

  const stopPolling = useCallback((orderId: string) => {
    const timer = pollTimers.current.get(orderId);
    if (timer) {
      clearInterval(timer);
      pollTimers.current.delete(orderId);
    }
  }, []);

  // Clean up all intervals on unmount.
  useEffect(() => {
    return () => {
      pollTimers.current.forEach(timer => clearInterval(timer));
      pollTimers.current.clear();
    };
  }, []);

  // ── AppState: poll immediately when app comes back to foreground ──────

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const wasBackground = appState.current.match(/inactive|background/);
      if (wasBackground && nextState === 'active') {
        // Resume aggressive polling on all active, non-terminal orders.
        activeOrdersRef.current.forEach(order => {
          if (order.status !== 'completed' && order.status !== 'cancelled') {
            pollOrderNow(order).catch(() => {});
          }
        });
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [pollOrderNow]);

  // ── Order graduation: active → history ────────────────────────────────

  const graduateToHistory = useCallback((orderId: string) => {
    setActiveOrders(prev => {
      const order = prev.find(o => o.orderId === orderId);
      if (order) {
        // Prepend the graduated order to history (most recent first).
        setOrderHistory(histPrev => {
          // Avoid duplicates if the history was recently fetched.
          if (histPrev.some(h => h.orderId === orderId)) return histPrev;
          return [order, ...histPrev];
        });
      }
      return prev.filter(o => o.orderId !== orderId);
    });
    stopPolling(orderId);
  }, [stopPolling]);

  // ── Active order mutations ────────────────────────────────────────────

  const addActiveOrder = useCallback((order: Order) => {
    setActiveOrders(prev => {
      // Avoid adding a duplicate if the order already exists.
      if (prev.some(o => o.orderId === order.orderId)) return prev;
      return [{ ...order, lastPolledAt: Date.now() }, ...prev];
    });

    if (order.status !== 'completed' && order.status !== 'cancelled') {
      // First check runs after a short delay (give ESB time to register).
      setTimeout(() => {
        pollOrderNow(order).catch(() => {});
      }, FIRST_POLL_DELAY_MS);

      // Then start the recurring interval.
      startPolling(order);
    }
  }, [startPolling, pollOrderNow]);

  const removeActiveOrder = useCallback((orderId: string) => {
    stopPolling(orderId);
    setActiveOrders(prev => prev.filter(o => o.orderId !== orderId));
  }, [stopPolling]);

  // ── Order history ─────────────────────────────────────────────────────

  const parseHistoryResponse = (result: any): Order[] => {
    try {
      const list = Array.isArray(result)
        ? result
        : Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result?.orders)
            ? result.orders
            : Array.isArray(result?.salesOrders)
              ? result.salesOrders
              : [];
      return list.map(mapToOrder);
    } catch (err) {
      Sentry.captureException(err, { tags: { context: 'parse_history' } });
      return [];
    }
  };

  const fetchHistory = useCallback(async (userToken: string) => {
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const result = await getUserOrders(userToken, 1);
      const orders = parseHistoryResponse(result);
      setOrderHistory(orders);
      setHistoryPage(1);
      setHasMoreHistory(orders.length >= HISTORY_PAGE_SIZE);
    } catch (err: any) {
      Sentry.captureException(err, { tags: { context: 'fetch_history' } });
      setHistoryError(err?.message || 'Gagal memuat riwayat pesanan');
      // Don't clear existing history on error — preserve last-known-good.
      setHasMoreHistory(false);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const loadMoreHistory = useCallback(async (userToken: string) => {
    const nextPage = historyPage + 1;
    setLoadingHistory(true);
    try {
      const result = await getUserOrders(userToken, nextPage);
      const orders = parseHistoryResponse(result);
      setOrderHistory(prev => [...prev, ...orders]);
      setHistoryPage(nextPage);
      setHasMoreHistory(orders.length >= HISTORY_PAGE_SIZE);
    } catch (err) {
      Sentry.captureException(err, { tags: { context: 'load_more_history' } });
      setHasMoreHistory(false);
    } finally {
      setLoadingHistory(false);
    }
  }, [historyPage]);

  return (
    <OrderContext.Provider
      value={{
        activeOrders,
        orderHistory,
        loadingHistory,
        historyError,
        addActiveOrder,
        removeActiveOrder,
        fetchHistory,
        loadMoreHistory,
        hasMoreHistory,
      }}
    >
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error('useOrder must be used within OrderProvider');
  return ctx;
}
