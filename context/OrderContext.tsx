// context/OrderContext.tsx — order tracking and history state manager
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { getOrder, getUserOrders } from '@/services/api';
import { cacheGet, cacheSet, cacheClear } from '@/utils/cache';

const ACTIVE_ORDERS_KEY = 'cache:active_orders';
const POLL_INTERVAL_MS = 30_000;
const HISTORY_PAGE_SIZE = 10;

export interface Order {
  orderId: string;
  queueNum: string;
  status: 'received' | 'processing' | 'ready' | 'completed' | 'cancelled';
  items: Array<{ name: string; qty: number; price: number }>;
  total: number;
  orderMode: string;
  createdAt: string;
  branchCode: string;
}

interface OrderState {
  activeOrders: Order[];
  orderHistory: Order[];
  loadingHistory: boolean;
  addActiveOrder: (order: Order) => void;
  removeActiveOrder: (orderId: string) => void;
  fetchHistory: (userToken: string) => Promise<void>;
  loadMoreHistory: (userToken: string) => Promise<void>;
  hasMoreHistory: boolean;
}

const OrderContext = createContext<OrderState | null>(null);

/** Try to extract order status from an ESB response of unknown shape. */
function extractStatus(result: any): Order['status'] | null {
  const raw = result?.status ?? result?.orderStatus ?? result?.data?.status;
  if (typeof raw === 'string' && ['received', 'processing', 'ready', 'completed', 'cancelled'].includes(raw)) {
    return raw as Order['status'];
  }
  return null;
}

/** Best-effort mapping of an ESB history item to our Order shape. */
function mapToOrder(item: any): Order {
  return {
    orderId: item.orderId ?? item.order_id ?? item.id ?? '',
    queueNum: item.queueNum ?? item.queue_num ?? item.queueNumber ?? '',
    status: extractStatus(item) ?? 'received',
    items: Array.isArray(item.items)
      ? item.items.map((i: any) => ({
          name: i.name ?? i.itemName ?? '',
          qty: Number(i.qty ?? i.quantity ?? 0),
          price: Number(i.price ?? 0),
        }))
      : [],
    total: Number(item.total ?? item.totalAmount ?? item.grandTotal ?? 0),
    orderMode: item.orderMode ?? item.order_mode ?? item.mode ?? '',
    createdAt: item.createdAt ?? item.created_at ?? item.date ?? '',
    branchCode: item.branchCode ?? item.branch_code ?? item.branch ?? '',
  };
}

export function OrderProvider({ children }: { children: ReactNode }) {
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [historyPage, setHistoryPage] = useState(1);

  const pollTimers = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  // ── Persistence ───────────────────────────────────────────────────────

  // Restore active orders from cache on mount
  useEffect(() => {
    cacheGet<Order[]>(ACTIVE_ORDERS_KEY).then(cached => {
      if (cached && cached.length > 0) setActiveOrders(cached);
    });
  }, []);

  // Persist active orders on every change
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      if (activeOrders.length > 0) {
        cacheSet(ACTIVE_ORDERS_KEY, activeOrders);
      } else {
        cacheClear(ACTIVE_ORDERS_KEY);
      }
    }, 500);
    return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current); };
  }, [activeOrders]);

  // ── Polling ───────────────────────────────────────────────────────────

  const startPolling = useCallback((order: Order) => {
    // Avoid duplicate timers
    if (pollTimers.current.has(order.orderId)) return;

    const timer = setInterval(async () => {
      try {
        const result = await getOrder(order.orderId, order.branchCode);
        const status = extractStatus(result);
        if (!status) return;

        setActiveOrders(prev =>
          prev.map(o => (o.orderId === order.orderId ? { ...o, status } : o)),
        );

        if (status === 'completed' || status === 'cancelled') {
          clearInterval(timer);
          pollTimers.current.delete(order.orderId);
        }
      } catch {
        // Network hiccup — keep polling
      }
    }, POLL_INTERVAL_MS);

    pollTimers.current.set(order.orderId, timer);
  }, []);

  const stopPolling = useCallback((orderId: string) => {
    const timer = pollTimers.current.get(orderId);
    if (timer) {
      clearInterval(timer);
      pollTimers.current.delete(orderId);
    }
  }, []);

  // Start polling for all restored active orders that are still in-progress
  useEffect(() => {
    activeOrders.forEach(order => {
      if (order.status !== 'completed' && order.status !== 'cancelled') {
        startPolling(order);
      }
    });
    // Only run when activeOrders identity changes (not on every render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrders]);

  // Clean up all intervals on unmount
  useEffect(() => {
    return () => {
      pollTimers.current.forEach(timer => clearInterval(timer));
      pollTimers.current.clear();
    };
  }, []);

  // ── Active order mutations ────────────────────────────────────────────

  const addActiveOrder = useCallback((order: Order) => {
    setActiveOrders(prev => [order, ...prev.filter(o => o.orderId !== order.orderId)]);
    if (order.status !== 'completed' && order.status !== 'cancelled') {
      startPolling(order);
    }
  }, [startPolling]);

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
            : [];
      return list.map(mapToOrder);
    } catch {
      return [];
    }
  };

  const fetchHistory = useCallback(async (userToken: string) => {
    setLoadingHistory(true);
    try {
      const result = await getUserOrders(userToken, 1);
      const orders = parseHistoryResponse(result);
      setOrderHistory(orders);
      setHistoryPage(1);
      setHasMoreHistory(orders.length >= HISTORY_PAGE_SIZE);
    } catch {
      setOrderHistory([]);
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
    } catch {
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
