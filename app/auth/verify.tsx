// app/auth/verify.tsx — Redirect to welcome (OTP flow handled in phone.tsx now)
import { useEffect } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function VerifyRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/auth/welcome'); }, []);
  return <View style={{ flex: 1, backgroundColor: Colors.cream }} />;
}
