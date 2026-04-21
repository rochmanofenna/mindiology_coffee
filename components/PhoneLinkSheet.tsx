// components/PhoneLinkSheet.tsx — Bottom sheet for linking phone number at checkout
// Shown to Apple Sign In users who haven't linked an ESB account yet.
//
// Two modes:
//   A. hasWhatsApp=true  → Full WhatsApp OTP flow, links ESB account with authkey.
//   B. hasWhatsApp=false → Phone input only (no OTP, no external app). Apple
//      Guideline 4.2.3(i): we cannot require users to install WhatsApp. Mode B
//      saves the phone to user state locally and lets checkout proceed with
//      ESB_STATIC_TOKEN (company auth) — no per-user authkey is needed for
//      /qsv1/order (see server/index.ts:87).
import React, { useState, useEffect, useRef } from 'react';
import {
  Animated, Dimensions, Modal, Pressable, View, Text, TextInput,
  TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import * as Sentry from '@sentry/react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Font, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { sendWhatsAppOTP } from '@/services/api';
import { pollVerification } from '@/utils/otpPolling';

interface PhoneLinkSheetProps {
  visible: boolean;
  onClose: () => void;
  onLinked: () => void;
  branchCode: string;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PANEL_HEIGHT = SCREEN_HEIGHT * 0.52;

export function PhoneLinkSheet({ visible, onClose, onLinked, branchCode }: PhoneLinkSheetProps) {
  const { linkESBAccount, setApplePhoneLocal } = useAuth();
  const [status, setStatus] = useState<'input' | 'verifying' | 'success' | 'error'>('input');
  const [errorMsg, setErrorMsg] = useState('');
  const [phone, setPhone] = useState('');
  // Detect WhatsApp availability once on mount. If absent, Mode B is used.
  // Default to null while detecting so we don't flash Mode A briefly.
  const [hasWhatsApp, setHasWhatsApp] = useState<boolean | null>(null);
  const abortRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    Linking.canOpenURL('whatsapp://send')
      .then(setHasWhatsApp)
      .catch(() => setHasWhatsApp(false));
  }, []);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const panelTranslateY = useRef(new Animated.Value(PANEL_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setStatus('input');
      setPhone('');
      setErrorMsg('');
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(panelTranslateY, { toValue: 0, friction: 8, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const animateOut = (cb?: () => void) => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(panelTranslateY, { toValue: PANEL_HEIGHT, duration: 200, useNativeDriver: true }),
    ]).start(() => cb?.());
  };

  const handleClose = () => {
    abortRef.current?.();
    animateOut(onClose);
  };

  const handleVerify = async () => {
    const cleaned = phone.replace(/\D/g, '').replace(/^0+/, '');
    if (cleaned.length < 8) {
      setErrorMsg('Nomor telepon tidak valid');
      return;
    }

    setStatus('verifying');
    setErrorMsg('');

    try {
      // 1. Send OTP
      const result = await sendWhatsAppOTP(branchCode);
      const { otp, otpMessageUrl } = result.data;

      // 2. Open WhatsApp in-app (SafariViewController)
      try {
        await WebBrowser.openAuthSessionAsync(otpMessageUrl, 'kamarasan://auth/callback');
      } catch { /* user dismissed — polling may still catch VERIFIED */ }

      // 3. Poll for verification
      const { promise, abort } = pollVerification(otp);
      abortRef.current = abort;
      const verification = await promise;

      if (verification.status === 'VERIFIED') {
        // 4. Link the ESB account
        await linkESBAccount(verification.phone!, verification.authkey!, branchCode);
        setStatus('success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

        // Brief success feedback then proceed to checkout
        setTimeout(() => {
          animateOut(() => {
            onLinked();
          });
        }, 800);
      } else if (verification.status === 'EXPIRED') {
        setStatus('error');
        setErrorMsg('Kode OTP sudah kadaluarsa. Silakan coba lagi.');
      } else {
        setStatus('error');
        setErrorMsg('Waktu verifikasi habis. Silakan coba lagi.');
      }
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err?.message || 'Terjadi kesalahan. Silakan coba lagi.');
      Sentry.captureException(err, { tags: { context: 'phone_link' } });
    }
  };

  // Mode B — save phone locally without OTP (WhatsApp not installed).
  const handleContinueWithoutWhatsApp = async () => {
    const cleaned = phone.replace(/\D/g, '').replace(/^0+/, '');
    if (cleaned.length < 8) {
      setErrorMsg('Nomor telepon tidak valid');
      return;
    }

    setErrorMsg('');
    try {
      await setApplePhoneLocal(`+62${cleaned}`);
      setStatus('success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setTimeout(() => {
        animateOut(() => {
          onLinked();
        });
      }, 600);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err?.message || 'Gagal menyimpan nomor. Coba lagi.');
      Sentry.captureException(err, { tags: { context: 'phone_link_local' } });
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent statusBarTranslucent animationType="none">
      <KeyboardAvoidingView
        style={styles.kavRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        {/* Panel — flex child so KAV pushes it above the keyboard */}
        <Animated.View style={[styles.panel, { transform: [{ translateY: panelTranslateY }] }]}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {status === 'success' ? (
            <View style={styles.centeredContent}>
              <View style={styles.successCircle}>
                <Ionicons name="checkmark" size={36} color="#fff" />
              </View>
              <Text style={styles.successTitle}>
                {hasWhatsApp ? 'Berhasil Terhubung!' : 'Nomor Tersimpan'}
              </Text>
              <Text style={styles.successSubtitle}>Melanjutkan ke pembayaran...</Text>
            </View>
          ) : hasWhatsApp === null ? (
            // Brief loading while detecting WhatsApp availability
            <View style={styles.centeredContent}>
              <ActivityIndicator color={Colors.green} size="small" />
            </View>
          ) : (
            <>
              {/* Title */}
              <Text style={styles.title}>
                {hasWhatsApp ? 'Hubungkan Nomor Telepon' : 'Nomor Telepon'}
              </Text>
              <Text style={styles.subtitle}>
                {hasWhatsApp
                  ? 'Untuk melanjutkan pesanan, verifikasi nomor telepon kamu via WhatsApp'
                  : 'Masukkan nomor telepon untuk konfirmasi pesanan'}
              </Text>

              {/* Phone input */}
              <View style={styles.inputRow}>
                <View style={styles.prefixBox}>
                  <Text style={styles.prefixText}>+62</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="812 3456 7890"
                  placeholderTextColor={Colors.textSoft + '88'}
                  keyboardType="phone-pad"
                  maxLength={15}
                  editable={status === 'input' || status === 'error'}
                />
              </View>

              {/* Error message */}
              {errorMsg ? (
                <Text style={styles.errorText}>{errorMsg}</Text>
              ) : null}

              {/* Primary button — Mode A (WhatsApp verify) or Mode B (save & continue) */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={
                  status === 'error'
                    ? () => setStatus('input')
                    : hasWhatsApp
                      ? handleVerify
                      : handleContinueWithoutWhatsApp
                }
                disabled={status === 'verifying'}
                style={{ width: '100%' }}
              >
                <LinearGradient
                  colors={status === 'verifying' ? ['#9CA3AF', '#9CA3AF'] : [Colors.green, Colors.greenDeep]}
                  style={styles.verifyBtn}
                >
                  {status === 'verifying' ? (
                    <>
                      <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
                      <Text style={styles.verifyBtnText}>Memverifikasi...</Text>
                    </>
                  ) : status === 'error' ? (
                    <>
                      <Ionicons name="refresh" size={18} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.verifyBtnText}>Coba Lagi</Text>
                    </>
                  ) : hasWhatsApp ? (
                    <>
                      <Ionicons name="logo-whatsapp" size={20} color="#fff" style={{ marginRight: 8 }} />
                      <Text style={styles.verifyBtnText}>Verifikasi via WhatsApp</Text>
                    </>
                  ) : (
                    <Text style={styles.verifyBtnText}>Lanjutkan</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* Skip hint */}
              <TouchableOpacity onPress={handleClose} style={styles.skipBtn}>
                <Text style={styles.skipText}>Nanti saja</Text>
              </TouchableOpacity>
            </>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  kavRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  panel: {
    minHeight: PANEL_HEIGHT,
    backgroundColor: Colors.cream,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.xxl,
    paddingTop: 12,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textSoft + '44',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: Font.displayBold,
    fontSize: 22,
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Colors.textSoft,
    lineHeight: 20,
    marginBottom: 24,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  prefixBox: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  prefixText: {
    fontFamily: Font.semibold,
    fontSize: 15,
    color: Colors.text,
  },
  phoneInput: {
    flex: 1,
    height: 50,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontFamily: Font.medium,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  errorText: {
    fontFamily: Font.medium,
    fontSize: 13,
    color: Colors.hibiscus,
    marginBottom: 12,
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
  },
  verifyBtnText: {
    fontFamily: Font.bold,
    fontSize: 16,
    color: '#fff',
  },
  skipBtn: {
    alignSelf: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  skipText: {
    fontFamily: Font.semibold,
    fontSize: 14,
    color: Colors.textSoft,
  },
  centeredContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  successTitle: {
    fontFamily: Font.displayBold,
    fontSize: 22,
    color: Colors.text,
    marginBottom: 6,
  },
  successSubtitle: {
    fontFamily: Font.regular,
    fontSize: 14,
    color: Colors.textSoft,
  },
});
