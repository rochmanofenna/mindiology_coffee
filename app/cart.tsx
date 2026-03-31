// app/cart.tsx — Premium Cart & Checkout Screen
import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Animated,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Font, Spacing, fmtPrice } from '@/constants/theme';
import { CONFIG } from '@/constants/config';
import { PAYMENT_METHODS } from '@/constants/payments';
import { useBranch } from '@/context/BranchContext';
import { useCart, type CartItem } from '@/context/CartContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { saveOrder, calculateTotal, getPromotions } from '@/services/api';
import { useOrder } from '@/context/OrderContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ---------------------------------------------------------------------------
// Order Confirmation (shown after successful checkout)
// ---------------------------------------------------------------------------
function OrderConfirmation({
  total,
  items,
  points,
  orderMode,
  orderID,
  queueNum,
  onTrack,
  onHome,
}: {
  total: number;
  items: CartItem[];
  points: number;
  orderMode: string;
  orderID: string;
  queueNum: string;
  onTrack: () => void;
  onHome: () => void;
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, []);

  const modeLabel =
    orderMode === 'dineIn' ? 'Dine In' : orderMode === 'takeAway' ? 'Take Away' : 'Delivery';

  return (
    <ScrollView
      style={confirmStyles.scroll}
      contentContainerStyle={confirmStyles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* Animated checkmark */}
      <Animated.View style={[confirmStyles.checkCircle, { transform: [{ scale: scaleAnim }] }]}>
        <Ionicons name="checkmark" size={40} color="#fff" />
      </Animated.View>

      <Text style={confirmStyles.title}>Pesanan Diterima!</Text>
      <Text style={confirmStyles.subtitle}>Pesanan akan siap dalam ~15 menit</Text>
      <Text style={confirmStyles.points}>+{points} reward poin</Text>

      {/* Queue number (if available) */}
      {queueNum ? (
        <View style={confirmStyles.queueBadge}>
          <Text style={confirmStyles.queueLabel}>Nomor Antrian</Text>
          <Text style={confirmStyles.queueNum}>{queueNum}</Text>
        </View>
      ) : null}

      {/* Order summary card */}
      <View style={confirmStyles.receipt}>
        <Text style={confirmStyles.orderNum}>Order #{orderID}</Text>

        {items.map((it, i) => (
          <View key={i} style={confirmStyles.receiptRow}>
            <Text style={confirmStyles.receiptItem}>
              {it.qty} x {it.name}
            </Text>
            <Text style={confirmStyles.receiptPrice}>{fmtPrice((it.price + (it.selectedExtras?.reduce((s: number, e: any) => s + e.price, 0) || 0)) * it.qty)}</Text>
          </View>
        ))}

        <View style={confirmStyles.divider} />

        <View style={confirmStyles.receiptRow}>
          <Text style={confirmStyles.totalLabel}>Total</Text>
          <Text style={confirmStyles.totalVal}>{fmtPrice(total)}</Text>
        </View>

        <View style={[confirmStyles.receiptRow, { marginTop: 6 }]}>
          <Text style={confirmStyles.modeLabel}>Mode</Text>
          <Text style={confirmStyles.modeVal}>{modeLabel}</Text>
        </View>
      </View>

      {/* Primary: track order (hidden in staging mode) */}
      {CONFIG.REAL_ORDERS_ENABLED && (
        <TouchableOpacity activeOpacity={0.8} onPress={onTrack} style={{ width: '100%' }}>
          <LinearGradient
            colors={[Colors.green, Colors.greenDeep]}
            style={confirmStyles.primaryBtn}
          >
            <Text style={confirmStyles.primaryBtnText}>Lacak Pesanan</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* Secondary: home */}
      <TouchableOpacity activeOpacity={0.8} onPress={onHome} style={confirmStyles.secondaryBtn}>
        <Text style={confirmStyles.secondaryBtnText}>Kembali ke Beranda</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Main Cart Screen
// ---------------------------------------------------------------------------
type OrderMode = 'dineIn' | 'takeAway' | 'delivery';

const ORDER_MODES: { key: OrderMode; label: string; icon: string }[] = [
  { key: 'dineIn', label: 'Dine In', icon: 'restaurant-outline' },
  { key: 'takeAway', label: 'Take Away', icon: 'bag-handle-outline' },
  // Delivery hidden until delivery endpoints (distance, courier cost, addresses) are wired
  // { key: 'delivery', label: 'Delivery', icon: 'bicycle-outline' },
];

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { cart, updateQty, removeItem, clearCart, subtotal, subtotalRupiah } = useCart();
  const { taxRate, serviceRate, branch: branchData, currentBranchCode } = useBranch();
  const { addActiveOrder } = useOrder();

  const [orderMode, setOrderMode] = useState<OrderMode>('takeAway');
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [lastOrder, setLastOrder] = useState<{
    items: CartItem[];
    total: number;
    points: number;
    orderID: string;
    queueNum: string;
  } | null>(null);

  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);

  // Promo / voucher state
  const [showPromo, setShowPromo] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<{ code: string; discount: number; name: string } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  // Payment methods from static config
  const availablePayments = PAYMENT_METHODS.filter(m => m.available);
  const comingSoonPayments = PAYMENT_METHODS.filter(m => !m.available);

  // Auto-select first available payment method
  useEffect(() => {
    if (availablePayments.length > 0 && !paymentMethod) {
      setPaymentMethod(availablePayments[0].id);
    }
  }, [availablePayments]);

  // Price calculations
  const tax = Math.round(subtotal * taxRate);
  const svc = Math.round(subtotal * serviceRate);
  const discount = appliedVoucher?.discount || 0;
  const total = Math.max(0, subtotal - discount + tax + svc);

  // Handlers ---------------------------------------------------------------
  const handleClearCart = () => {
    Alert.alert('Hapus Semua', 'Yakin ingin mengosongkan keranjang?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus',
        style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          clearCart();
        },
      },
    ]);
  };

  const handleQtyChange = (index: number, newQty: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateQty(index, newQty);
  };

  const handleRemoveItem = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    removeItem(index);
  };

  const handleModeSwitch = (mode: OrderMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOrderMode(mode);
  };

  const handleApplyPromo = async () => {
    if (!promoCode || promoLoading) return;
    setPromoLoading(true);
    try {
      const result = await getPromotions(currentBranchCode, { voucherCode: promoCode, items: cart.map(i => ({ menuID: i.menuID, qty: i.qty })) });
      // Try to extract discount from various ESB response shapes
      const promoDiscount = result.discount || result.data?.discount || result.totalDiscount || 0;
      const name = result.promotionName || result.data?.name || promoCode;
      // ESB returns Rupiah if > 100, K if <= 100
      const discountK = typeof promoDiscount === 'number' && promoDiscount > 100 ? promoDiscount / 1000 : promoDiscount;
      if (discountK > 0 && discountK <= subtotal) {
        setAppliedVoucher({ code: promoCode, discount: discountK, name });
        setShowPromo(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else {
        Alert.alert('Promo Tidak Valid', 'Kode promo tidak berlaku untuk pesanan ini.');
      }
    } catch (err: any) {
      Alert.alert('Gagal', err?.message || 'Kode promo tidak ditemukan.');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      Alert.alert('Login Diperlukan', 'Silakan login terlebih dahulu untuk memesan', [
        { text: 'Login', onPress: () => router.push('/auth/welcome' as any) },
        { text: 'Batal', style: 'cancel' },
      ]);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    setLoading(true);

    try {
      let orderId: string;
      let queueNum = '';

      if (CONFIG.REAL_ORDERS_ENABLED) {
        // REAL MODE: Submit to ESB (schema from Nando @ ESB)
        const visitPurposeMap: Record<string, string> = { dineIn: '65', takeAway: '63', delivery: '64' };
        const visitPurposeID = visitPurposeMap[orderMode] || '63';
        const phoneFormatted = (user?.phone || '').replace(/^\+/, '');
        const now = Date.now();

        const salesMenus = cart.map((item, idx) => ({
          ID: now + idx,
          menuID: item.menuID,
          qty: item.qty,
          extras: item.selectedExtras.map(e => ({ menuExtraID: e.id, qty: 1 })),
          packages: [],
          notes: item.notes || '',
          promotionDetailID: 0,
          promotionVoucherCode: null,
          rewardType: 'voucher',
        }));

        // Step 1: Call calculate-total to get ESB-verified amount
        const calcPayload = {
          visitPurposeID,
          orderType: orderMode,
          latitude: -6.287,
          longitude: 106.716,
          phoneNumber: phoneFormatted.startsWith('62') ? phoneFormatted : `62${phoneFormatted}`,
          salesMenus,
          promotionCode: appliedVoucher?.code || '',
          vouchers: [],
          giftVoucher: null,
          memberVoucher: null,
          memberBenefit: null,
          memberID: user?.memberCode || '',
          userToken: user?.authkey || '',
          deliveryCourierID: 0,
          scheduledAt: null,
        };

        const calcResult = await calculateTotal(currentBranchCode, calcPayload);
        const grandTotal = calcResult.grandTotal ?? calcResult.data?.grandTotal;
        const roundingTotal = calcResult.roundingTotal ?? calcResult.data?.roundingTotal ?? 0;
        if (!grandTotal) throw new Error('Gagal menghitung total pesanan');
        // ESB formula: amount = grandTotal - roundingTotal (roundingTotal is negative)
        const esbAmount = grandTotal - roundingTotal;

        // Step 2: Submit order with ESB-verified amount
        const orderPayload = {
          orderType: orderMode,
          orderTypeName: null,
          fullName: user?.name || 'Guest',
          email: '',
          phoneNumber: phoneFormatted,
          visitPurposeID,
          deliveryAddress: '',
          deliveryAddressInfo: '',
          latitude: -6.287,
          longitude: 106.716,
          memberID: user?.memberCode || '',
          salesMenus,
          promotionCode: appliedVoucher?.code || '',
          vouchers: [],
          paymentMethodID: paymentMethod || 'dana',
          amount: esbAmount,
          returnUrl: 'kamarasan://order/callback',
          refApp: null,
          userToken: user?.authkey || '',
          paymentPhoneNumber: phoneFormatted.startsWith('62') ? phoneFormatted : `62${phoneFormatted}`,
          tableName: null,
          tokenID: '',
          authenticationID: '',
          cvn: '',
          bin: '',
          customerNotes: null,
          additionalCustomerInfo: null,
          salesModeParams: false,
          giftVoucher: null,
          memberVoucher: null,
          memberBenefit: null,
          questionAnswer: [],
          deliveryCourierID: 0,
          scheduledAt: null,
          platformFees: [],
        };

        const result = await saveOrder(currentBranchCode, orderPayload, user?.authkey);
        orderId = result.orderID || result.data?.orderID || result.id || '';
        queueNum = result.queueNum || result.data?.queueNum || '';
      } else {
        // STAGING MODE: Simulate order
        await new Promise(resolve => setTimeout(resolve, CONFIG.SIMULATED_ORDER_DELAY));
        orderId = `KMR-${String(Math.floor(Math.random() * 90000) + 10000)}`;
        queueNum = `Q${Math.floor(Math.random() * 900) + 100}`;
      }

      const earnedPoints = Math.round(subtotal);

      addActiveOrder({
        orderId,
        queueNum,
        status: 'received',
        items: cart.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
        total,
        orderMode,
        createdAt: new Date().toISOString(),
        branchCode: currentBranchCode,
      });

      clearCart();
      setLastOrder({
        items: [...cart],
        total,
        points: earnedPoints,
        orderID: orderId,
        queueNum,
      });
      setLoading(false);
      setConfirmed(true);
    } catch (err: any) {
      setLoading(false);
      const msg = typeof err?.message === 'string' ? err.message : 'Terjadi kesalahan';
      Alert.alert('Gagal Memproses Pesanan', msg, [{ text: 'OK' }]);
    }
  };

  const handleTrackOrder = () => {
    setConfirmed(false);
    setLastOrder(null);
    // Navigate to order/tracking tab
    router.push('/(tabs)/order' as any);
  };

  const handleGoHome = () => {
    setConfirmed(false);
    setLastOrder(null);
    router.push('/');
  };

  // Confirmation screen ----------------------------------------------------
  if (confirmed && lastOrder) {
    return (
      <OrderConfirmation
        total={lastOrder.total}
        items={lastOrder.items}
        points={lastOrder.points}
        orderMode={orderMode}
        orderID={lastOrder.orderID}
        queueNum={lastOrder.queueNum}
        onTrack={handleTrackOrder}
        onHome={handleGoHome}
      />
    );
  }

  // Empty cart state -------------------------------------------------------
  if (cart.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        {/* Back button */}
        <TouchableOpacity style={[styles.emptyBack, { top: insets.top + 8 }]} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>

        <LinearGradient
          colors={[Colors.green, Colors.greenDeep]}
          style={styles.emptyIconCircle}
        >
          <Ionicons name="bag-outline" size={44} color="#fff" />
        </LinearGradient>

        <Text style={styles.emptyTitle}>Keranjang kosong</Text>
        <Text style={styles.emptySubtitle}>Yuk mulai pesan!</Text>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/menu' as any)}
          style={{ width: '100%' }}
        >
          <LinearGradient
            colors={[Colors.green, Colors.greenDeep]}
            style={styles.emptyBtn}
          >
            <Text style={styles.emptyBtnText}>Lihat Menu</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  // Determine if checkout should be disabled
  const checkoutDisabled = cart.length === 0 || loading || (!paymentMethod && availablePayments.length > 0);

  // Main cart view ---------------------------------------------------------
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={styles.root}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ---- Header ---- */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={Colors.text} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Keranjang</Text>

          <TouchableOpacity onPress={handleClearCart} hitSlop={8}>
            <Text style={styles.clearText}>Hapus Semua</Text>
          </TouchableOpacity>
        </View>

        {/* ---- Order Mode Selector ---- */}
        <View style={styles.modeRow}>
          {ORDER_MODES.map((m) => {
            const active = orderMode === m.key;
            return (
              <TouchableOpacity
                key={m.key}
                activeOpacity={0.8}
                onPress={() => handleModeSwitch(m.key)}
                style={[
                  styles.modeBtn,
                  active ? styles.modeBtnActive : styles.modeBtnInactive,
                ]}
              >
                <Ionicons
                  name={m.icon as any}
                  size={16}
                  color={active ? '#fff' : Colors.text}
                  style={{ marginRight: 6 }}
                />
                <Text
                  style={[
                    styles.modeBtnLabel,
                    active ? styles.modeLabelActive : styles.modeLabelInactive,
                  ]}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ---- Staging Banner ---- */}
        {!CONFIG.REAL_ORDERS_ENABLED && __DEV__ && (
          <View style={styles.stagingBanner}>
            <Ionicons name="flask-outline" size={14} color="#92400E" />
            <Text style={styles.stagingText}>Mode Staging — Pesanan disimulasikan</Text>
          </View>
        )}

        {/* ---- Branch Display ---- */}
        <View style={styles.branchRow}>
          <Ionicons name="location" size={14} color={Colors.green} />
          <Text style={styles.branchName} numberOfLines={1}>
            {branchData?.branchName || 'Emerald Bintaro'}
          </Text>
        </View>

        {/* ---- Cart Items ---- */}
        <View style={styles.itemsSection}>
          {cart.map((item, i) => (
            <View key={`${item.id}-${i}`} style={styles.card}>
              {/* Thumbnail */}
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.thumb} />
              ) : (
                <View style={styles.thumbPlaceholder}>
                  <Ionicons name="restaurant-outline" size={22} color={Colors.greenMint} />
                </View>
              )}

              {/* Info column */}
              <View style={styles.cardInfo}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {item.name}
                </Text>
                {item.selectedExtras?.length > 0 && (
                  <Text style={styles.cardNotes} numberOfLines={1}>
                    {item.selectedExtras.map(e => e.name).join(', ')}
                  </Text>
                )}
                {item.notes ? (
                  <Text style={[styles.cardNotes, { fontStyle: 'italic' }]} numberOfLines={1}>
                    {item.notes}
                  </Text>
                ) : null}
              </View>

              {/* Right column: qty controls + price + trash */}
              <View style={styles.cardRight}>
                <View style={styles.qtyRow}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => handleQtyChange(i, item.qty - 1)}
                  >
                    <Ionicons name="remove" size={14} color={Colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.qty}</Text>
                  <TouchableOpacity
                    style={styles.qtyBtnAdd}
                    onPress={() => handleQtyChange(i, item.qty + 1)}
                  >
                    <Ionicons name="add" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.lineTotal}>{fmtPrice((item.price + (item.selectedExtras?.reduce((s: number, e: any) => s + e.price, 0) || 0)) * item.qty)}</Text>

                <TouchableOpacity
                  style={styles.trashBtn}
                  onPress={() => handleRemoveItem(i)}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={15} color={Colors.badgeRed} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* ---- Price Breakdown ---- */}
        <View style={styles.breakdownCard}>
          {/* Subtotal */}
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Subtotal</Text>
            <Text style={styles.breakdownValue}>{fmtPrice(subtotal)}</Text>
          </View>

          {/* PB1 Tax */}
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>
              {branchData?.taxName || 'PB1'} ({Math.round(taxRate * 100)}%)
            </Text>
            <Text style={styles.breakdownValue}>{fmtPrice(tax)}</Text>
          </View>

          {/* Service charge (only if > 0) */}
          {svc > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                {branchData?.additionalTaxName || 'Service'} ({Math.round(serviceRate * 100)}%)
              </Text>
              <Text style={styles.breakdownValue}>{fmtPrice(svc)}</Text>
            </View>
          )}

          {/* Discount row (if voucher applied) */}
          {appliedVoucher && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Diskon ({appliedVoucher.name})</Text>
              <Text style={[styles.breakdownValue, { color: Colors.hibiscus }]}>-{fmtPrice(appliedVoucher.discount)}</Text>
            </View>
          )}

          {/* Divider */}
          <View style={styles.breakdownDivider} />

          {/* Total */}
          <View style={styles.breakdownRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{fmtPrice(total)}</Text>
          </View>
        </View>

        {/* ---- Payment Method Selection ---- */}
        <View style={styles.paymentSection}>
          <Text style={styles.paymentTitle}>Metode Pembayaran</Text>
          {availablePayments.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[styles.paymentCard, paymentMethod === method.id && styles.paymentCardActive]}
              onPress={() => { setPaymentMethod(method.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            >
              <View style={styles.paymentIcon}>
                <Ionicons name={method.icon as any} size={20} color={paymentMethod === method.id ? Colors.green : Colors.textSoft} />
              </View>
              <Text style={styles.paymentName}>{method.name}</Text>
              {paymentMethod === method.id && <Ionicons name="checkmark-circle" size={20} color={Colors.green} />}
            </TouchableOpacity>
          ))}
          {comingSoonPayments.map((method) => (
            <View key={method.id} style={[styles.paymentCard, styles.paymentCardDisabled]}>
              <View style={styles.paymentIcon}>
                <Ionicons name={method.icon as any} size={20} color={Colors.brownLight} />
              </View>
              <Text style={[styles.paymentName, { color: Colors.brownLight }]}>{method.name}</Text>
              <Text style={styles.comingSoonText}>{method.comingSoonText}</Text>
            </View>
          ))}
        </View>

        {/* ---- Promo / Voucher Code ---- */}
        <View style={styles.promoSection}>
          <TouchableOpacity style={styles.promoToggle} onPress={() => setShowPromo(!showPromo)}>
            <Ionicons name="pricetag-outline" size={18} color={Colors.green} />
            <Text style={styles.promoToggleText}>
              {appliedVoucher ? `Promo: ${appliedVoucher.name}` : 'Punya kode promo?'}
            </Text>
            {appliedVoucher ? (
              <TouchableOpacity onPress={() => setAppliedVoucher(null)}>
                <Ionicons name="close-circle" size={18} color={Colors.hibiscus} />
              </TouchableOpacity>
            ) : (
              <Ionicons name={showPromo ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textSoft} />
            )}
          </TouchableOpacity>

          {showPromo && !appliedVoucher && (
            <View style={styles.promoInputRow}>
              <TextInput
                style={styles.promoInput}
                value={promoCode}
                onChangeText={setPromoCode}
                placeholder="Masukkan kode promo"
                placeholderTextColor={Colors.textSoft + '88'}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={[styles.promoApplyBtn, !promoCode && { opacity: 0.5 }]}
                onPress={handleApplyPromo}
                disabled={!promoCode || promoLoading}
              >
                <Text style={styles.promoApplyText}>{promoLoading ? '...' : 'Terapkan'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {appliedVoucher && (
            <View style={styles.discountRow}>
              <Text style={styles.discountLabel}>Diskon</Text>
              <Text style={styles.discountVal}>-{fmtPrice(appliedVoucher.discount)}</Text>
            </View>
          )}
        </View>

        {/* Bottom spacer for sticky button */}
        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ---- Sticky Place Order Button ---- */}
      <View style={[styles.stickyBottom, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleCheckout}
          disabled={checkoutDisabled}
        >
          <LinearGradient
            colors={
              checkoutDisabled ? ['#9CA3AF', '#9CA3AF'] : [Colors.green, Colors.greenDeep]
            }
            style={[
              styles.checkoutBtn,
              checkoutDisabled && { opacity: 0.5 },
            ]}
          >
            <Text style={styles.checkoutBtnText}>
              {loading ? 'Memproses...' : `Pesan Sekarang \u2014 ${fmtPrice(total)}`}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
    </KeyboardAvoidingView>
  );
}

// ---------------------------------------------------------------------------
// Styles — Main Cart
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl,
    paddingBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  headerTitle: {
    fontFamily: Font.displayBold,
    fontSize: 24,
    color: Colors.text,
  },
  clearText: {
    fontFamily: Font.semibold,
    fontSize: 14,
    color: '#EF4444',
  },

  // Order Mode Selector
  modeRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.xxl,
    marginBottom: 16,
    gap: 8,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 12,
  },
  modeBtnActive: {
    backgroundColor: Colors.greenForest,
  },
  modeBtnInactive: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modeBtnLabel: {
    fontSize: 13,
    fontFamily: Font.semibold,
  },
  modeLabelActive: {
    color: '#fff',
  },
  modeLabelInactive: {
    color: Colors.text,
  },

  // Branch
  branchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.xxl,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 18,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  branchName: {
    flex: 1,
    fontFamily: Font.medium,
    fontSize: 13,
    color: Colors.textSoft,
  },

  // Items
  itemsSection: {
    paddingHorizontal: Spacing.xxl,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#E8F0E4',
  },
  thumbPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#E8F0E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontFamily: Font.semibold,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 2,
  },
  cardNotes: {
    fontFamily: Font.regular,
    fontSize: 12,
    color: Colors.textSoft,
    fontStyle: 'italic',
  },
  cardRight: {
    alignItems: 'center',
    gap: 6,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.greenMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnAdd: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontFamily: Font.bold,
    fontSize: 15,
    color: Colors.text,
    minWidth: 20,
    textAlign: 'center',
  },
  lineTotal: {
    fontFamily: Font.bold,
    fontSize: 14,
    color: '#1B4332',
  },
  trashBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Price Breakdown
  breakdownCard: {
    marginHorizontal: Spacing.xxl,
    marginTop: 16,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  breakdownLabel: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Colors.textSoft,
  },
  breakdownValue: {
    fontFamily: Font.medium,
    fontSize: 14,
    color: Colors.textSoft,
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  totalLabel: {
    fontFamily: Font.extrabold,
    fontSize: 20,
    color: Colors.text,
  },
  totalValue: {
    fontFamily: Font.extrabold,
    fontSize: 20,
    color: Colors.text,
  },

  // Payment Method
  paymentSection: { paddingHorizontal: Spacing.xxl, marginTop: 16, marginBottom: 16 },
  paymentTitle: { fontFamily: Font.bold, fontSize: 16, color: Colors.text, marginBottom: 12 },
  paymentCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.white, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1.5, borderColor: '#F0EBE4', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  paymentCardActive: { borderColor: Colors.green, backgroundColor: Colors.greenMint + '30' },
  paymentIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F5F1EC', alignItems: 'center', justifyContent: 'center' },
  paymentName: { fontFamily: Font.semibold, fontSize: 14, color: Colors.text, flex: 1 },
  paymentCardDisabled: { opacity: 0.5, borderColor: '#F0EBE4' },
  comingSoonText: { fontFamily: Font.medium, fontSize: 11, color: Colors.brownLight },

  // Staging Banner
  stagingBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FEF3C7', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, marginHorizontal: 24, marginBottom: 12 },
  stagingText: { fontFamily: Font.medium, fontSize: 12, color: '#92400E' },

  // Promo / Voucher
  promoSection: { paddingHorizontal: Spacing.xxl, marginBottom: 16 },
  promoToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  promoToggleText: { fontFamily: Font.semibold, fontSize: 14, color: Colors.green, flex: 1 },
  promoInputRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  promoInput: { flex: 1, fontFamily: Font.regular, backgroundColor: Colors.white, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: Colors.text, borderWidth: 1, borderColor: '#F0EBE4', textTransform: 'uppercase' },
  promoApplyBtn: { backgroundColor: Colors.green, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  promoApplyText: { fontFamily: Font.bold, fontSize: 13, color: '#fff' },
  discountRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  discountLabel: { fontFamily: Font.medium, fontSize: 13, color: Colors.hibiscus },
  discountVal: { fontFamily: Font.bold, fontSize: 13, color: Colors.hibiscus },

  // Sticky checkout
  stickyBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xxl,
    paddingTop: 12,
    backgroundColor: Colors.cream,
  },
  checkoutBtn: {
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  checkoutBtnText: {
    fontFamily: Font.bold,
    color: '#fff',
    fontSize: 16,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyBack: {
    position: 'absolute',
    top: 0,
    left: 24,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontFamily: Font.displayBold,
    fontSize: 22,
    color: Colors.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Colors.textSoft,
    textAlign: 'center',
    marginBottom: 28,
  },
  emptyBtn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBtnText: {
    fontFamily: Font.bold,
    color: '#fff',
    fontSize: 15,
  },
});

// ---------------------------------------------------------------------------
// Styles — Order Confirmation
// ---------------------------------------------------------------------------
const confirmStyles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 36,
    minHeight: Dimensions.get('window').height,
  },
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontFamily: Font.displayBold,
    fontSize: 28,
    color: Colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Colors.textSoft,
    marginBottom: 6,
  },
  points: {
    fontFamily: Font.bold,
    fontSize: 14,
    color: Colors.gold,
    marginBottom: 28,
  },
  queueBadge: {
    backgroundColor: Colors.green,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
  queueLabel: {
    fontFamily: Font.medium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 4,
  },
  queueNum: {
    fontFamily: Font.displayBold,
    fontSize: 32,
    color: '#fff',
  },
  receipt: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 28,
  },
  orderNum: {
    fontFamily: Font.semibold,
    fontSize: 12,
    color: Colors.textSoft,
    marginBottom: 12,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  receiptItem: {
    fontFamily: Font.regular,
    fontSize: 13,
    color: Colors.text,
    flex: 1,
  },
  receiptPrice: {
    fontFamily: Font.semibold,
    fontSize: 13,
    color: Colors.text,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 10,
  },
  totalLabel: {
    fontFamily: Font.bold,
    fontSize: 15,
    color: Colors.text,
  },
  totalVal: {
    fontFamily: Font.bold,
    fontSize: 15,
    color: Colors.text,
  },
  modeLabel: {
    fontFamily: Font.regular,
    fontSize: 13,
    color: Colors.textSoft,
  },
  modeVal: {
    fontFamily: Font.medium,
    fontSize: 13,
    color: Colors.textSoft,
  },
  primaryBtn: {
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
    marginBottom: 12,
  },
  primaryBtnText: {
    fontFamily: Font.bold,
    color: '#fff',
    fontSize: 16,
  },
  secondaryBtn: {
    width: '100%',
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontFamily: Font.bold,
    color: Colors.green,
    fontSize: 15,
  },
});
