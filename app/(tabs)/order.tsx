// app/(tabs)/order.tsx — Order Tracking + History Screen
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Font, Spacing, fmtPrice } from '@/constants/theme';
import { useOrder } from '@/context/OrderContext';
import { useAuth } from '@/context/AuthContext';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* ── Status stepper helpers ───────────────────────────────── */

const STEPS = [
  { label: 'Diterima', icon: 'receipt-outline' as const },
  { label: 'Diproses', icon: 'flame-outline' as const },
  { label: 'Siap Diambil', icon: 'checkmark-circle-outline' as const },
  { label: 'Selesai', icon: 'star-outline' as const },
];

const STATUS_TO_STEP: Record<string, number> = {
  received: 0,
  processing: 1,
  ready: 2,
  completed: 3,
};

const ESTIMATE_MINUTES: Record<number, number> = {
  0: 15,
  1: 10,
  2: 3,
};

function orderModeLabel(mode: string): string {
  switch (mode.toLowerCase()) {
    case 'takeaway':
    case 'take_away':
    case 'take away':
      return 'Take Away';
    case 'dinein':
    case 'dine_in':
    case 'dine in':
      return 'Dine In';
    case 'delivery':
      return 'Delivery';
    default:
      return mode;
  }
}

function formatShortDate(isoString: string): string {
  const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
  ];
  const d = new Date(isoString);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/* ── Pulse dot for current step ───────────────────────────── */

function PulseDot() {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.2, duration: 600, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.0, duration: 600, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.stepCircle,
        styles.stepCircleActive,
        { transform: [{ scale }] },
      ]}
    />
  );
}

/* ── Status stepper component ─────────────────────────────── */

function StatusStepper({ status }: { status: string }) {
  const currentStep = STATUS_TO_STEP[status] ?? 0;

  return (
    <View style={styles.stepperContainer}>
      {STEPS.map((step, idx) => {
        const isDone = idx < currentStep;
        const isCurrent = idx === currentStep;
        const isFuture = idx > currentStep;
        const isLast = idx === STEPS.length - 1;

        return (
          <View key={step.label}>
            <View style={styles.stepRow}>
              {/* Circle */}
              {isCurrent ? (
                <PulseDot />
              ) : (
                <View
                  style={[
                    styles.stepCircle,
                    isDone && styles.stepCircleDone,
                    isFuture && styles.stepCircleFuture,
                  ]}
                />
              )}

              {/* Label + icon */}
              <Ionicons
                name={step.icon}
                size={16}
                color={isFuture ? Colors.muted : Colors.green}
                style={{ marginLeft: 10 }}
              />
              <View style={{ marginLeft: 6, flex: 1 }}>
                <Text
                  style={[
                    styles.stepLabel,
                    isDone && styles.stepLabelDone,
                    isCurrent && styles.stepLabelCurrent,
                    isFuture && styles.stepLabelFuture,
                  ]}
                >
                  {step.label}
                </Text>
                {isCurrent && ESTIMATE_MINUTES[idx] !== undefined && (
                  <Text style={styles.stepEstimate}>
                    Estimasi: ~{ESTIMATE_MINUTES[idx]} menit
                  </Text>
                )}
              </View>
            </View>

            {/* Connector line */}
            {!isLast && (
              <View
                style={[
                  styles.stepLine,
                  isDone && styles.stepLineDone,
                  isFuture && styles.stepLineFuture,
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
}

/* ── Status badge for history items ───────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const isCompleted = status === 'completed';
  const isCancelled = status === 'cancelled';

  const bgColor = isCompleted
    ? Colors.greenMint
    : isCancelled
      ? Colors.hibiscusLight
      : '#E5E7EB';
  const textColor = isCompleted
    ? Colors.green
    : isCancelled
      ? Colors.hibiscus
      : Colors.muted;
  const label = isCompleted
    ? 'Selesai'
    : isCancelled
      ? 'Dibatalkan'
      : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
      <Text style={[styles.statusBadgeText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

/* ── Main Screen ──────────────────────────────────────────── */

export default function OrderScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const {
    activeOrders,
    orderHistory,
    loadingHistory,
    fetchHistory,
    loadMoreHistory,
    hasMoreHistory,
  } = useOrder();

  const bounceAnim = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);

  /* Bounce CTA animation */
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

  /* Fetch history on mount */
  useEffect(() => {
    if (user?.authkey) {
      fetchHistory(user.authkey);
    }
  }, [user?.authkey]);

  /* Pull to refresh */
  const onRefresh = useCallback(async () => {
    if (!user?.authkey) return;
    setRefreshing(true);
    try {
      await fetchHistory(user.authkey);
    } finally {
      setRefreshing(false);
    }
  }, [user?.authkey, fetchHistory]);

  /* ── Auth gate ──────────────────────────────────────────── */
  if (!user) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.title}>Pesanan</Text>
        </View>
        <View style={styles.authGate}>
          <Ionicons name="lock-closed-outline" size={48} color={Colors.muted} />
          <Text style={styles.authGateText}>Login untuk melihat pesanan</Text>
          <TouchableOpacity
            style={styles.authGateBtn}
            activeOpacity={0.8}
            onPress={() => router.push('/auth/welcome' as any)}
          >
            <Text style={styles.authGateBtnText}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /* ── Main content ───────────────────────────────────────── */

  const totalItems = (items: Array<{ name: string; qty: number; price: number }>) =>
    items.reduce((sum, i) => sum + i.qty, 0);

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
        <Text style={styles.title}>Pesanan</Text>
      </View>

      {/* ── Active Orders ──────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pesanan Aktif</Text>

        {activeOrders.length > 0 ? (
          activeOrders.map((order) => {
            const itemCount = totalItems(order.items);
            return (
              <View key={order.orderId} style={styles.activeCard}>
                {/* Top row */}
                <View style={styles.activeCardTop}>
                  <Text style={styles.orderId}>#{order.orderId}</Text>
                  <View style={styles.queueBadge}>
                    <Text style={styles.queueBadgeText}>{order.queueNum}</Text>
                  </View>
                </View>

                {/* Items summary */}
                <Text style={styles.itemsSummary}>
                  {itemCount} item · {fmtPrice(order.total)}
                </Text>

                {/* Order mode pill */}
                <View style={styles.modePill}>
                  <Text style={styles.modePillText}>
                    {orderModeLabel(order.orderMode)}
                  </Text>
                </View>

                {/* Status stepper */}
                <StatusStepper status={order.status} />
              </View>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <LinearGradient
              colors={[Colors.green, Colors.greenDeep]}
              style={styles.iconCircle}
            >
              <Ionicons name="restaurant-outline" size={48} color="#fff" />
            </LinearGradient>
            <Text style={styles.emptyTitle}>Belum ada pesanan aktif</Text>
            <Text style={styles.emptyDesc}>
              Saatnya memesan hidangan favoritmu!
            </Text>
          </View>
        )}
      </View>

      {/* ── Order History ──────────────────────────────────── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Riwayat Pesanan</Text>

        {loadingHistory && orderHistory.length === 0 ? (
          <SkeletonLoader variant="list" count={3} height={64} gap={10} />
        ) : orderHistory.length > 0 ? (
          <>
            {orderHistory.map((order) => {
              const itemCount = totalItems(order.items);
              return (
                <View key={order.orderId} style={styles.historyCard}>
                  {/* Left: date */}
                  <View style={styles.historyDate}>
                    <Text style={styles.historyDateText}>
                      {formatShortDate(order.createdAt)}
                    </Text>
                  </View>

                  {/* Center: summary */}
                  <View style={styles.historyCenter}>
                    <Text style={styles.historySummary}>
                      {itemCount} item
                    </Text>
                    <Text style={styles.historyMode}>
                      {orderModeLabel(order.orderMode)}
                    </Text>
                  </View>

                  {/* Right: total + status */}
                  <View style={styles.historyRight}>
                    <Text style={styles.historyTotal}>
                      {fmtPrice(order.total)}
                    </Text>
                    <StatusBadge status={order.status} />
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
              </TouchableOpacity>
            )}
          </>
        ) : (
          <Text style={styles.historyEmpty}>Belum ada riwayat pesanan</Text>
        )}
      </View>

      {/* ── Bottom CTA (only when no active orders) ────────── */}
      {activeOrders.length === 0 && (
        <View style={styles.ctaWrap}>
          <Animated.View style={{ transform: [{ translateY }] }}>
            <TouchableOpacity
              activeOpacity={0.8}
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

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

/* ── Styles ────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  header: {
    paddingHorizontal: Spacing.xxl,
  },
  title: {
    fontFamily: Font.displayBold,
    fontSize: 22,
    color: Colors.text,
    marginBottom: 20,
  },

  /* Auth gate */
  authGate: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 80,
  },
  authGateText: {
    fontFamily: Font.medium,
    fontSize: 15,
    color: Colors.textSoft,
    marginTop: 12,
    marginBottom: 20,
  },
  authGateBtn: {
    backgroundColor: Colors.green,
    paddingHorizontal: 36,
    paddingVertical: 12,
    borderRadius: 12,
  },
  authGateBtnText: {
    fontFamily: Font.bold,
    fontSize: 15,
    color: '#fff',
  },

  /* Sections */
  section: {
    paddingHorizontal: Spacing.xxl,
    marginBottom: 28,
  },
  sectionTitle: {
    fontFamily: Font.displayBold,
    fontSize: 20,
    color: Colors.text,
    marginBottom: 12,
  },

  /* Active order card */
  activeCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  activeCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  orderId: {
    fontFamily: Font.bold,
    fontSize: 15,
    color: Colors.text,
  },
  queueBadge: {
    backgroundColor: Colors.green,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  queueBadgeText: {
    fontFamily: Font.bold,
    fontSize: 14,
    color: '#fff',
  },
  itemsSummary: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Colors.textSoft,
    marginBottom: 8,
  },
  modePill: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.greenMint,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 16,
  },
  modePillText: {
    fontFamily: Font.medium,
    fontSize: 12,
    color: Colors.green,
  },

  /* Status stepper */
  stepperContainer: {
    paddingLeft: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: Colors.green,
  },
  stepCircleDone: {
    backgroundColor: Colors.green,
  },
  stepCircleFuture: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.muted,
    borderStyle: 'dashed',
  },
  stepLabel: {
    fontFamily: Font.medium,
    fontSize: 13,
    color: Colors.text,
  },
  stepLabelDone: {
    color: Colors.green,
  },
  stepLabelCurrent: {
    fontFamily: Font.bold,
    color: Colors.green,
  },
  stepLabelFuture: {
    color: Colors.muted,
  },
  stepEstimate: {
    fontFamily: Font.regular,
    fontSize: 11,
    color: Colors.textSoft,
    marginTop: 1,
  },
  stepLine: {
    width: 2,
    height: 20,
    backgroundColor: Colors.green,
    marginLeft: 8,
    marginVertical: 2,
  },
  stepLineDone: {
    backgroundColor: Colors.green,
  },
  stepLineFuture: {
    backgroundColor: Colors.muted,
    borderStyle: 'dashed',
  },

  /* Empty state */
  emptyCard: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: Font.bold,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 4,
  },
  emptyDesc: {
    fontFamily: Font.regular,
    fontSize: 13,
    color: Colors.textSoft,
    textAlign: 'center',
  },

  /* History */
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  historyDate: {
    width: 50,
    alignItems: 'center',
  },
  historyDateText: {
    fontFamily: Font.bold,
    fontSize: 13,
    color: Colors.textSoft,
    textAlign: 'center',
  },
  historyCenter: {
    flex: 1,
    marginLeft: 12,
  },
  historySummary: {
    fontFamily: Font.medium,
    fontSize: 14,
    color: Colors.text,
  },
  historyMode: {
    fontFamily: Font.regular,
    fontSize: 12,
    color: Colors.textSoft,
    marginTop: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  historyTotal: {
    fontFamily: Font.bold,
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontFamily: Font.medium,
    fontSize: 11,
  },
  historyEmpty: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Colors.textSoft,
    textAlign: 'center',
    paddingVertical: 24,
  },
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  loadMoreText: {
    fontFamily: Font.bold,
    fontSize: 14,
    color: Colors.green,
  },

  /* CTA */
  ctaWrap: {
    paddingHorizontal: Spacing.xxl,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 14,
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  ctaText: {
    fontFamily: Font.bold,
    fontSize: 15,
    color: '#fff',
  },
});
