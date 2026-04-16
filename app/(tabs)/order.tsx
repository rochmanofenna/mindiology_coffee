// app/(tabs)/order.tsx — Order Tracking + History Screen
//
// Aesthetic: "Night at the Pass." The rest of the app is a bright café;
// this tab is a moody cocktail bar where your order plays out in real time.
// Dark warm near-black canvas (#1A1A18), editorial Fraunces display numerals
// that bleed above card edges, custom hand-drawn line-art SVG glyphs instead
// of generic Ionicons, and a halo-pulse animation on the active step that
// glows against the dark.
//
// The dark background is set directly on the outermost container — NEVER
// conditionally rendered — so there is zero cream/white flash when
// navigating into this tab. That's the most important line in this file.
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
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Font, Spacing, Radius, Shadow, fmtPrice } from '@/constants/theme';
import { useBranch } from '@/context/BranchContext';
import { useOrder, type Order, type OrderStatus } from '@/context/OrderContext';
import { useAuth } from '@/context/AuthContext';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  titleCase,
  relativeTime,
  formatOrderTime,
  formatShortDate,
  paymentMethodLabel,
  orderModeLabel,
} from '@/utils/formatting';
import {
  StepCheckmark,
  StepClock,
  StepFlame,
  StepBell,
  StepStar,
  CancelX,
  PaymentWaitAnimated,
  EmptyOrderGlyph,
  CtaForkKnife,
  ChevronDown,
  ChevronUp,
  SyncDot,
  ArrowRight,
} from '@/components/icons/OrderIcons';

// ── Dark theme tokens (scoped to this screen only — NOT a global theme) ──
const Dark = {
  bg: '#1A1A18',         // warm near-black root canvas
  card: '#2A2A26',       // elevated card surface
  cardBorder: '#3A3A34', // hairline warm border
  textPrimary: '#F5F0EB',// cream as text on dark — palette inversion
  textSecondary: '#A09890', // warm grey
  textMuted: '#5A5A54',  // deep muted
  hairline: '#3A3A34',
  spotlight: 'rgba(27,94,59,0.35)', // green halo glow behind active step
} as const;

// Enable LayoutAnimation on Android for smooth expand/collapse.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/* ── Status model ─────────────────────────────────────────────────────── */

type StepIcon =
  | typeof StepCheckmark
  | typeof StepClock
  | typeof StepFlame
  | typeof StepBell
  | typeof StepStar;

const STEPS: { label: string; doneIcon: StepIcon; currentIcon: StepIcon; futureIcon: StepIcon }[] = [
  { label: 'Diterima',    doneIcon: StepCheckmark, currentIcon: StepClock, futureIcon: StepClock },
  { label: 'Diproses',    doneIcon: StepCheckmark, currentIcon: StepFlame, futureIcon: StepFlame },
  { label: 'Siap Diambil', doneIcon: StepCheckmark, currentIcon: StepBell,  futureIcon: StepBell  },
  { label: 'Selesai',     doneIcon: StepStar,      currentIcon: StepStar,  futureIcon: StepStar  },
];

const STATUS_TO_STEP: Record<OrderStatus, number> = {
  waiting_payment: -1, // pre-stepper — banner shown instead, stepper dimmed
  received: 0,
  processing: 1,
  ready: 2,
  completed: 3,
  cancelled: -2, // muted overlay, no stepper progress
};

const ESTIMATE_MINUTES: Record<number, number> = {
  0: 15,
  1: 10,
  2: 3,
};

/* ── Pulse halo for the current step ──────────────────────────────────── */

function PulseHalo() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.75, duration: 1100, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1.0, duration: 1100, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0, duration: 1100, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.55, duration: 1100, useNativeDriver: true }),
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

/* ── Cross-platform dashed connector (a stack of 5 tiny dots) ─────────── */

function DashedLine() {
  return (
    <View style={styles.connectorDashed}>
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.connectorDot} />
      ))}
    </View>
  );
}

/* ── Queue number bleed — the hero typographic moment ──────────────────── */

function QueueNumber({
  value,
  fallback,
  state,
}: {
  value: string;
  fallback: string;
  state: 'active' | 'waiting' | 'cancelled';
}) {
  const hasQueue = !!value && value.trim().length > 0;
  const display = hasQueue ? value : fallback.slice(-6).toUpperCase();
  const isLarge = hasQueue;

  // Gentle pulse for waiting_payment state.
  const waitOpacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (state !== 'waiting') return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(waitOpacity, { toValue: 0.5, duration: 1200, useNativeDriver: true }),
        Animated.timing(waitOpacity, { toValue: 1.0, duration: 1200, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [state]);

  const color =
    state === 'cancelled' ? Dark.textMuted
    : state === 'waiting' ? Colors.gold
    : Colors.gold; // active state: gold on dark is the hero treatment

  return (
    <View style={styles.queueNumberContainer}>
      {/* Halo circle behind the number */}
      {state !== 'cancelled' && <View style={styles.queueHalo} />}

      <Animated.Text
        numberOfLines={1}
        style={[
          isLarge ? styles.queueNumberHero : styles.queueFallbackHero,
          { color },
          state === 'cancelled' && styles.queueCancelled,
          state === 'waiting' && { opacity: waitOpacity },
        ]}
      >
        {display}
      </Animated.Text>
    </View>
  );
}

/* ── Status stepper ──────────────────────────────────────────────────── */

function StatusStepper({ status, dim = false }: { status: OrderStatus; dim?: boolean }) {
  const currentStep = STATUS_TO_STEP[status] ?? 0;

  return (
    <View style={[styles.stepperContainer, dim && styles.stepperDim]}>
      {STEPS.map((step, idx) => {
        const isDone = idx < currentStep;
        const isCurrent = idx === currentStep && !dim;
        const isFuture = idx > currentStep || dim;
        const isLast = idx === STEPS.length - 1;
        const DoneIcon = step.doneIcon;
        const CurrentIcon = step.currentIcon;

        return (
          <View key={step.label}>
            <View style={styles.stepRow}>
              {/* Circle indicator */}
              {isCurrent ? (
                <PulseHalo />
              ) : isDone ? (
                <View style={styles.stepCircleDone}>
                  <DoneIcon size={12} color="#FFFFFF" strokeWidth={2.4} />
                </View>
              ) : (
                <View style={styles.stepCircleFuture}>
                  {/* Show a ghosted glyph inside pending circles — subtle premium touch */}
                  {idx === 0 && <StepClock size={9} color={Dark.textMuted} strokeWidth={1.3} />}
                  {idx === 1 && <StepFlame size={9} color={Dark.textMuted} strokeWidth={1.3} />}
                  {idx === 2 && <StepBell size={9} color={Dark.textMuted} strokeWidth={1.3} />}
                  {idx === 3 && <StepStar size={9} color={Dark.textMuted} strokeWidth={1.3} />}
                </View>
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

              {/* Current-step glyph on the right, echoing the stepper icon */}
              {isCurrent && (
                <View style={styles.stepRightGlyph}>
                  <CurrentIcon size={16} color={Colors.gold} strokeWidth={1.8} />
                </View>
              )}
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

/* ── Waiting-for-payment banner ───────────────────────────────────────── */

function WaitingPaymentBanner({
  paymentMethodID,
  onOpenPayment,
}: {
  paymentMethodID?: string;
  onOpenPayment?: () => void;
}) {
  const label = paymentMethodLabel(paymentMethodID);
  const hasPaymentApp = paymentMethodID && /dana|ovo|gopay|shopee/i.test(paymentMethodID);

  return (
    <View style={styles.waitingBanner}>
      <View style={styles.waitingIconWrap}>
        <PaymentWaitAnimated size={20} color={Colors.gold} strokeWidth={1.8} />
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
            <ArrowRight size={13} color={Colors.gold} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/* ── Stuck-payment banner — settlement confirmed but POS never received ── */

function StuckPaymentBanner({ orderId, branchCode }: { orderId: string; branchCode: string }) {
  const { branch } = useBranch();
  const branchPhone = (branch?.branchCode === branchCode ? branch?.phone : '')?.replace(/[^\d]/g, '') || '';
  const branchLabel = branch?.branchCode === branchCode ? (branch?.branchName || 'Outlet') : 'Outlet';

  const onContact = useCallback(() => {
    const message = encodeURIComponent(
      `Halo, saya sudah membayar untuk pesanan #${orderId} tetapi pesanannya belum terlihat di outlet. Mohon bantuannya.`,
    );
    const url = branchPhone
      ? `https://wa.me/${branchPhone}?text=${message}`
      : `mailto:hello@kamarasan.app?subject=${encodeURIComponent(`Konfirmasi pesanan ${orderId}`)}&body=${message}`;
    Linking.openURL(url).catch(() => {});
  }, [branchPhone, orderId]);

  return (
    <View style={styles.stuckBanner}>
      <View style={styles.stuckIconWrap}>
        <AlertDot />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.stuckTitle}>Pembayaran Diterima</Text>
        <Text style={styles.stuckSubtitle}>
          Pesanan belum dikonfirmasi outlet. Hubungi {branchLabel} dengan nomor pesanan di atas.
        </Text>
        <TouchableOpacity activeOpacity={0.8} style={styles.stuckAction} onPress={onContact}>
          <Text style={styles.stuckActionText}>
            {branchPhone ? `Hubungi ${branchLabel}` : 'Email Dukungan'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function AlertDot() {
  return (
    <View style={styles.alertDot}>
      <Text style={styles.alertDotMark}>!</Text>
    </View>
  );
}

/* ── Active order card (expandable) ───────────────────────────────────── */

function ActiveOrderCard({ order }: { order: Order }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  const isWaitingPayment = order.status === 'waiting_payment';
  const isCancelled = order.status === 'cancelled';
  const isPaymentStuck = !!order.paymentStuck;
  const queueState: 'active' | 'waiting' | 'cancelled' =
    isCancelled ? 'cancelled' : isWaitingPayment ? 'waiting' : 'active';

  const toggleExpanded = useCallback(() => {
    LayoutAnimation.configureNext({
      duration: 280,
      create: { type: 'easeInEaseOut', property: 'opacity' },
      update: { type: 'easeInEaseOut' },
      delete: { type: 'easeInEaseOut', property: 'opacity' },
    });
    setExpanded((prev) => !prev);
    Haptics.selectionAsync().catch(() => {});
  }, []);

  const handleOpenPayment = useCallback(() => {
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

  const edgeColor = isCancelled ? Colors.hibiscus : isWaitingPayment ? Colors.gold : Colors.green;

  return (
    <View style={styles.activeCardOuter}>
      {/* Queue number — bleeds above the card's top edge */}
      <QueueNumber
        value={order.queueNum || ''}
        fallback={order.orderId}
        state={queueState}
      />

      <TouchableOpacity
        activeOpacity={0.95}
        onPress={toggleExpanded}
        style={[
          styles.activeCard,
          isCancelled && styles.activeCardCancelled,
        ]}
      >
        {/* Left edge accent bar — bleeds 4px above and below the card */}
        <View style={[styles.cardEdge, { backgroundColor: edgeColor }]} />

        <View style={[styles.activeCardInner, isCancelled && { opacity: 0.55 }]}>
          {/* Top-right metadata block — flows beside the bleeding queue number */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.orderIdEyebrow}>ORDER ID</Text>
              <Text style={styles.orderIdValue} numberOfLines={1}>
                #{order.orderId}
              </Text>
            </View>
            {!isCancelled && (
              <View style={styles.modePill}>
                <Text style={styles.modePillText}>{orderModeLabel(order.orderMode)}</Text>
              </View>
            )}
            {isCancelled && (
              <View style={styles.cancelledPill}>
                <CancelX size={11} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.cancelledPillText}>Dibatalkan</Text>
              </View>
            )}
          </View>

          <Text style={styles.itemsSummary}>
            {itemCount} item · {fmtPrice(order.total / 1000)}
          </Text>

          {/* Waiting payment banner — stuck variant wins when payment settled but POS didn't receive */}
          {isWaitingPayment && isPaymentStuck ? (
            <StuckPaymentBanner orderId={order.orderId} branchCode={order.branchCode} />
          ) : isWaitingPayment ? (
            <WaitingPaymentBanner
              paymentMethodID={order.paymentMethodID}
              onOpenPayment={handleOpenPayment}
            />
          ) : null}

          {/* Status stepper — dimmed if waiting_payment, hidden if cancelled */}
          {!isCancelled && <StatusStepper status={order.status} dim={isWaitingPayment} />}

          {/* Cancelled state: explanatory body */}
          {isCancelled && (
            <Text style={styles.cancelledReason}>
              Pesanan dibatalkan karena pembayaran tidak diselesaikan.
            </Text>
          )}

          {/* Expandable details */}
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

          {/* Footer row: reorder (if cancelled) + expand chevron */}
          <View style={styles.footerRow}>
            {isCancelled && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleReorder}
                style={styles.reorderBtn}
              >
                <Text style={styles.reorderText}>Pesan Lagi</Text>
                <ArrowRight size={13} color={Colors.gold} strokeWidth={2} />
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }} />
            <View style={styles.chevronWrap}>
              <Text style={styles.chevronLabel}>
                {expanded ? 'Sembunyikan' : 'Rincian'}
              </Text>
              {expanded ? (
                <ChevronUp size={14} color={Dark.textSecondary} strokeWidth={1.8} />
              ) : (
                <ChevronDown size={14} color={Dark.textSecondary} strokeWidth={1.8} />
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>

      {/* Floating "last updated" tag — overlaps the card's bottom edge */}
      {!isCancelled && (
        <View style={styles.lastUpdatedTag}>
          <SyncDot size={9} color={Dark.textSecondary} strokeWidth={1.4} />
          <Text style={styles.lastUpdatedText}>
            Diperbarui {relativeTime(order.lastPolledAt)}
          </Text>
        </View>
      )}
    </View>
  );
}

/* ── History status badge (dark variant) ─────────────────────────────── */

function HistoryStatusBadge({ status }: { status: OrderStatus }) {
  const styleByStatus: Record<OrderStatus, { bg: string; color: string; label: string }> = {
    waiting_payment: { bg: '#3A2F1A', color: Colors.gold, label: 'Belum Bayar' },
    received: { bg: '#1F3A2C', color: '#7FCFA0', label: 'Diterima' },
    processing: { bg: '#1F3A2C', color: '#7FCFA0', label: 'Diproses' },
    ready: { bg: '#1F3A2C', color: '#7FCFA0', label: 'Siap' },
    completed: { bg: '#1F3A2C', color: '#7FCFA0', label: 'Selesai' },
    cancelled: { bg: '#3A1F23', color: '#E58894', label: 'Dibatalkan' },
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

  // Tick every second so the "last updated X ago" text stays fresh.
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (activeOrders.length === 0) return;
    const interval = setInterval(() => forceTick((x) => x + 1), 1000);
    return () => clearInterval(interval);
  }, [activeOrders.length]);

  // Empty-state CTA bounce.
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

  /* ── Auth gate (dark) ─────────────────────────────────────────────── */
  if (!user) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.screenEyebrow}>Kamarasan</Text>
          <Text style={styles.screenTitle}>Pesanan</Text>
        </View>
        <View style={styles.authGate}>
          <EmptyOrderGlyph size={56} color={Dark.textPrimary} strokeWidth={1.6} />
          <Text style={styles.authGateText}>Login untuk melihat pesanan</Text>
          <TouchableOpacity
            style={styles.authGateBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/auth/welcome' as any)}
          >
            <LinearGradient
              colors={['#E5C56D', Colors.gold]}
              style={styles.authGateBtnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
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
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Dark.textSecondary}
            colors={[Dark.textSecondary]}
            progressBackgroundColor={Dark.card}
          />
        }
      >
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Text style={styles.screenEyebrow}>Kamarasan</Text>
          <Text style={styles.screenTitle}>Pesanan</Text>
        </View>

        {/* ── Active Orders ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={[styles.sectionHeader, styles.activeSectionHeader]}>
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
              <EmptyOrderGlyph size={56} color={Dark.textPrimary} strokeWidth={1.6} />
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
            <View style={styles.historySkeletonWrap}>
              <SkeletonLoader variant="list" count={3} height={70} gap={10} />
            </View>
          ) : historyError && orderHistory.length === 0 ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorCardTitle}>Gagal memuat riwayat</Text>
              <Text style={styles.errorCardDesc}>{historyError}</Text>
              <TouchableOpacity
                style={styles.errorRetryBtn}
                activeOpacity={0.85}
                onPress={() => user?.authkey && fetchHistory(user.authkey)}
              >
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
                  <ChevronDown size={14} color={Colors.gold} strokeWidth={2} />
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
                  colors={['#E5C56D', Colors.gold]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.ctaBtn}
                >
                  <CtaForkKnife size={18} color={Colors.greenDeep} strokeWidth={2} />
                  <Text style={styles.ctaText}>Pesan Sekarang</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}

        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Edge gradient — fades the dark canvas into the light tab bar cleanly */}
      <LinearGradient
        pointerEvents="none"
        colors={[`${Dark.bg}00`, `${Dark.bg}FF`]}
        style={styles.bottomGradient}
      />
    </View>
  );
}

/* ── Styles ────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  // Root — dark bg is set HERE so there is zero flash on navigation.
  container: {
    flex: 1,
    backgroundColor: Dark.bg,
  },
  scroll: {
    flex: 1,
    backgroundColor: Dark.bg,
  },
  scrollContent: {
    paddingBottom: 120,
  },

  /* Header */
  header: {
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.lg + 4,
  },
  screenEyebrow: {
    fontFamily: Font.semibold,
    fontSize: 10,
    color: Colors.gold,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  screenTitle: {
    fontFamily: Font.displayBlack,
    fontSize: 34,
    color: Dark.textPrimary,
    letterSpacing: -0.6,
  },

  /* Section frame */
  section: {
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.xl + 12,
    paddingTop: Spacing.xl,
    overflow: 'visible',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md + 2,
  },
  // Override for the Active Orders section: adds clearance for the queue number
  // bleed (top: -28) and the halo circle above each card.
  activeSectionHeader: {
    marginBottom: 44,
  },
  sectionTitle: {
    fontFamily: Font.displayBold,
    fontSize: 20,
    color: Dark.textPrimary,
    letterSpacing: -0.2,
  },
  sectionCount: {
    marginLeft: 10,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 7,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCountText: {
    fontFamily: Font.bold,
    fontSize: 11,
    color: Colors.greenDeep,
  },

  /* ── Active order card — bleeds enabled ───────────────────────────── */
  activeCardOuter: {
    // 44px = 28px queue bleed + 16px breathing room. Keeps the next card's
    // queue number and halo out of the preceding card's footer.
    marginBottom: 44,
    overflow: 'visible',
  },
  activeCard: {
    position: 'relative',
    backgroundColor: Dark.card,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Dark.cardBorder,
    overflow: 'visible',
    ...Shadow.lg,
    shadowColor: '#000',
    shadowOpacity: 0.3,
  },
  activeCardCancelled: {
    backgroundColor: '#24221F',
  },

  /* Left edge accent bar — bleeds 4px above and below card */
  cardEdge: {
    position: 'absolute',
    left: 0,
    top: -4,
    bottom: -4,
    width: 4,
    borderRadius: 2,
  },

  activeCardInner: {
    paddingTop: Spacing.lg + 48, // room below the bleeding queue number
    paddingBottom: Spacing.lg + 4,
    paddingHorizontal: Spacing.lg + 4,
    paddingLeft: Spacing.lg + 4 + 6,
  },

  /* ── Queue number — bleeds above card edge ───────────────────────── */
  queueNumberContainer: {
    position: 'absolute',
    top: -28,
    left: Spacing.lg + 8,
    zIndex: 10,
    justifyContent: 'center',
  },
  queueHalo: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: Colors.greenMint,
    opacity: 0.08,
    top: -32,
    left: -25,
  },
  queueNumberHero: {
    fontFamily: Font.displayBold,
    fontSize: 72,
    lineHeight: 76,
    letterSpacing: -2,
    includeFontPadding: false as any, // Android: kill extra vertical padding
  },
  queueFallbackHero: {
    fontFamily: Font.displayBold,
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -1,
    opacity: 0.9,
    includeFontPadding: false as any,
  },
  queueCancelled: {
    opacity: 0.35,
    textDecorationLine: 'line-through',
  },

  /* Header row inside card */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  orderIdEyebrow: {
    fontFamily: Font.semibold,
    fontSize: 9,
    color: Dark.textSecondary,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  orderIdValue: {
    fontFamily: Font.bold,
    fontSize: 13,
    color: Dark.textPrimary,
    letterSpacing: -0.1,
  },
  modePill: {
    backgroundColor: 'rgba(201,168,76,0.14)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.35)',
    marginLeft: Spacing.md,
  },
  modePillText: {
    fontFamily: Font.semibold,
    fontSize: 11,
    color: Colors.gold,
    letterSpacing: 0.2,
  },
  cancelledPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.hibiscus,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginLeft: Spacing.md,
  },
  cancelledPillText: {
    fontFamily: Font.bold,
    fontSize: 10,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  itemsSummary: {
    fontFamily: Font.regular,
    fontSize: 13,
    color: Dark.textSecondary,
    marginBottom: Spacing.md + 4,
  },

  /* ── Waiting payment banner ───────────────────────────────────────── */
  waitingBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(201,168,76,0.08)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md + 2,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.3)',
  },
  waitingIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(201,168,76,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.35)',
  },
  waitingTitle: {
    fontFamily: Font.bold,
    fontSize: 14,
    color: Colors.gold,
    marginBottom: 3,
    letterSpacing: -0.1,
  },
  waitingSubtitle: {
    fontFamily: Font.regular,
    fontSize: 12,
    color: Dark.textPrimary,
    lineHeight: 17,
    opacity: 0.85,
  },
  waitingAction: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(201,168,76,0.15)',
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  waitingActionText: {
    fontFamily: Font.bold,
    fontSize: 12,
    color: Colors.gold,
  },

  /* ── Stuck-payment banner (settlement + !flagPushToPOS) ─────────────── */
  stuckBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(196,58,75,0.1)',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md + 2,
    borderWidth: 1,
    borderColor: 'rgba(196,58,75,0.4)',
  },
  stuckIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(196,58,75,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(196,58,75,0.45)',
  },
  alertDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.hibiscus,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertDotMark: {
    fontFamily: Font.bold,
    fontSize: 13,
    color: '#fff',
    lineHeight: 14,
  },
  stuckTitle: {
    fontFamily: Font.bold,
    fontSize: 14,
    color: Colors.hibiscus,
    marginBottom: 3,
    letterSpacing: -0.1,
  },
  stuckSubtitle: {
    fontFamily: Font.regular,
    fontSize: 12,
    color: Dark.textPrimary,
    lineHeight: 17,
    opacity: 0.9,
  },
  stuckAction: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    backgroundColor: Colors.hibiscus,
  },
  stuckActionText: {
    fontFamily: Font.bold,
    fontSize: 12,
    color: '#fff',
  },

  /* ── Stepper ──────────────────────────────────────────────────────── */
  stepperContainer: {
    paddingLeft: 2,
    paddingTop: 4,
  },
  stepperDim: {
    opacity: 0.42,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircleDone: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleFuture: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginLeft: 1,
    marginRight: 1,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Dark.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeStepOuter: {
    width: 26,
    height: 26,
    marginLeft: -3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeStepHalo: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.green,
  },
  activeStepCore: {
    width: 14,
    height: 14,
    borderRadius: 7,
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
    color: '#7FCFA0', // lightened green so it reads on dark
  },
  stepLabelCurrent: {
    fontFamily: Font.bold,
    fontSize: 14,
    color: Dark.textPrimary,
    letterSpacing: -0.1,
  },
  stepLabelFuture: {
    color: Dark.textMuted,
  },
  stepEstimate: {
    fontFamily: Font.regular,
    fontSize: 11,
    color: Colors.gold,
    marginTop: 2,
    fontStyle: 'italic',
    opacity: 0.85,
  },
  stepRightGlyph: {
    marginLeft: Spacing.sm,
  },
  connectorSolid: {
    width: 2,
    height: 18,
    backgroundColor: Colors.green,
    marginLeft: 9,
    marginVertical: 4,
  },
  connectorDashed: {
    marginLeft: 9,
    marginVertical: 4,
    height: 18,
    width: 2,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'column',
  },
  connectorDot: {
    width: 2,
    height: 2,
    backgroundColor: Dark.textMuted,
    borderRadius: 1,
  },

  /* ── Cancelled block ──────────────────────────────────────────────── */
  cancelledReason: {
    fontFamily: Font.regular,
    fontSize: 12,
    color: Dark.textSecondary,
    lineHeight: 17,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },

  /* ── Expandable details ───────────────────────────────────────────── */
  detailsBlock: {
    marginTop: Spacing.lg,
  },
  detailsDivider: {
    height: 1,
    backgroundColor: Dark.hairline,
    marginBottom: Spacing.md,
  },
  detailsHeading: {
    fontFamily: Font.semibold,
    fontSize: 10,
    color: Dark.textSecondary,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  detailsItemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 7,
  },
  detailsItemQty: {
    fontFamily: Font.bold,
    fontSize: 12,
    color: Colors.gold,
    width: 26,
  },
  detailsItemName: {
    fontFamily: Font.medium,
    fontSize: 13,
    color: Dark.textPrimary,
    flex: 1,
    paddingRight: 10,
  },
  detailsItemPrice: {
    fontFamily: Font.semibold,
    fontSize: 13,
    color: Dark.textPrimary,
  },
  detailsMetaDivider: {
    height: 1,
    backgroundColor: Dark.hairline,
    marginVertical: Spacing.md + 2,
  },
  detailsMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailsMetaLabel: {
    fontFamily: Font.regular,
    fontSize: 12,
    color: Dark.textSecondary,
  },
  detailsMetaValue: {
    fontFamily: Font.semibold,
    fontSize: 12,
    color: Dark.textPrimary,
  },

  /* ── Footer row ───────────────────────────────────────────────────── */
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md + 4,
    paddingTop: Spacing.sm + 4,
    borderTopWidth: 1,
    borderTopColor: Dark.hairline,
  },
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  reorderText: {
    fontFamily: Font.bold,
    fontSize: 12,
    color: Colors.gold,
    letterSpacing: 0.1,
  },
  chevronWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  chevronLabel: {
    fontFamily: Font.semibold,
    fontSize: 10,
    color: Dark.textSecondary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },

  /* ── Floating last-updated tag (overlaps card bottom) ─────────────── */
  lastUpdatedTag: {
    position: 'absolute',
    bottom: -12,
    right: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Dark.card,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Dark.cardBorder,
    zIndex: 5,
  },
  lastUpdatedText: {
    fontFamily: Font.regular,
    fontSize: 10,
    color: Dark.textSecondary,
    letterSpacing: 0.2,
  },

  /* ── Empty state ──────────────────────────────────────────────────── */
  emptyCard: {
    alignItems: 'center',
    backgroundColor: Dark.card,
    borderRadius: Radius.xl,
    padding: Spacing.xxl + 10,
    borderWidth: 1,
    borderColor: Dark.cardBorder,
    ...Shadow.lg,
    shadowColor: '#000',
    shadowOpacity: 0.3,
  },
  emptyTitle: {
    fontFamily: Font.displayBold,
    fontSize: 18,
    color: Dark.textPrimary,
    marginTop: Spacing.md + 4,
    marginBottom: 6,
    letterSpacing: -0.2,
  },
  emptyDesc: {
    fontFamily: Font.regular,
    fontSize: 13,
    color: Dark.textSecondary,
    textAlign: 'center',
  },

  /* ── History ──────────────────────────────────────────────────────── */
  historySkeletonWrap: {
    // Keep skeleton visible against dark background
    opacity: 0.25,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Dark.card,
    borderRadius: Radius.md,
    padding: Spacing.md + 2,
    marginBottom: Spacing.sm + 2,
    borderWidth: 1,
    borderColor: Dark.cardBorder,
    ...Shadow.sm,
    shadowColor: '#000',
    shadowOpacity: 0.25,
  },
  historyDate: {
    width: 46,
    alignItems: 'center',
  },
  historyDateText: {
    fontFamily: Font.displayBold,
    fontSize: 13,
    color: Colors.gold,
    textAlign: 'center',
    letterSpacing: -0.1,
  },
  historyCenter: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  historySummary: {
    fontFamily: Font.semibold,
    fontSize: 13,
    color: Dark.textPrimary,
  },
  historyOrderId: {
    fontFamily: Font.regular,
    fontSize: 11,
    color: Dark.textSecondary,
    marginTop: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
    marginLeft: Spacing.sm,
  },
  historyTotal: {
    fontFamily: Font.bold,
    fontSize: 13,
    color: Dark.textPrimary,
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusBadgeText: {
    fontFamily: Font.bold,
    fontSize: 10,
    letterSpacing: 0.3,
  },
  historyEmpty: {
    fontFamily: Font.regular,
    fontSize: 13,
    color: Dark.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md + 2,
    marginTop: 4,
  },
  loadMoreText: {
    fontFamily: Font.bold,
    fontSize: 13,
    color: Colors.gold,
    letterSpacing: 0.1,
  },

  /* ── Error state for history fetch ────────────────────────────────── */
  errorCard: {
    alignItems: 'center',
    backgroundColor: Dark.card,
    borderRadius: Radius.lg,
    padding: Spacing.xxl,
    borderWidth: 1,
    borderColor: Dark.cardBorder,
  },
  errorCardTitle: {
    fontFamily: Font.bold,
    fontSize: 14,
    color: Dark.textPrimary,
    marginTop: 10,
    marginBottom: 4,
  },
  errorCardDesc: {
    fontFamily: Font.regular,
    fontSize: 12,
    color: Dark.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  errorRetryBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.gold,
  },
  errorRetryText: {
    fontFamily: Font.bold,
    fontSize: 12,
    color: Colors.gold,
  },

  /* ── Auth gate ────────────────────────────────────────────────────── */
  authGate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
    paddingHorizontal: Spacing.xxl,
  },
  authGateText: {
    fontFamily: Font.medium,
    fontSize: 14,
    color: Dark.textSecondary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl + 4,
    textAlign: 'center',
  },
  authGateBtn: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  authGateBtnGradient: {
    paddingHorizontal: Spacing.xxxl + 8,
    paddingVertical: Spacing.md + 2,
  },
  authGateBtnText: {
    fontFamily: Font.bold,
    fontSize: 15,
    color: Colors.greenDeep,
    letterSpacing: 0.2,
  },

  /* ── Bottom CTA ───────────────────────────────────────────────────── */
  ctaWrap: {
    paddingHorizontal: Spacing.xxl,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: Radius.md,
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  ctaText: {
    fontFamily: Font.bold,
    fontSize: 15,
    color: Colors.greenDeep,
    letterSpacing: 0.3,
  },

  /* ── Bottom gradient fade into the light tab bar ──────────────────── */
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 48,
  },
});
