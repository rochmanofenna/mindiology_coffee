// app/auth/welcome.tsx — Welcome Screen
// Two login paths: Sign in with Apple (primary), Guest (text link).
// Apple Guideline 4.8: Apple Sign In offered as first-class option.
import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
  ActivityIndicator, Alert, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Haptics from 'expo-haptics';
import { Colors, Font, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BTN_WIDTH = SCREEN_WIDTH - Spacing.xxl * 2;

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setGuest, loginWithApple } = useAuth();
  const [loadingApple, setLoadingApple] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => {});
    }
  }, []);

  const handleAppleSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setLoadingApple(true);
    try {
      await loginWithApple();
      router.replace('/');
    } catch (err: any) {
      if (err.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Sign In Failed', 'Something went wrong with Sign in with Apple. Please try again.');
      }
    } finally {
      setLoadingApple(false);
    }
  };

  const handleGuest = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await setGuest();
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      {/* ─── Top: Brand identity ─── */}
      <View style={[styles.brandSection, { paddingTop: insets.top + 40 }]}>
        <View style={styles.decorLine} />
        <Text style={styles.brandName}>Mindiology</Text>
        <Text style={styles.tagline}>Order your favorite food & drinks</Text>
      </View>

      {/* ─── Center: Visual element ─── */}
      <View style={styles.centerSection}>
        <View style={styles.iconOuter}>
          <View style={styles.iconInner}>
            <Ionicons name="restaurant" size={44} color={Colors.green} />
          </View>
        </View>
      </View>

      {/* ─── Bottom: Auth actions ─── */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 24 }]}>
        {/* Sign in with Apple — PRIMARY (Apple Guideline 4.8) */}
        {appleAvailable && (
          <View style={styles.appleWrap}>
            {loadingApple ? (
              <View style={styles.appleLoading}>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.appleLoadingText}>Connecting...</Text>
              </View>
            ) : (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={14}
                style={styles.appleBtn}
                onPress={handleAppleSignIn}
              />
            )}
          </View>
        )}

        {/* Guest mode — text link */}
        <TouchableOpacity style={styles.guestBtn} onPress={handleGuest} activeOpacity={0.6} disabled={loadingApple}>
          <Text style={styles.guestText}>Continue as Guest</Text>
          <Ionicons name="arrow-forward" size={14} color={Colors.textSoft} style={{ marginLeft: 4 }} />
        </TouchableOpacity>

        <Text style={styles.versionText}>Mindiology v1.2.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },

  // ─── Brand ───
  brandSection: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  decorLine: {
    width: 32,
    height: 2,
    backgroundColor: Colors.gold,
    borderRadius: 1,
    marginBottom: 20,
  },
  brandName: {
    fontFamily: Font.displayBlack,
    fontSize: 44,
    color: Colors.greenForest,
    letterSpacing: -1,
  },
  tagline: {
    fontFamily: Font.regular,
    fontSize: 15,
    color: Colors.textSoft,
    letterSpacing: 0.3,
    marginTop: 18,
  },

  // ─── Center icon ───
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: Colors.greenMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.greenMint,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Bottom actions ───
  bottomSection: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },

  // Apple button
  appleWrap: {
    width: BTN_WIDTH,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  appleBtn: {
    width: BTN_WIDTH,
    height: 52,
  },
  appleLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: BTN_WIDTH,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#000',
  },
  appleLoadingText: {
    fontFamily: Font.semibold,
    fontSize: 16,
    color: '#fff',
    marginLeft: 8,
  },

  // Guest link
  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  guestText: {
    fontFamily: Font.medium,
    fontSize: 14,
    color: Colors.textSoft,
  },

  versionText: {
    fontFamily: Font.regular,
    fontSize: 11,
    color: Colors.textSoft + '88',
    marginTop: 16,
  },
});
