// app/auth/callback.tsx — Deep link handler for kamarasan://auth/callback
// WhatsApp OTP redirect lands here
import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Font } from '@/constants/theme';

export default function AuthCallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    // OTP verification is handled by polling in phone.tsx
    // This callback just redirects home
    const timer = setTimeout(() => {
      router.replace('/');
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.green} />
      <Text style={styles.text}>Memverifikasi...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream, justifyContent: 'center', alignItems: 'center', gap: 16 },
  text: { fontFamily: Font.medium, fontSize: 14, color: Colors.textSoft },
});
