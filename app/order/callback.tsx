// app/order/callback.tsx — Deep link handler for kamarasan://order/callback
// DANA/Xendit redirects here after payment completion
import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Font } from '@/constants/theme';

const FAILED_STATUSES = ['failed', 'cancelled', 'expired', 'denied'];

export default function OrderCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId?: string; status?: string }>();
  const [message, setMessage] = useState('Memeriksa status pembayaran...');

  useEffect(() => {
    const status = params.status?.toLowerCase();

    if (status && FAILED_STATUSES.includes(status)) {
      setMessage('Pembayaran tidak berhasil');
      Alert.alert(
        'Pembayaran Gagal',
        'Pembayaran tidak berhasil. Silakan coba lagi.',
        [{ text: 'Kembali', onPress: () => router.replace('/cart' as any) }],
      );
      return;
    }

    // Success or unknown status — go to order tracking (polling determines real status)
    const timer = setTimeout(() => {
      router.replace('/(tabs)/order' as any);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.green} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream, justifyContent: 'center', alignItems: 'center', gap: 16 },
  text: { fontFamily: Font.medium, fontSize: 14, color: Colors.textSoft },
});
