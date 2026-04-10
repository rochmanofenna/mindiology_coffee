// app/barcode.tsx — Member Barcode/QR Modal
import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Brightness from 'expo-brightness';
import { Colors, Font, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';

export default function BarcodeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const originalBrightness = useRef<number | null>(null);

  const memberId = user?.memberCode || '';
  const points = user?.points || 0;
  const tier = user?.tier || 'Perunggu';

  useEffect(() => {
    if (!user) return;
    // Increase brightness for scanning
    (async () => {
      try {
        const current = await Brightness.getBrightnessAsync();
        originalBrightness.current = current;
        await Brightness.setBrightnessAsync(1);
      } catch {}
    })();

    return () => {
      // Restore brightness on unmount
      if (originalBrightness.current !== null) {
        Brightness.setBrightnessAsync(originalBrightness.current).catch(() => {});
      }
    };
  }, [user]);

  const qrValue = JSON.stringify({
    type: 'member',
    id: memberId,
    app: 'kamarasan',
  });

  // Guest or unlinked Apple user — prompt to login or link phone
  if (!user || (user.loginMethod === 'apple' && !user.esbLinked)) {
    const message = user?.loginMethod === 'apple'
      ? 'Hubungkan nomor telepon untuk mendapatkan barcode member'
      : 'Login untuk melihat barcode member';
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-down" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.dragHandle} />
        </View>

        <View style={styles.guestContainer}>
          <Ionicons name="barcode-outline" size={64} color={Colors.textSoft} />
          <Text style={styles.guestTitle}>{message}</Text>
          <TouchableOpacity style={styles.guestLoginBtn} onPress={() => router.replace('/auth/welcome' as any)}>
            <Text style={styles.guestLoginText}>{user ? 'Hubungkan' : 'Login'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-down" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.dragHandle} />
      </View>

      {/* User Info */}
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{user.name}</Text>
        <View style={styles.tierRow}>
          <View style={styles.tierPill}>
            <Text style={styles.tierText}>{tier}</Text>
          </View>
          <Text style={styles.pointsText}>{points} poin</Text>
        </View>
      </View>

      {/* QR Code */}
      <View style={styles.codeSection}>
        <View style={styles.qrWrap}>
          <QRCode
            value={qrValue}
            size={200}
            color={Colors.text}
            backgroundColor="#fff"
          />
        </View>

        {/* Member ID */}
        <Text style={styles.memberId}>{memberId}</Text>
      </View>

      {/* Instruction */}
      <View style={styles.instructionWrap}>
        <Ionicons name="scan-outline" size={18} color={Colors.textSoft} />
        <Text style={styles.instruction}>Tunjukkan kode ini saat pembayaran</Text>
      </View>

      {/* Decorative bottom */}
      <View style={styles.bottomDecor}>
        <View style={styles.decorLine} />
        <Text style={styles.decorText}>Kamarasan Rewards Member</Text>
        <View style={styles.decorLine} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center' },

  header: { alignItems: 'center', paddingTop: 12, paddingBottom: 6, width: '100%' },
  dragHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', marginBottom: 8 },
  closeBtn: { position: 'absolute', left: 16, top: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center', zIndex: 10 },

  userInfo: { alignItems: 'center', marginTop: 20, marginBottom: 32 },
  userName: { fontFamily: Font.displayBold, fontSize: 24, color: Colors.text, marginBottom: 8 },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tierPill: { backgroundColor: Colors.greenMint, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10 },
  tierText: { fontFamily: Font.semibold, fontSize: 12, color: Colors.green },
  pointsText: { fontFamily: Font.medium, fontSize: 13, color: Colors.textSoft },

  codeSection: { alignItems: 'center', marginBottom: 28 },
  qrWrap: { padding: 20, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: '#F0F0F0', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4, marginBottom: 16 },
  memberId: { fontFamily: Font.bold, fontSize: 20, color: Colors.text, letterSpacing: 2 },

  instructionWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 40 },
  instruction: { fontFamily: Font.regular, fontSize: 13, color: Colors.textSoft },

  bottomDecor: { flexDirection: 'row', alignItems: 'center', gap: 12, position: 'absolute', bottom: 50 },
  decorLine: { width: 40, height: 1, backgroundColor: '#E8E0D8' },
  decorText: { fontFamily: Font.medium, fontSize: 11, color: Colors.brownLight },

  // Guest state
  guestContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, marginTop: -40 },
  guestTitle: { fontFamily: Font.medium, fontSize: 16, color: Colors.textSoft, textAlign: 'center', marginTop: 20, marginBottom: 24 },
  guestLoginBtn: { backgroundColor: Colors.green, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 14 },
  guestLoginText: { fontFamily: Font.bold, fontSize: 16, color: '#fff' },
});
