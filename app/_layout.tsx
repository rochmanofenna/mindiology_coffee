// app/_layout.tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts as useDMSans, DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold, DMSans_800ExtraBold } from '@expo-google-fonts/dm-sans';
import { useFonts as useFraunces, Fraunces_700Bold, Fraunces_800ExtraBold, Fraunces_900Black } from '@expo-google-fonts/fraunces';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { BranchProvider } from '@/context/BranchContext';
import { CartProvider } from '@/context/CartContext';
import { ReservationProvider } from '@/context/ReservationContext';
import { OrderProvider } from '@/context/OrderContext';
import { Colors } from '@/constants/theme';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { registerForPushNotifications } from '@/utils/notifications';
import { registerPushToken } from '@/services/api';

SplashScreen.preventAutoHideAsync();

function AppNavigator() {
  const { user, isLoading, isGuest } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user && !isGuest) {
      router.replace('/auth/welcome');
    }
  }, [isLoading, user, isGuest]);

  // Register push token when user is logged in
  useEffect(() => {
    if (!user?.phone) return;
    registerForPushNotifications().then(token => {
      if (token) registerPushToken(user.phone, token).catch(() => {});
    }).catch(() => {});
  }, [user?.phone]);

  // Prevent flash of home screen while checking auth state
  if (isLoading) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.cream },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth/welcome" options={{ animation: 'fade' }} />
        <Stack.Screen name="auth/phone" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="auth/verify" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen
          name="item/[id]"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="barcode"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="menu"
          options={{
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="cart"
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="reservation/index"
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="reservation/select-time"
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="reservation/confirm"
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="careers/index"
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen
          name="careers/[id]"
          options={{
            animation: 'slide_from_right',
          }}
        />
        <Stack.Screen name="coming-soon" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="auth/callback" options={{ animation: 'fade' }} />
        <Stack.Screen name="order/callback" options={{ animation: 'fade' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [dmLoaded, dmError] = useDMSans({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
  });
  const [frauncesLoaded, frauncesError] = useFraunces({
    Fraunces_700Bold,
    Fraunces_800ExtraBold,
    Fraunces_900Black,
  });

  // Proceed once fonts load OR fail — never block the app
  const ready = (dmLoaded || dmError) && (frauncesLoaded || frauncesError);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
      <AuthProvider>
        <BranchProvider>
          <CartProvider>
            <ReservationProvider>
              <OrderProvider>
                <AppNavigator />
              </OrderProvider>
            </ReservationProvider>
          </CartProvider>
        </BranchProvider>
      </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
