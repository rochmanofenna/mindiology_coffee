// app/saved-locations.tsx — Lokasi Tersimpan (saved delivery addresses)
// Fetches from ESB via middleware GET /api/user/addresses (requires userToken).
import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Sentry from '@sentry/react-native';
import { Colors, Font, Spacing, Radius } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getUserAddresses, type UserAddress } from '@/services/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SavedLocationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.authkey) {
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const res = await getUserAddresses(user.authkey);
      const list = Array.isArray(res) ? res : Array.isArray((res as any)?.data) ? (res as any).data : [];
      setAddresses(list);
    } catch (err: any) {
      Sentry.captureException(err, { tags: { context: 'saved_locations_fetch' } });
      setError(err?.message || 'Gagal memuat lokasi tersimpan');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.authkey]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const needsLink = !user || (user.loginMethod === 'apple' && !user.esbLinked);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lokasi Tersimpan</Text>
        <View style={{ width: 36 }} />
      </View>

      {needsLink ? (
        <View style={styles.body}>
          <View style={styles.iconCircle}>
            <Ionicons name="location-outline" size={32} color={Colors.green} />
          </View>
          <Text style={styles.title}>Hubungkan Nomor Telepon</Text>
          <Text style={styles.subtitle}>
            {user?.loginMethod === 'apple'
              ? 'Hubungkan nomor telepon kamu di halaman checkout untuk melihat lokasi tersimpan.'
              : 'Silakan login terlebih dahulu untuk melihat lokasi tersimpan.'}
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.replace(user ? '/(tabs)/explore' as any : '/auth/welcome' as any)}
          >
            <Text style={styles.primaryBtnText}>{user ? 'Jelajahi Menu' : 'Login'}</Text>
          </TouchableOpacity>
        </View>
      ) : loading ? (
        <View style={styles.body}>
          <ActivityIndicator size="large" color={Colors.green} />
        </View>
      ) : error ? (
        <View style={styles.body}>
          <View style={styles.iconCircle}>
            <Ionicons name="alert-circle-outline" size={32} color={Colors.hibiscus} />
          </View>
          <Text style={styles.title}>Gagal Memuat</Text>
          <Text style={styles.subtitle}>{error}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={load}>
            <Text style={styles.primaryBtnText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      ) : addresses.length === 0 ? (
        <View style={styles.body}>
          <View style={styles.iconCircle}>
            <Ionicons name="location-outline" size={32} color={Colors.green} />
          </View>
          <Text style={styles.title}>Belum Ada Lokasi</Text>
          <Text style={styles.subtitle}>
            Alamat akan tersimpan otomatis setelah kamu melakukan pesanan pengantaran.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.green} />}
        >
          {addresses.map((addr, i) => {
            const id = addr.addressID ?? addr.addressId ?? i;
            const label = addr.label || 'Alamat';
            const fullAddress = addr.fullAddress || addr.address || '';
            return (
              <View key={String(id)} style={styles.card}>
                <View style={styles.cardIcon}>
                  <Ionicons name="location" size={18} color={Colors.green} />
                </View>
                <View style={styles.cardBody}>
                  <View style={styles.labelRow}>
                    <Text style={styles.label}>{label}</Text>
                    {addr.isDefault ? <Text style={styles.defaultBadge}>Utama</Text> : null}
                  </View>
                  {fullAddress ? <Text style={styles.address}>{fullAddress}</Text> : null}
                  {addr.note ? <Text style={styles.note}>{addr.note}</Text> : null}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl, marginBottom: Spacing.md,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  headerTitle: { fontFamily: Font.displayBold, fontSize: 20, color: Colors.text },

  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxl, paddingBottom: 80 },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.greenMint, alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontFamily: Font.displayBold, fontSize: 22, color: Colors.text, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontFamily: Font.regular, fontSize: 14, color: Colors.textSoft, textAlign: 'center', lineHeight: 22, marginBottom: 24 },

  primaryBtn: {
    paddingVertical: 14, paddingHorizontal: 32, borderRadius: Radius.md,
    backgroundColor: Colors.green,
  },
  primaryBtnText: { fontFamily: Font.bold, fontSize: 15, color: '#fff' },

  list: { paddingHorizontal: Spacing.xxl, paddingTop: Spacing.md, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.greenMint, alignItems: 'center', justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  label: { fontFamily: Font.bold, fontSize: 14, color: Colors.text },
  defaultBadge: {
    fontFamily: Font.semibold, fontSize: 10,
    color: Colors.greenDeep, backgroundColor: Colors.greenMint,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  address: { fontFamily: Font.regular, fontSize: 13, color: Colors.textSoft, lineHeight: 18 },
  note: { fontFamily: Font.regular, fontSize: 12, color: Colors.textSoft + 'AA', marginTop: 4, fontStyle: 'italic' },
});
