// app/payment-status.tsx — Unified payment status screen
// Handles QRIS (QR display + countdown), DANA/OVO (verification polling), and Bayar di Kasir.
import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import QRCode from 'react-native-qrcode-svg';
import { validatePayment, type PaymentValidateResponse } from '@/services/api';
import { Colors, Font, Radius } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBranch } from '@/context/BranchContext';

const POLL_INTERVAL = 4_000;

type Mode = 'loading' | 'qris' | 'redirect' | 'cashier' | 'success' | 'expired';

export default function PaymentStatusScreen() {
  const params = useLocalSearchParams<{
    orderID: string;
    branchCode: string;
    queueNum?: string;
    total?: string;
    paymentMethod?: string;
    qrString?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { branch } = useBranch();

  const [mode, setMode] = useState<Mode>('loading');
  const [payData, setPayData] = useState<PaymentValidateResponse | null>(null);
  const [countdown, setCountdown] = useState(0);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  const { orderID, branchCode } = params;
  const paymentMethod = params.paymentMethod || '';
  const queueNum = params.queueNum || '';
  const total = params.total || '';
  const initialQrString = params.qrString || '';

  const fmtRp = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;
  const displayAmount = payData?.paymentTotal
    ? fmtRp(payData.paymentTotal)
    : total
      ? `Rp ${(Number(total) * 1000).toLocaleString('id-ID')}`
      : '';

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // ── Main polling lifecycle ────────────────────────────────────────────
  useEffect(() => {
    // Guard against missing route params — otherwise validatePayment would fire
    // with undefined args and the screen would stall on the loading state.
    if (!orderID || !branchCode) {
      setMode('expired');
      return;
    }

    if (paymentMethod === 'cashier') {
      setMode('cashier');
      return;
    }

    // Fast path: cart already extracted qrString from the order response, so we
    // can render the QR immediately while the first poll runs in the background.
    if (initialQrString) {
      setPayData(prev => prev ?? ({ qrString: initialQrString } as PaymentValidateResponse));
      setMode('qris');
    }

    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let active = true;

    const doPoll = async () => {
      try {
        const data = await validatePayment(orderID, branchCode);
        if (!active) return;
        setPayData(data);
        if (data.timeRemaining != null) setCountdown(data.timeRemaining);

        if (data.status === 'settlement') {
          if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
          setMode('success');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        } else if (data.status === 'expired' || data.status === 'closed') {
          if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
          setMode('expired');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        }
      } catch {
        // Network errors — keep polling
      }
    };

    // Initial fetch determines mode
    (async () => {
      try {
        const data = await validatePayment(orderID, branchCode);
        if (!active) return;
        setPayData(data);

        if (data.status === 'settlement') {
          setMode('success');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          return;
        }
        if (data.status === 'expired' || data.status === 'closed') {
          setMode('expired');
          return;
        }

        setMode(data.qrString ? 'qris' : 'redirect');
        if (data.timeRemaining != null) setCountdown(data.timeRemaining);
        pollTimer = setInterval(doPoll, POLL_INTERVAL);
      } catch {
        if (!active) return;
        // First fetch failed — assume redirect mode (DANA/OVO), start polling
        setMode('redirect');
        pollTimer = setInterval(doPoll, POLL_INTERVAL);
      }
    })();

    return () => {
      active = false;
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [orderID, branchCode, paymentMethod]);

  // ── QRIS countdown (visual, decrements locally every second) ──────────
  useEffect(() => {
    if (mode !== 'qris' || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setMode('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [mode]);

  // ── Success: animate + navigate to order tracking ─────────────────────
  useEffect(() => {
    if (mode !== 'success') return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 60,
      useNativeDriver: true,
    }).start();
    const timer = setTimeout(() => router.replace('/(tabs)/order' as any), 2000);
    return () => clearTimeout(timer);
  }, [mode]);

  // ── Render ────────────────────────────────────────────────────────────
  const padStyle = { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 };

  if (mode === 'loading') {
    return (
      <View style={[s.container, padStyle]}>
        <ActivityIndicator size="large" color={Colors.green} />
        <Text style={s.subtitle}>Memuat status pembayaran...</Text>
      </View>
    );
  }

  if (mode === 'success') {
    return (
      <View style={[s.container, padStyle]}>
        <Animated.View style={[s.checkCircle, { transform: [{ scale: scaleAnim }] }]}>
          <Ionicons name="checkmark" size={48} color="#fff" />
        </Animated.View>
        <Text style={s.title}>Pembayaran Berhasil!</Text>
        <Text style={s.subtitle}>Mengalihkan ke halaman pesanan...</Text>
      </View>
    );
  }

  if (mode === 'expired') {
    return (
      <View style={[s.container, padStyle]}>
        <View style={s.expiredCircle}>
          <Ionicons name="close" size={48} color="#fff" />
        </View>
        <Text style={s.title}>Pembayaran Gagal</Text>
        <Text style={s.subtitle}>Waktu pembayaran telah habis atau dibatalkan.</Text>
        <TouchableOpacity style={s.outlineBtn} onPress={() => router.replace('/(tabs)/order' as any)}>
          <Text style={s.outlineBtnText}>Lihat Pesanan</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (mode === 'cashier') {
    return (
      <View style={[s.container, padStyle]}>
        <Text style={s.header}>Bayar di Kasir</Text>
        <View style={s.queueBox}>
          <Text style={s.queueLabel}>Nomor Antrian</Text>
          <Text style={s.queueNum}>{queueNum || '-'}</Text>
        </View>
        {displayAmount ? <Text style={s.amount}>{displayAmount}</Text> : null}
        {branch?.branchName ? (
          <Text style={s.branchName}>{branch.branchName}</Text>
        ) : null}
        <Text style={s.hint}>Tunjukkan nomor antrian ini ke kasir</Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.replace('/(tabs)/order' as any)}
          style={{ width: '100%', marginTop: 32 }}
        >
          <LinearGradient colors={[Colors.green, Colors.greenDeep]} style={s.primaryBtn}>
            <Text style={s.primaryBtnText}>Lacak Pesanan</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  }

  if (mode === 'qris') {
    return (
      <View style={[s.container, padStyle]}>
        <Text style={s.header}>Scan untuk Bayar</Text>
        <View style={s.qrCard}>
          {payData?.qrString ? (
            <QRCode value={payData.qrString} size={250} backgroundColor="#fff" color={Colors.text} />
          ) : (
            <ActivityIndicator size="large" color={Colors.green} />
          )}
        </View>
        {displayAmount ? <Text style={s.amount}>{displayAmount}</Text> : null}
        {countdown > 0 && (
          <Text style={[s.countdown, countdown < 60 && s.countdownUrgent]}>
            {formatTime(countdown)}
          </Text>
        )}
        <View style={s.waitingRow}>
          <ActivityIndicator size="small" color={Colors.gold} />
          <Text style={s.waitingText}>Menunggu pembayaran...</Text>
        </View>
      </View>
    );
  }

  // mode === 'redirect' (DANA/OVO verification)
  return (
    <View style={[s.container, padStyle]}>
      <ActivityIndicator size="large" color={Colors.green} style={{ marginBottom: 24 }} />
      <Text style={s.header}>Memverifikasi Pembayaran</Text>
      <Text style={s.subtitle}>Mohon tunggu, sedang mengecek status pembayaran...</Text>
      {displayAmount ? <Text style={[s.amount, { marginTop: 24 }]}>{displayAmount}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  header: {
    fontFamily: Font.displayBold,
    fontSize: 26,
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  title: {
    fontFamily: Font.displayBold,
    fontSize: 24,
    color: Colors.text,
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: Font.medium,
    fontSize: 14,
    color: Colors.textSoft,
    marginTop: 8,
    textAlign: 'center',
  },
  amount: {
    fontFamily: Font.bold,
    fontSize: 28,
    color: Colors.text,
    marginTop: 16,
  },
  // ── QRIS ──
  qrCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 290,
    minWidth: 290,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  countdown: {
    fontFamily: Font.semibold,
    fontSize: 20,
    color: Colors.gold,
    marginTop: 12,
  },
  countdownUrgent: {
    color: Colors.hibiscus,
  },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  waitingText: {
    fontFamily: Font.medium,
    fontSize: 14,
    color: Colors.textSoft,
  },
  // ── Cashier ──
  queueBox: {
    alignItems: 'center',
    marginVertical: 24,
  },
  queueLabel: {
    fontFamily: Font.medium,
    fontSize: 14,
    color: Colors.textSoft,
    marginBottom: 8,
  },
  queueNum: {
    fontFamily: Font.displayBlack,
    fontSize: 72,
    color: Colors.gold,
    lineHeight: 80,
  },
  branchName: {
    fontFamily: Font.semibold,
    fontSize: 14,
    color: Colors.textSoft,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  hint: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Colors.textSoft,
    marginTop: 16,
    textAlign: 'center',
  },
  // ── Success / Expired circles ──
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expiredCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.hibiscus,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── Buttons ──
  primaryBtn: {
    paddingVertical: 16,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: Font.bold,
    fontSize: 16,
    color: '#fff',
  },
  outlineBtn: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.green,
    marginTop: 24,
  },
  outlineBtnText: {
    fontFamily: Font.semibold,
    fontSize: 15,
    color: Colors.green,
  },
});
