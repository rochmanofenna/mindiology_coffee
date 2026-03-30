// app/auth/phone.tsx — WhatsApp OTP Waiting Screen
// After generating OTP, this screen reads OTP from in-memory store and polls for verification
import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Animated, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Font, Spacing } from '@/constants/theme';
import { verifyOTP } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useBranch } from '@/context/BranchContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPendingOtp, clearPendingOtp } from './welcome';

export default function WhatsAppWaitingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();
  const { currentBranchCode } = useBranch();

  const [otpData, setOtpData] = useState<{ otp: string; url: string } | null>(null);
  const [status, setStatus] = useState<'opening' | 'waiting' | 'verifying' | 'verified' | 'error'>('opening');
  const [errorMsg, setErrorMsg] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Read OTP from in-memory store on mount
  useEffect(() => {
    const pending = getPendingOtp();
    if (pending) {
      setOtpData(pending);
      clearPendingOtp();
    } else {
      router.back(); // no OTP data, go back
    }
  }, []);

  // Pulse animation for the WhatsApp icon
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  // Open WhatsApp on mount
  useEffect(() => {
    if (!otpData) return;
    Linking.openURL(otpData.url).catch(() => {
      setStatus('error');
      setErrorMsg('Tidak bisa membuka WhatsApp. Pastikan WhatsApp terinstall.');
    });
    // After a short delay, start polling
    const openTimer = setTimeout(() => setStatus('waiting'), 2000);
    return () => clearTimeout(openTimer);
  }, [otpData]);

  // Poll for OTP verification status
  useEffect(() => {
    if (status !== 'waiting' || !otpData) return;

    const poll = async () => {
      try {
        const result = await verifyOTP(otpData.otp);
        // ESB wraps response in { data: { status, verifiedPhoneNumber, authkey } }
        const otpStatus = result.data?.status || result.status;
        const phone = result.data?.verifiedPhoneNumber || result.verifiedPhoneNumber || '';
        const authkey = result.data?.authkey || result.authkey || '';

        if (otpStatus === 'VERIFIED') {
          setStatus('verifying');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          await login(phone, authkey, currentBranchCode);
          setStatus('verified');
          setTimeout(() => router.replace('/'), 500);
        }
        if (otpStatus === 'EXPIRED') {
          setStatus('error');
          setErrorMsg('Kode OTP sudah kadaluarsa. Silakan coba lagi.');
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        // Network error during poll — keep trying
      }
    };

    // Poll every 3 seconds
    poll(); // check immediately
    pollRef.current = setInterval(poll, 3000);

    // Stop polling after 5 minutes
    const timeout = setTimeout(() => {
      if (pollRef.current) clearInterval(pollRef.current);
      setStatus('error');
      setErrorMsg('Waktu verifikasi habis. Silakan coba lagi.');
    }, 5 * 60 * 1000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      clearTimeout(timeout);
    };
  }, [status, otpData]);

  const handleRetry = () => {
    router.back();
  };

  const handleOpenWhatsApp = () => {
    if (!otpData) return;
    Linking.openURL(otpData.url).catch(() => {
      Alert.alert('Error', 'Tidak bisa membuka WhatsApp');
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verifikasi WhatsApp</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.body}>
        {status === 'verified' ? (
          <>
            <View style={styles.successCircle}>
              <Ionicons name="checkmark" size={40} color="#fff" />
            </View>
            <Text style={styles.heading}>Login Berhasil!</Text>
            <Text style={styles.subtitle}>Mengarahkan ke beranda...</Text>
          </>
        ) : status === 'error' ? (
          <>
            <View style={styles.errorCircle}>
              <Ionicons name="alert-circle" size={40} color="#fff" />
            </View>
            <Text style={styles.heading}>Verifikasi Gagal</Text>
            <Text style={styles.subtitle}>{errorMsg}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
              <Text style={styles.retryText}>Coba Lagi</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Animated.View style={[styles.waCircle, { transform: [{ scale: pulseAnim }] }]}>
              <Ionicons name="logo-whatsapp" size={48} color="#fff" />
            </Animated.View>
            <Text style={styles.heading}>
              {status === 'opening' ? 'Membuka WhatsApp...' : 'Menunggu Verifikasi'}
            </Text>
            <Text style={styles.subtitle}>
              {status === 'opening'
                ? 'Silakan kirim pesan yang muncul di WhatsApp'
                : 'Kirim pesan di WhatsApp, lalu kembali ke aplikasi ini.\nKami akan otomatis memverifikasi.'
              }
            </Text>

            {status === 'waiting' && (
              <>
                <ActivityIndicator size="small" color={Colors.green} style={{ marginTop: 24 }} />
                <Text style={styles.pollingText}>Memeriksa status...</Text>

                <TouchableOpacity style={styles.openWaBtn} onPress={handleOpenWhatsApp}>
                  <Ionicons name="logo-whatsapp" size={18} color={Colors.green} />
                  <Text style={styles.openWaText}>Buka WhatsApp Lagi</Text>
                </TouchableOpacity>
              </>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xxl, marginBottom: 4 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  headerTitle: { fontFamily: Font.displayBold, fontSize: 20, color: Colors.text },

  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxl, paddingBottom: 80 },

  waCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center', marginBottom: 28, shadowColor: '#25D366', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 },
  successCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.green, alignItems: 'center', justifyContent: 'center', marginBottom: 28, shadowColor: Colors.green, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 6 },
  errorCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.hibiscus, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },

  heading: { fontFamily: Font.displayBold, fontSize: 24, color: Colors.text, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontFamily: Font.regular, fontSize: 14, color: Colors.textSoft, textAlign: 'center', lineHeight: 22 },
  pollingText: { fontFamily: Font.medium, fontSize: 12, color: Colors.textSoft, marginTop: 8 },

  openWaBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 32, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.greenMint },
  openWaText: { fontFamily: Font.semibold, fontSize: 14, color: Colors.green },

  retryBtn: { marginTop: 24, backgroundColor: Colors.green, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  retryText: { fontFamily: Font.bold, fontSize: 15, color: '#fff' },
});
