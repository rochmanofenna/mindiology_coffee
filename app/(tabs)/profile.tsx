// app/(tabs)/profile.tsx — Profile Screen
import { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Font, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useOrder } from '@/context/OrderContext';
import { STORES } from '@/constants/stores';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SETTINGS: { label: string; icon: keyof typeof Ionicons.glyphMap; route?: string; key?: string }[] = [
  { label: 'Barcode Member', icon: 'barcode-outline', route: '/barcode', key: 'barcode' },
  { label: 'Riwayat Pesanan', icon: 'receipt-outline', route: '/(tabs)/order' },
  { label: 'Reservasi Saya', icon: 'calendar-outline', route: '/reservation' },
  { label: 'Metode Pembayaran', icon: 'card-outline', route: '/coming-soon?title=Metode+Pembayaran' },
  { label: 'Lokasi Tersimpan', icon: 'location-outline', route: '/coming-soon?title=Lokasi+Tersimpan' },
  { label: 'Notifikasi', icon: 'notifications-outline', route: '/coming-soon?title=Notifikasi' },
  { label: 'Ajak Teman', icon: 'gift-outline', route: '/coming-soon?title=Ajak+Teman' },
  { label: 'Karir', icon: 'briefcase-outline', route: '/careers' },
  { label: 'Bantuan', icon: 'help-circle-outline', route: '/coming-soon?title=Bantuan' },
];

type TierKey = 'Perunggu' | 'Perak' | 'Emas';

const TIER_GRADIENTS: Record<TierKey, [string, string]> = {
  Perunggu: ['#CD7F32', '#E8B878'],
  Perak: ['#C0C0C0', '#E8E8E8'],
  Emas: ['#D4A843', '#F5E6B8'],
};

const TIER_TEXT_COLORS: Record<TierKey, string> = {
  Perunggu: '#CD7F32',
  Perak: '#A0A0A0',
  Emas: '#D4A843',
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, deleteAccount } = useAuth();
  const { orderHistory, fetchHistory, activeOrders } = useOrder();
  const points = user?.points || 0;
  const tier: TierKey = user?.tier || 'Perunggu';
  const orderCount = activeOrders.length + orderHistory.length;

  // Fetch order history on mount if user is logged in
  useEffect(() => {
    if (user?.authkey) fetchHistory(user.authkey);
  }, [user?.authkey]);

  const openMaps = (lat: number, lng: number, name: string) => {
    Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`);
  };

  const handleSettingPress = (item: typeof SETTINGS[number]) => {
    if (item.key === 'barcode' && !user) {
      Alert.alert('Login Diperlukan', 'Silakan login terlebih dahulu untuk melihat barcode member.', [
        { text: 'Batal', style: 'cancel' },
        { text: 'Login', onPress: () => router.replace('/auth/welcome' as any) },
      ]);
      return;
    }
    if (item.route) {
      router.push(item.route as any);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/auth/welcome' as any);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Hapus Akun',
      'Apakah kamu yakin ingin menghapus akun? Semua data pesanan dan poin rewards akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.\n\nUntuk penghapusan data lengkap dari server, hubungi hello@kamarasan.app',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus Akun',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              router.replace('/auth/welcome' as any);
            } catch {
              Alert.alert('Gagal', 'Terjadi kesalahan saat menghapus akun. Silakan coba lagi.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>Profil</Text>
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarShadow}>
          <LinearGradient colors={TIER_GRADIENTS[tier]} style={styles.avatarRing}>
            <View style={styles.avatarInnerRing}>
              <LinearGradient colors={[Colors.green, Colors.greenLight]} style={styles.avatar}>
                <Text style={styles.avatarLetter}>{(user?.name?.[0] || 'T').toUpperCase()}</Text>
              </LinearGradient>
            </View>
          </LinearGradient>
        </View>
        <Text style={styles.name}>{user?.name || 'Tamu'}</Text>
        <Text style={styles.memberSince}>{user?.memberCode ? `Member ${user.memberCode}` : user ? `+${user.phone}` : 'Belum login'}</Text>

        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: Colors.gold }]}>{points}</Text>
            <Text style={styles.statLabel}>POIN</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: TIER_TEXT_COLORS[tier], fontSize: tier.length > 5 ? 18 : 28 }]} numberOfLines={1} adjustsFontSizeToFit>{tier}</Text>
            <Text style={styles.statLabel}>TIER</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNum}>{user ? String(orderCount) : '0'}</Text>
            <Text style={styles.statLabel}>PESANAN</Text>
          </View>
        </View>
      </View>

      {/* Settings */}
      <View style={styles.settingsList}>
        {SETTINGS.map((item, i) => (
          <TouchableOpacity key={i} style={styles.settingRow} activeOpacity={0.6} onPress={() => handleSettingPress(item)}>
            <View style={styles.settingIconWrap}>
              <Ionicons name={item.icon as any} size={20} color={Colors.green} />
            </View>
            <Text style={styles.settingLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.brownLight + '88'} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Store Locations */}
      <View style={styles.storesSection}>
        <Text style={styles.storesTitle}>Lokasi Kami</Text>
        {STORES.map((store, i) => (
          <View key={i} style={styles.storeCard}>
            <View style={styles.storeTop}>
              <View style={styles.storePin}>
                <Ionicons name="location" size={18} color={Colors.green} />
              </View>
              <View style={styles.storeInfo}>
                <Text style={styles.storeName}>{store.name}</Text>
                <Text style={styles.storeAddr}>{store.addr}</Text>
                <Text style={styles.storeHours}>{store.hours} WIB</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.naviBtn}
              activeOpacity={0.7}
              onPress={() => openMaps(store.lat, store.lng, store.name)}
            >
              <View style={styles.naviBtnCircle}>
                <Ionicons name="navigate" size={14} color={Colors.green} />
              </View>
              <Text style={styles.naviBtnText}>Navigasi</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Delete Account — Apple requires this per Guideline 4 */}
      {user && (
        <TouchableOpacity style={styles.deleteBtn} activeOpacity={0.7} onPress={handleDeleteAccount}>
          <Ionicons name="trash-outline" size={18} color={Colors.hibiscus} />
          <Text style={styles.deleteText}>Hapus Akun</Text>
        </TouchableOpacity>
      )}

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.7} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color={Colors.hibiscus} />
        <Text style={styles.logoutText}>Keluar</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Kamarasan v1.1.0</Text>
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: { paddingHorizontal: Spacing.xxl },
  title: { fontFamily: Font.displayBold, fontSize: 28, color: Colors.text, marginBottom: 18 },

  // Avatar
  avatarSection: { alignItems: 'center', paddingBottom: 20 },
  avatarShadow: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 4, marginBottom: 12 },
  avatarRing: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
  avatarInnerRing: { width: 68, height: 68, borderRadius: 34, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontFamily: Font.extrabold, fontSize: 24, color: '#fff' },
  name: { fontFamily: Font.bold, fontSize: 20, color: Colors.text, marginBottom: 4 },
  memberSince: { fontFamily: Font.regular, fontSize: 12, color: Colors.textSoft, marginBottom: 16 },

  // Stats
  statRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 16, padding: 18, marginHorizontal: Spacing.xxl, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  stat: { flex: 1, alignItems: 'center' },
  statNum: { fontFamily: Font.extrabold, fontSize: 28, color: Colors.green },
  statLabel: { fontFamily: Font.semibold, fontSize: 9, color: Colors.textSoft, marginTop: 4, letterSpacing: 1 },
  statDivider: { width: 1, height: 36, backgroundColor: '#F0EBE4' },

  // Settings
  settingsList: { paddingHorizontal: Spacing.xxl, marginTop: 24 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0EBE4' },
  settingIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.greenMint },
  settingLabel: { fontFamily: Font.medium, flex: 1, fontSize: 14, color: Colors.text },

  // Stores
  storesSection: { paddingHorizontal: Spacing.xxl, marginTop: 28 },
  storesTitle: { fontFamily: Font.displayBold, fontSize: 22, color: Colors.text, marginBottom: 14 },
  storeCard: { backgroundColor: Colors.white, borderRadius: 14, padding: 16, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#D4A843', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  storeTop: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  storePin: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.greenMint, alignItems: 'center', justifyContent: 'center' },
  storeInfo: { flex: 1 },
  storeName: { fontFamily: Font.bold, fontSize: 14, color: Colors.text, marginBottom: 3 },
  storeAddr: { fontFamily: Font.regular, fontSize: 12, color: Colors.textSoft, lineHeight: 17, marginBottom: 4 },
  storeHours: { fontFamily: Font.semibold, fontSize: 12, color: Colors.green },
  naviBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F0EBE4' },
  naviBtnCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.greenMint, alignItems: 'center', justifyContent: 'center' },
  naviBtnText: { fontFamily: Font.semibold, fontSize: 13, color: Colors.green },

  // Logout
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: Spacing.xxl, marginTop: 28, padding: 14, borderRadius: 14, backgroundColor: Colors.hibiscusLight },
  deleteText: { color: Colors.hibiscus, fontSize: 14, fontFamily: Font.semibold },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: Spacing.xxl, marginTop: 12, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.hibiscus + '33' },
  logoutText: { color: Colors.hibiscus, fontSize: 14, fontWeight: '600' },
  version: { textAlign: 'center', fontSize: 11, color: Colors.textSoft + '88', marginTop: 16 },
});
