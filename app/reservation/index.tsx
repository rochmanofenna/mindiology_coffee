// app/reservation/index.tsx — Select Branch for Reservation
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Font, Spacing } from '@/constants/theme';
import { STORES } from '@/constants/stores';
import { useReservation } from '@/context/ReservationContext';
import { PressableCard } from '@/components/PressableCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ReservationSelectBranch() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setBranch, reset } = useReservation();

  const dineInBranches = STORES.filter(s => s.supportsDineIn);

  const handleSelect = (store: typeof STORES[0]) => {
    reset();
    setBranch(store);
    router.push('/reservation/select-time');
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Reservasi</Text>
        <View style={{ width: 36 }} />
      </View>

      <Text style={styles.subtitle}>Pilih lokasi untuk reservasi</Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {dineInBranches.map(store => (
          <PressableCard key={store.id} style={styles.branchCard} onPress={() => handleSelect(store)}>
            <View style={styles.branchIcon}>
              <Ionicons name="cafe" size={24} color={Colors.green} />
            </View>
            <View style={styles.branchInfo}>
              <Text style={styles.branchName}>{store.name}</Text>
              <Text style={styles.branchAddr} numberOfLines={2}>{store.addr}</Text>
              <View style={styles.branchMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={12} color={Colors.green} />
                  <Text style={styles.metaText}>{store.hours}</Text>
                </View>
                <View style={styles.dineInBadge}>
                  <Text style={styles.dineInText}>Dine-in</Text>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.brownLight} />
          </PressableCard>
        ))}

        {STORES.filter(s => !s.supportsDineIn).map(store => (
          <View key={store.id} style={[styles.branchCard, styles.branchDisabled]}>
            <View style={[styles.branchIcon, { backgroundColor: '#F0EBE4' }]}>
              <Ionicons name="cafe-outline" size={24} color={Colors.brownLight} />
            </View>
            <View style={styles.branchInfo}>
              <Text style={[styles.branchName, { color: Colors.brownLight }]}>{store.name}</Text>
              <Text style={styles.branchAddr}>{store.addr}</Text>
              <View style={styles.noReservBadge}>
                <Text style={styles.noReservText}>Tidak tersedia untuk reservasi</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xxl, marginBottom: 4 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  title: { fontFamily: Font.displayBold, fontSize: 22, color: Colors.text },
  subtitle: { fontFamily: Font.regular, fontSize: 14, color: Colors.textSoft, paddingHorizontal: Spacing.xxl, marginBottom: 20 },

  list: { paddingHorizontal: Spacing.xxl, paddingBottom: 40 },

  branchCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.white, borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  branchDisabled: { opacity: 0.5 },
  branchIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: Colors.greenPale, alignItems: 'center', justifyContent: 'center' },
  branchInfo: { flex: 1 },
  branchName: { fontFamily: Font.bold, fontSize: 15, color: Colors.text, marginBottom: 3 },
  branchAddr: { fontFamily: Font.regular, fontSize: 12, color: Colors.textSoft, lineHeight: 17, marginBottom: 6 },
  branchMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { fontFamily: Font.medium, fontSize: 11, color: Colors.green },
  dineInBadge: { backgroundColor: Colors.greenMint, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  dineInText: { fontFamily: Font.semibold, fontSize: 10, color: Colors.green },
  noReservBadge: { marginTop: 2 },
  noReservText: { fontFamily: Font.medium, fontSize: 11, color: Colors.brownLight },
});
