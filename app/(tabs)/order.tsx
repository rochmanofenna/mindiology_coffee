// app/(tabs)/order.tsx — Order Tracking + History Screen
// Editorial restaurant-ticket aesthetic: each active order reads like a
// letterpressed kitchen ticket. Fraunces display for identifiers, DMSans
// for functional copy, forest-green and cream color bias throughout.
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Font, Spacing, Radius, Shadow, fmtPrice } from '@/constants/theme';
import { useOrder, type Order, type OrderStatus } from '@/context/OrderContext';
import { useAuth } from '@/context/AuthContext';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { titleCase, relativeTime, formatOrderTime, formatShortDate, paymentMethodLabel, orderModeLabel } from '@/utils/formatting';

// Enable LayoutAnimation on Android for smooth expand/collapse.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* ── Status model ─────────────────────────────────────────────────────── */

const STEPS = [
  { label: 'Diterima', icon: 'receipt-outline' as const },
  { label: 'Diproses', icon: 'flame-outline' as const },
  { label: 'Siap Diambil', icon: 'checkmark-circle-outline' as const },
  { label: 'Selesai', icon: 'star-outline' as const },
];

const STATUS_TO_STEP: Record<OrderStatus, number> = {
  waiting_payment: -1, // pre-stepper — amber banner shown instead
  received: 0,
  processing: 1,
  ready: 2,
  completed: 3,
  cancelled: -2, // terminal failed state — muted overlay shown
};

const ESTIMATE_MINUTES: Record<number, number> = {
  0: 15,
  1: 10,
  2: 3,
};

/* ── Pulse dot for the current step ───────────────────────────────────── */

function PulseDot() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.6, duration: 900, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.0, duration: 900, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0, duration: 900, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.4, duration: 900, useNativeDriver: true }),
        ]),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <View style={styles.activeStepOuter}>
      <Animated.View
        style={[
          styles.activeStepHalo,
          { transform: [{ scale }], opacity },
        ]}
      />
      <View style={styles.activeStepCore} />
    </View>
  );
}

/* ── Dashed connector (cross-platform, since RN dashed borders are flaky) ── */

function DashedLine() {
  return (
    <View style={styles.connectorDashed}>
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.connectorDot} />
      ))}
    </View>
  );
}

/* ── Status stepper component ─────────────────────────────────────────── */

function StatusStepper({ status, dim = false }: { status: OrderStatus; dim?: boolean }) {
  const currentStep = STATUS_TO_STEP[status] ?? 0;

  return (
    <View style={[styles.stepperContainer, dim && styles.stepperDim]}>
      {STEPS.map((step, idx) => {
        const isDone = idx < currentStep;
        const isCurrent = idx === currentStep && !dim;
        const isFuture = idx > currentStep || dim;
        const isLast = idx === STEPS.length - 1;

        return (
          <View key={step.label}>
            <View style={styles.stepRow}>
              {/* Circle indicator */}
              {isCurrent ? (
                <PulseDot />
              ) : isDone ? (
                <View style={styles.stepCircleDone}>
                  <Ionicons name="checkmark" size={10} color="#fff" />
                </View>
              ) : (
                <View style={styles.stepCircleFuture} />
              )}

              {/* Label */}
              <View style={styles.stepLabelWrap}>
                <Text
                  style={[
                    styles.stepLabelBase,
                    isDone && styles.stepLabelDone,
                    isCurrent && styles.stepLabelCurrent,
                    isFuture && styles.stepLabelFuture,
                  ]}
                >
                  {step.label}
                </Text>
                {isCurrent && ESTIMATE_MINUTES[idx] !== undefined && (
                  <Text style={styles.stepEstimate}>
                    Estimasi ~{ESTIMATE_MINUTES[idx]} menit
                  </Text>
                )}
              </View>
            </View>

            {/* Connector line */}
            {!isLast &&
              (isDone ? (
                <View style={styles.connectorSolid} />
              ) : (
                <DashedLine />
              ))}
          </View>
        );
      })}
    </View>
  );
}

/* ── Waiting-for-payment amber banner ─────────────────────────────────── */

function WaitingPaymentBanner({
  paymentMethodID,
  onOpenPayment,
}: {
  paymentMethodID?: string;
  onOpenPayment?: () => void;
}) {
  const label = paymentMethodLabel(paymentMethodID);
  const hasPaymentApp = paymentMethodID && /dana|ovo|gopay|shopee/i.test(paymentMethodID);

  // Subtle pulsing ring on the hourglass icon.
  const pulse = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.0, duration: 1100, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.6, duration: 1100, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <View style={styles.waitingBanner}>
      <View style={styles.waitingIconWrap}>
        <Animated.View style={[styles.waitingIconRing, { opacity: pulse }]} />
        <Ionicons name="hourglass-outline" size={18} color={Colors.gold} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.waitingTitle}>Menunggu Pembayaran</Text>
        <Text style={styles.waitingSubtitle}>
          {hasPaymentApp
            ? `Selesaikan pembayaran di ${label} untuk memulai pesananmu.`
            : 'Selesaikan pembayaran untuk memulai pesananmu.'}
        </Text>
        {hasPaymentApp && onOpenPayment && (
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.waitingAction}
            onPress={onOpenPayment}
          >
            <Text style={styles.waitingActionText}>Buka {label}</Text>
            <Ionicons name="arrow-forward" size={13} color={Colors.gold} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/* ── Cancelled ribbon (overlay for terminal failure state) ───────────── */

function CancelledPill() {
  return (
    <View style={styles.cancelledPill}>
      <Ionicons name="close" size={11} color="#fff" />
      <Text style={styles.cancelledPillText}>Dibatalkan</Text>
    </View>
  );
}

/* ── Active order card (expandable) ───────────────────────────────────── */

function ActiveOrderCard({ order }: { order: Order }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const isWaitingPayment = order.status === 'waiting_payment';
  const isCancelled = order.status === 'cancelled';
  const hasQueueNumber = order.queueNum && String(order.queueNum).trim().length > 0;

  const toggleExpanded = useCallback(() => {
    LayoutAnimation.configureNext({
      duration: 260,
      create: { type: 'easeInEaseOut', property: 'opacity' },
      update: { type: 'easeInEaseOut' },
      delete: { type: 'easeInEaseOut', property: 'opacity' },
    });
    setExpanded((prev) => !prev);
    Haptics.selectionAsync().catch(() => {});
  }, []);

  const handleOpenPayment = useCallback(() => {
    // Best-effort deep link to the payment app. Most Indonesian e-wallets use
    // their store pages or schemes — we fall back to opening the cart again.
    const id = order.paymentMethodID?.toLowerCase() || '';
    const fallbacks: Record<string, string> = {
      dana: 'dana://',
      ovo: 'ovo://',
      gopay: 'gojek://',
      shopeepay: 'shopeeid://',
    };
    const key = Object.keys(fallbacks).find((k) => id.includes(k));
    if (key) {
      Linking.openURL(fallbacks[key]).catch(() => {
        router.push('/cart' as any);
      });
    } else {
      router.push('/cart' as any);
    }
  }, [order.paymentMethodID, router]);

  const handleReorder = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push('/menu' as any);
  }, [router]);

  const itemCount = order.items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={toggleExpanded}
      style={[
        styles.activeCard,
        isCancelled && styles.activeCardCancelled,
        isWaitingPayment && styles.activeCardWaiting,
      ]}
    >
      {/* Left edge indicator — kitchen-ticket vibe */}
      <View
        style={[
          styles.cardEdge,
          isCancelled && styles.cardEdgeCancelled,
          isWaitingPayment && styles.cardEdgeWaiting,
        ]}
      />

      <View style={[styles.activeCardInner, isCancelled && { opacity: 0.55 }]}>
        {/* ── Header row: order ID + mode pill ── */}
        <View style={styles.activeCardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.orderIdLabel}>ORDER ID</Text>
            <Text style={styles.orderIdValue} numberOfLines={1}>
              #{order.orderId}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {isCancelled ? null : (
              <View style={styles.modePill}>
                <Text style={styles.modePillText}>{orderModeLabel(order.orderMode)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Queue number display ── */}
        {hasQueueNumber && !isCancelled && (
          <View style={styles.queueRow}>
            <Text style={styles.queueLabel}>Nomor Antrian</Text>
            <Text style={styles.queueNumValue}>{order.queueNum}</Text>
          </View>
        )}

        {/* ── Items summary line ── */}
        <Text style={styles.itemsSummary}>
          {itemCount} item · {fmtPrice(order.total / 1000)}
        </Text>

        {/* ── Waiting payment banner (only in waiting_payment state) ── */}
        {isWaitingPayment && (
          <WaitingPaymentBanner
            paymentMethodID={order.paymentMethodID}
            onOpenPayment={handleOpenPayment}
          />
        )}

        {/* ── Status stepper (dimmed if waiting payment, hidden if cancelled) ── */}
        {!isCancelled && <StatusStepper status={order.status} dim={isWaitingPayment} />}

        {/* ── Cancelled state: ribbon + reorder CTA ── */}
        {isCancelled && (
          <View style={styles.cancelledBlock}>
            <CancelledPill />
            <Text style={styles.cancelledReason}>
              Pesanan dibatalkan karena pembayaran tidak diselesaikan.
            </Text>
          </View>
        )}

        {/* ── Expandable details ── */}
        {expanded && (
          <View style={styles.detailsBlock}>
            <View style={styles.detailsDivider} />
            <Text style={styles.detailsHeading}>Pesanan</Text>
            {order.items.map((it, i) => (
              <View key={i} style={styles.detailsItemRow}>
                <Text style={styles.detailsItemQty}>{it.qty}×</Text>
                <Text style={styles.detailsItemName} numberOfLines={2}>
                  {titleCase(it.name)}
                </Text>
                <Text style={styles.detailsItemPrice}>
                  {fmtPrice((it.price * it.qty) / 1000)}
                </Text>
              </View>
            ))}
            <View style={styles.detailsMetaDivider} />
            {order.paymentMethodID && (
              <View style={styles.detailsMetaRow}>
                <Text style={styles.detailsMetaLabel}>Pembayaran</Text>
                <Text style={styles.detailsMetaValue}>
                  {paymentMethodLabel(order.paymentMethodID)}
                </Text>
              </View>
            )}
            <View style={styles.detailsMetaRow}>
              <Text style={styles.detailsMetaLabel}>Dipesan</Text>
              <Text style={styles.detailsMetaValue}>{formatOrderTime(order.createdAt)}</Text>
            </View>
            <View style={styles.detailsMetaRow}>
              <Text style={styles.detailsMetaLabel}>Cabang</Text>
              <Text style={styles.detailsMetaValue}>{order.branchCode}</Text>
            </View>
          </View>
        )}

        {/* ── Footer: last-updated + expand/collapse chevron ── */}
        <View style={styles.footerRow}>
          {!isCancelled && (
            <View style={styles.lastUpdatedWrap}>
              <Ionicons name="sync-outline" size={11} color={Colors.textSoft} />
              <Text style={styles.lastUpdatedText}>
                Diperbarui {relativeTime(order.lastPolledAt)}
              </Text>
            </View>
          )}
          {isCancelled && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleReorder}
              style={styles.reorderBtn}
            >
              <Text style={styles.reorderText}>Pesan Lagi</Text>
              <Ionicons name="arrow-forward" size={13} color={Colors.green} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          <View style={styles.chevronWrap}>
            <Text style={styles.chevronLabel}>
              {expanded ? 'Sembunyikan' : 'Rincian'}
            </Text>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={Colors.textSoft}
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

/* ── History status badge ─────────────────────────────────────────────── */

function HistoryStatusBadge({ status }: { status: OrderStatus }) {
  const styleByStatus: Record<OrderStatus, { bg: string; color: string; label: string }> = {
    waiting_payment: { bg: '#FBF2D8', color: Colors.gold, label: 'Belum Bayar' },
    received: { bg: Colors.greenMint, color: Colors.green, label: 'Diterima' },
    processing: { bg: Colors.greenMint, color: Colors.green, label: 'Diproses' },
    ready: { bg: Colors.greenMint, color: Colors.green, label: 'Siap' },
    completed: { bg: Colors.greenMint, color: Colors.green, label: 'Selesai' },
    cancelled: { bg: Colors.hibiscusLight, color: Colors.hibiscus, label: 'Dibatalkan' },
  };
  const s = styleByStatus[status] ?? styleByStatus.received;
  return (
    <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
      <Text style={[styles.statusBadgeText, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

/* ── Main screen ──────────────────────────────────────────────────────── */

export default function OrderScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const {
    activeOrders,
    orderHistory,
    loadingHistory,
    historyError,
    fetchHistory,
    loadMoreHistory,
    hasMoreHistory,
  } = useOrder();

  const [refreshing, setRefreshing] = useState(false);

  // Drive the "last updated X seconds ago" re-render every second.
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (activeOrders.length === 0) return;
    const interval = setInterval(() => forceTick((x) => x + 1), 1000);
    return () => clearInterval(interval);
  }, [activeOrders.length]);

  // Bounce CTA animation (only when no active orders).
  const bounceAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (activeOrders.length > 0) return;
    const timeout = setTimeout(() => {
      Animated.spring(bounceAnim, {
        toValue: 1,
        speed: 12,
        bounciness: 8,
        useNativeDriver: true,
      }).start();
    }, 500);
    return () => clearTimeout(timeout);
  }, [activeOrders.length]);

  const translateY = bounceAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -8, 0],
  });

  /* Fetch history on mount / auth change */
  useEffect(() => {
    if (user?.authkey) {
      fetchHistory(user.authkey);
    }
  }, [user?.authkey, fetchHistory]);

  const onRefresh = useCallback(async () => {
    if (!user?.authkey) return;
    setRefreshing(true);
    try {
      await fetchHistory(user.authkey);
    } finally {
      setRefreshing(false);
    }
  }, [user?.authkey, fetchHistory]);

  /* ── Auth gate ───────────────────────────────────────────────────── */
  if (!user) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.screenEyebrow}>Kamarasan</Text>
          <Text style={styles.screenTitle}>Pesanan</Text>
        </View>
        <View style={styles.authGate}>
          <View style={styles.authGateIconWrap}>
            <Ionicons name="lock-closed-outline" size={32} color={Colors.green} />
          </View>
          <Text style={styles.authGateText}>Login untuk melihat pesanan</Text>
          <TouchableOpacity
            style={styles.authGateBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/auth/welcome' as any)}
          >
            <LinearGradient
              colors={[Colors.green, Colors.greenDeep]}
              style={styles.authGateBtnGradient}
            >
              <Text style={styles.authGateBtnText}>Masuk</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /* ── Main content ────────────────────────────────────────────────── */

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.green}
          colors={[Colors.green]}
        />
      }
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.screenEyebrow}>Kamarasan</Text>
        <Text style={styles.screenTitle}>Pesanan</Text>
      </View>

      {/* ── Active Orders ─────────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Pesanan Aktif</Text>
          {activeOrders.length > 0 && (
            <View style={styles.sectionCount}>
              <Text style={styles.sectionCountText}>{activeOrders.length}</Text>
            </View>
          )}
        </View>

        {activeOrders.length > 0 ? (
          activeOrders.map((order) => (
            <ActiveOrderCard key={order.orderId} order={order} />
          ))
        ) : (
          <View style={styles.emptyCard}>
            <LinearGradient
              colors={[Colors.green, Colors.greenDeep]}
              style={styles.emptyIconCircle}
            >
              <Ionicons name="restaurant-outline" size={36} color="#fff" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>Belum ada pesanan aktif</Text>
            <Text style={styles.emptyDesc}>
              Saatnya memesan hidangan favoritmu
            </Text>
          </View>
        )}
      </View>

      {/* ── Order History ─────────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Riwayat Pesanan</Text>
        </View>

        {loadingHistory && orderHistory.length === 0 ? (
          <SkeletonLoader variant="list" count={3} height={70} gap={10} />
        ) : historyError && orderHistory.length === 0 ? (
          <View style={styles.errorCard}>
            <Ionicons name="cloud-offline-outline" size={32} color={Colors.textSoft} />
            <Text style={styles.errorCardTitle}>Gagal memuat riwayat</Text>
            <Text style={styles.errorCardDesc}>{historyError}</Text>
            <TouchableOpacity
              style={styles.errorRetryBtn}
              activeOpacity={0.85}
              onPress={() => user?.authkey && fetchHistory(user.authkey)}
            >
              <Ionicons name="refresh" size={14} color={Colors.green} />
              <Text style={styles.errorRetryText}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        ) : orderHistory.length > 0 ? (
          <>
            {orderHistory.map((order) => {
              const itemCount = order.items.reduce((sum, i) => sum + i.qty, 0);
              return (
                <View key={order.orderId} style={styles.historyCard}>
                  <View style={styles.historyDate}>
                    <Text style={styles.historyDateText}>
                      {formatShortDate(order.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.historyCenter}>
                    <Text style={styles.historySummary}>
                      {itemCount} item · {orderModeLabel(order.orderMode)}
                    </Text>
                    <Text style={styles.historyOrderId} numberOfLines={1}>
                      #{order.orderId}
                    </Text>
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={styles.historyTotal}>{fmtPrice(order.total / 1000)}</Text>
                    <HistoryStatusBadge status={order.status} />
                  </View>
                </View>
              );
            })}

            {hasMoreHistory && (
              <TouchableOpacity
                style={styles.loadMoreBtn}
                activeOpacity={0.7}
                onPress={() => loadMoreHistory(user.authkey)}
              >
                <Text style={styles.loadMoreText}>Muat lebih banyak</Text>
                <Ionicons name="chevron-down" size={14} color={Colors.green} />
              </TouchableOpacity>
            )}
          </>
        ) : (
          <Text style={styles.historyEmpty}>Belum ada riwayat pesanan</Text>
        )}
      </View>

      {/* ── Bottom CTA (only when no active orders) ───────────────── */}
      {activeOrders.length === 0 && (
        <View style={styles.ctaWrap}>
          <Animated.View style={{ transform: [{ translateY }] }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push('/menu' as any)}
            >
              <LinearGradient
                colors={[Colors.green, Colors.greenDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaBtn}
              >
                <Ionicons name="restaurant-outline" size={18} color="#fff" />
                <Text style={styles.ctaText}>Pesan Sekarang</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      <View style={{ height: 120 }} />
    </ScrollView>
  );
}

/* ── Styles ────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },

  /* Header — editorial eyebrow + Fraunces display title */
  header: {
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
  screenEyebrow: {
    fontFamily: Font.semibold,
    fontSize: 11,
    color: Colors.textSoft,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  screenTitle: {
    fontFamily: Font.displayBlack,
    fontSize: 32,
    color: Colors.text,
    letterSpacing: -0.5,
  },

  /* Section frame */
  section: {
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.xl + 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontFamily: Font.displayBold,
    fontSize: 20,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  sectionCount: {
    marginLeft: 10,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 7,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCountText: {
    fontFamily: Font.bold,
    fontSize: 11,
    color: '#fff',
  },

  /* ── Active order card — kitchen-ticket aesthetic ── */
  activeCard: {
    position: 'relative',
    backgroundColor: '#FFFBF3',
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0E6D2',
    ...Shadow.card,
  },
  activeCardWaiting: {
    backgroundColor: '#FFFBF3',
  },
  activeCardCancelled: {
    backgroundColor: '#FBFBFB',
    borderColor: '#EDE6DC',
  },
  cardEdge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: Colors.green,
  },
  cardEdgeWaiting: {
    backgroundColor: Colors.gold,
  },
  cardEdgeCancelled: {
    backgroundColor: Colors.hibiscus,
  },
  activeCardInner: {
    paddingVertical: Spacing.lg + 2,
    paddingHorizontal: Spacing.lg + 2,
    paddingLeft: Spacing.lg + 2 + 4, // account for cardEdge
  },

  /* Card header */
  activeCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  orderIdLabel: {
    fontFamily: Font.semibold,
    fontSize: 9,
    color: Colors.textSoft,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  orderIdValue: {
    fontFamily: Font.bold,
    fontSize: 14,
    color: Colors.text,
    letterSpacing: -0.2,
  },
  headerRight: {
    alignItems: 'flex-end',
    marginLeft: Spacing.md,
  },
  modePill: {
    backgroundColor: Colors.greenMint,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  modePillText: {
    fontFamily: Font.semibold,
    fontSize: 11,
    color: Colors.green,
    letterSpacing: 0.2,
  },

  /* Queue number row */
  queueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: Spacing.sm - 2,
    marginBottom: 6,
  },
  queueLabel: {
    fontFamily: Font.semibold,
    fontSize: 10,
    color: Colors.textSoft,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginRight: 10,
  },
  queueNumValue: {
    fontFamily: Font.displayBlack,
    fontSize: 28,
    color: Colors.green,
    letterSpacing: -0.5,
    lineHeight: 30,
  },

  itemsSummary: {
    fontFamily: Font.regular,
    fontSize: 13,
    color: Colors.textSoft,
    marginBottom: Spacing.md + 2,
  },

  /* ── Waiting payment banner ── */
  waitingBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FDF5DE',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md + 2,
    borderWidth: 1,
    borderColor: '#E8D48C',
  },
  waitingIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FCECB3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    position: 'relative',
  },
  waitingIconRing: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.gold,
  },
  waitingTitle: {
    fontFamily: Font.bold,
    fontSize: 14,
    color: '#7A5A0E',
    marginBottom: 2,
  },
  waitingSubtitle: {
    fontFamily: Font.regular,
    fontSize: 12,
    color: '#8C6B1E',
    lineHeight: 17,
  },
  waitingAction: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
    backgroundColor: '#FCECB3',
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  waitingActionText: {
    fontFamily: Font.bold,
    fontSize: 12,
    color: Colors.gold,
  },

  /* ── Stepper ── */
  stepperContainer: {
    paddingLeft: 2,
  },
  stepperDim: {
    opacity: 0.45,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepCircleDone: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleFuture: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: 1,
    marginRight: 1,
    marginTop: 1,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.muted,
  },
  activeStepOuter: {
    width: 22,
    height: 22,
    marginLeft: -2,
    marginTop: -2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeStepHalo: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.green,
  },
  activeStepCore: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.green,
  },
  stepLabelWrap: {
    marginLeft: 12,
    flex: 1,
    paddingTop: 1,
  },
  stepLabelBase: {
    fontFamily: Font.medium,
    fontSize: 13,
  },
  stepLabelDone: {
    color: Colors.green,
  },
  stepLabelCurrent: {
    fontFamily: Font.bold,
    fontSize: 14,
    color: Colors.green,
  },
  stepLabelFuture: {
    color: Colors.muted,
  },
  stepEstimate: {
    fontFamily: Font.regular,
    fontSize: 11,
    color: Colors.textSoft,
    marginTop: 2,
    fontStyle: 'italic',
  },
  /* Connector — solid for completed transitions */
  connectorSolid: {
    width: 2,
    height: 18,
    backgroundColor: Colors.green,
    marginLeft: 8,
    marginVertical: 3,
  },
  /* Connector — dashed (cross-platform-safe — stack of small dots) */
  connectorDashed: {
    marginLeft: 8,
    marginVertical: 3,
    height: 18,
    width: 2,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'column',
  },
  connectorDot: {
    width: 2,
    height: 2,
    backgroundColor: Colors.muted,
    borderRadius: 1,
  },

  /* ── Cancelled block ── */
  cancelledBlock: {
    paddingVertical: Spacing.md,
    alignItems: 'flex-start',
  },
  cancelledPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.hibiscus,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    marginBottom: 10,
  },
  cancelledPillText: {
    fontFamily: Font.bold,
    fontSize: 11,
    color: '#fff',
    letterSpacing: 0.2,
  },
  cancelledReason: {
    fontFamily: Font.regular,
    fontSize: 12,
    color: Colors.textSoft,
    lineHeight: 17,
  },

  /* ── Expandable details block ── */
  detailsBlock: {
    marginTop: Spacing.lg,
  },
  detailsDivider: {
    height: 1,
    backgroundColor: '#EADFC9',
    marginBottom: Spacing.md,
  },
  detailsHeading: {
    fontFamily: Font.semibold,
    fontSize: 10,
    color: Colors.textSoft,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  detailsItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  detailsItemQty: {
    fontFamily: Font.bold,
    fontSize: 12,
    color: Colors.green,
    width: 26,
  },
  detailsItemName: {
    fontFamily: Font.medium,
    fontSize: 13,
    color: Colors.text,
    flex: 1,
    paddingRight: 10,
  },
  detailsItemPrice: {
    fontFamily: Font.semibold,
    fontSize: 13,
    color: Colors.text,
  },
  detailsMetaDivider: {
    height: 1,
    backgroundColor: '#EADFC9',
    marginVertical: Spacing.md,
  },
  detailsMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  detailsMetaLabel: {
    fontFamily: Font.regular,
    fontSize: 12,
    color: Colors.textSoft,
  },
  detailsMetaValue: {
    fontFamily: Font.semibold,
    fontSize: 12,
    color: Colors.text,
  },

  /* ── Footer row ── */
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md + 2,
    paddingTop: Spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: '#F2E8D4',
  },
  lastUpdatedWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lastUpdatedText: {
    fontFamily: Font.regular,
    fontSize: 10,
    color: Colors.textSoft,
    letterSpacing: 0.1,
  },
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reorderText: {
    fontFamily: Font.bold,
    fontSize: 12,
    color: Colors.green,
  },
  chevronWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chevronLabel: {
    fontFamily: Font.semibold,
    fontSize: 10,
    color: Colors.textSoft,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  /* ── Empty state ── */
  emptyCard: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.xxl + 6,
    ...Shadow.card,
  },
  emptyIconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md + 2,
  },
  emptyTitle: {
    fontFamily: Font.displayBold,
    fontSize: 17,
    color: Colors.text,
    marginBottom: 4,
  },
  emptyDesc: {
    fontFamily: Font.regular,
    fontSize: 13,
    color: Colors.textSoft,
    textAlign: 'center',
  },

  /* ── History ── */
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md + 2,
    marginBottom: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: '#F0E6D2',
    ...Shadow.sm,
  },
  historyDate: {
    width: 46,
    alignItems: 'center',
  },
  historyDateText: {
    fontFamily: Font.displayBold,
    fontSize: 13,
    color: Colors.green,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  historyCenter: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  historySummary: {
    fontFamily: Font.semibold,
    fontSize: 13,
    color: Colors.text,
  },
  historyOrderId: {
    fontFamily: Font.regular,
    fontSize: 11,
    color: Colors.textSoft,
    marginTop: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
    marginLeft: Spacing.sm,
  },
  historyTotal: {
    fontFamily: Font.bold,
    fontSize: 13,
    color: Colors.text,
    marginBottom: 5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusBadgeText: {
    fontFamily: Font.bold,
    fontSize: 10,
    letterSpacing: 0.2,
  },
  historyEmpty: {
    fontFamily: Font.regular,
    fontSize: 13,
    color: Colors.textSoft,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: Spacing.md + 2,
    marginTop: 4,
  },
  loadMoreText: {
    fontFamily: Font.bold,
    fontSize: 13,
    color: Colors.green,
    letterSpacing: 0.1,
  },

  /* ── Error state for history fetch ── */
  errorCard: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.xxl,
    borderWidth: 1,
    borderColor: '#F0E6D2',
    ...Shadow.sm,
  },
  errorCardTitle: {
    fontFamily: Font.bold,
    fontSize: 14,
    color: Colors.text,
    marginTop: 10,
    marginBottom: 3,
  },
  errorCardDesc: {
    fontFamily: Font.regular,
    fontSize: 12,
    color: Colors.textSoft,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  errorRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.green,
  },
  errorRetryText: {
    fontFamily: Font.bold,
    fontSize: 12,
    color: Colors.green,
  },

  /* ── Auth gate ── */
  authGate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
    paddingHorizontal: Spacing.xxl,
  },
  authGateIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.greenMint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md + 2,
  },
  authGateText: {
    fontFamily: Font.medium,
    fontSize: 14,
    color: Colors.textSoft,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  authGateBtn: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...Shadow.green,
  },
  authGateBtnGradient: {
    paddingHorizontal: Spacing.xxxl + 4,
    paddingVertical: Spacing.md + 2,
  },
  authGateBtnText: {
    fontFamily: Font.bold,
    fontSize: 15,
    color: '#fff',
    letterSpacing: 0.2,
  },

  /* ── Bottom CTA ── */
  ctaWrap: {
    paddingHorizontal: Spacing.xxl,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: Radius.md,
    ...Shadow.green,
  },
  ctaText: {
    fontFamily: Font.bold,
    fontSize: 15,
    color: '#fff',
    letterSpacing: 0.2,
  },
});
