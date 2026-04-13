// app/order/callback.tsx — Deep link handler for kamarasan://order/callback
// DANA/Xendit redirects here after payment. Routes to payment-status for verification.
import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Colors, Font } from '@/constants/theme';
import { useOrder } from '@/context/OrderContext';

export default function OrderCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId?: string }>();
  const { activeOrders } = useOrder();

  useEffect(() => {
    // Brief delay to let OrderContext restore from cache on cold start
    const timer = setTimeout(() => {
      // Find order from deep link params or the most recent waiting_payment order
      const order = params.orderId
        ? activeOrders.find(o => o.orderId === params.orderId)
        : activeOrders.find(o => o.status === 'waiting_payment');

      if (order) {
        router.replace({
          pathname: '/payment-status',
          params: {
            orderID: order.orderId,
            branchCode: order.branchCode,
            queueNum: order.queueNum || '',
            paymentMethod: order.paymentMethodID || '',
          },
        } as any);
      } else {
        // Fallback — order not found, go to tracking
        router.replace('/(tabs)/order' as any);
      }
    }, 500);
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
