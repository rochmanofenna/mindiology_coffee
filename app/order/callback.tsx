// app/order/callback.tsx — Deep link handler for kamarasan://order/callback
// DANA/Xendit redirects here after payment completion
import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Font } from '@/constants/theme';

export default function OrderCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId?: string; status?: string }>();

  useEffect(() => {
    // Navigate to order tracking after a brief pause
    const timer = setTimeout(() => {
      router.replace('/(tabs)/order' as any);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.green} />
      <Text style={styles.text}>Memproses pembayaran...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream, justifyContent: 'center', alignItems: 'center', gap: 16 },
  text: { fontFamily: Font.medium, fontSize: 14, color: Colors.textSoft },
});
