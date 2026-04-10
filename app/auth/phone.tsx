// app/auth/phone.tsx — WhatsApp OTP Waiting Screen
// Opens WhatsApp in-app via SafariViewController (Apple Guideline 4 compliant)
// Polls ESB for OTP verification status using shared utility
import { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Animated, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { Colors, Font, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useBranch } from '@/context/BranchContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPendingOtp, clearPendingOtp } from './welcome';
import { pollVerification } from '@/utils/otpPolling';

export default function WhatsAppWaitingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useAuth();
  const { currentBranchCode } = useBranch();

  const [otpData, setOtpData] = useState<{ otp: string; url: string } | null>(null);
  const [status, setStatus] = useState<'opening' | 'waiting' | 'verifying' | 'verified' | 'error'>('opening');
  const [errorMsg, setErrorMsg] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const abortRef = useRef<(() => void) | null>(null);

  // Read OTP from in-memory store on mount
  useEffect(() => {
    const pending = getPendingOtp();
    if (pending) {
      setOtpData(pending);
      clearPendingOtp();
    } else {
      router.back();
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

  // Open WhatsApp in-app and start polling
  useEffect(() => {
    if (!otpData) return;

    let mounted = true;

    (async () => {
      // Open wa.me URL in SafariViewController (stays in-app per Apple Guideline 4)
      try {
        await WebBrowser.openAuthSessionAsync(
          otpData.url,
          'kamarasan://auth/callback',
        );
      } catch {
        // User may have dismissed the browser — polling will still catch VERIFIED
      }

      if (!mounted) return;
      setStatus('waiting');

      // Start polling for verification
      const { promise, abort } = pollVerification(otpData.otp);
      abortRef.current = abort;

      const result = await promise;
      if (!mounted) return;

      if (result.status === 'VERIFIED') {
        setStatus('verifying');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        await login(result.phone!, result.authkey!, currentBranchCode, result.name);
        setStatus('verified');
        setTimeout(() => router.replace('/'), 500);
      } else if (result.status === 'EXPIRED') {
        setStatus('error');
        setErrorMsg('Kode OTP sudah kadaluarsa. Silakan coba lagi.');
      } else {
        setStatus('error');
        setErrorMsg('Waktu verifikasi habis. Silakan coba lagi.');
      }
    })();

    return () => {
      mounted = false;
      abortRef.current?.();
    };
  }, [otpData]);

  const handleRetry = () => {
    abortRef.current?.();
    router.back();
  };

  const handleOpenWhatsApp = async () => {
    if (!otpData) return;
    try {
      await WebBrowser.openAuthSessionAsync(
        otpData.url,
        'kamarasan://auth/callback',
      );
    } catch {
      Alert.alert('Error', 'Tidak bisa membuka WhatsApp');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleRetry}>
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

                <Text style={styles.hintText}>
                  Tidak punya WhatsApp? Kembali dan gunakan Sign in with Apple.
                </Text>
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

  hintText: { fontFamily: Font.regular, fontSize: 12, color: Colors.textSoft, textAlign: 'center', marginTop: 20, lineHeight: 18, opacity: 0.7 },

  retryBtn: { marginTop: 24, backgroundColor: Colors.green, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  retryText: { fontFamily: Font.bold, fontSize: 15, color: '#fff' },
});
