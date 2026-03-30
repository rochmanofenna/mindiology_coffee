// app/auth/welcome.tsx — Branded Welcome Screen
import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Font, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { sendWhatsAppOTP } from '@/services/api';
import { useBranch } from '@/context/BranchContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Shared OTP state between welcome and phone screens (avoids URL param exposure)
let pendingOtp: { otp: string; url: string } | null = null;
export function setPendingOtp(data: { otp: string; url: string }) { pendingOtp = data; }
export function getPendingOtp() { return pendingOtp; }
export function clearPendingOtp() { pendingOtp = null; }

export default function WelcomeScreen() {
  const router = useRouter();
  const { setGuest } = useAuth();
  const { currentBranchCode } = useBranch();
  const [loading, setLoading] = useState(false);

  const handleWhatsApp = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setLoading(true);
    try {
      const result = await sendWhatsAppOTP(currentBranchCode);
      const { otp, otpMessageUrl } = result.data;
      // Store OTP in memory instead of URL params to avoid exposure
      setPendingOtp({ otp, url: otpMessageUrl });
      router.push('/auth/phone');
    } catch (err: any) {
      Alert.alert('Gagal', err?.message || 'Tidak bisa menghubungi server. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await setGuest();
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      {/* Top branding */}
      <View style={styles.brandSection}>
        <Text style={styles.brandName}>Mindiology</Text>
        <Text style={styles.brandTagline}>SOULFOOD NUSANTARA</Text>
      </View>

      {/* Center icon */}
      <View style={styles.centerSection}>
        <View style={styles.iconCircle}>
          <Ionicons name="restaurant" size={48} color={Colors.white} />
        </View>
      </View>

      {/* Bottom actions */}
      <View style={styles.bottomSection}>
        <TouchableOpacity activeOpacity={0.85} onPress={handleWhatsApp} disabled={loading}>
          <LinearGradient
            colors={[Colors.green, Colors.greenDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.whatsappBtn}
          >
            {loading ? (
              <>
                <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
                <Text style={styles.whatsappText}>Menghubungkan...</Text>
              </>
            ) : (
              <>
                <Ionicons name="logo-whatsapp" size={22} color={Colors.white} style={styles.whatsappIcon} />
                <Text style={styles.whatsappText}>Masuk dengan WhatsApp</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.guestBtn} onPress={handleGuest} activeOpacity={0.7}>
          <Text style={styles.guestText}>Lanjutkan sebagai Tamu</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Kamarasan v1.1.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  brandSection: {
    flex: 0.4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandName: {
    fontFamily: Font.displayBlack,
    fontSize: 42,
    color: Colors.green,
  },
  brandTagline: {
    fontFamily: Font.medium,
    fontSize: 12,
    letterSpacing: 3,
    color: Colors.textSoft,
    marginTop: Spacing.sm,
  },
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSection: {
    flex: 0.4,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingBottom: 48,
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: SCREEN_WIDTH - Spacing.xxl * 2,
    height: 56,
    borderRadius: 14,
  },
  whatsappIcon: {
    marginRight: Spacing.sm,
  },
  whatsappText: {
    fontFamily: Font.bold,
    fontSize: 16,
    color: Colors.white,
  },
  guestBtn: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  guestText: {
    fontFamily: Font.semibold,
    fontSize: 14,
    color: Colors.textSoft,
  },
  versionText: {
    fontFamily: Font.regular,
    fontSize: 11,
    color: Colors.textSoft,
    marginTop: Spacing.xxl,
  },
});
