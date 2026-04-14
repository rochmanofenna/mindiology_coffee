// app/payment-methods.tsx — Metode Pembayaran
// Lists payment methods from ESB branch settings. Tap to set preferred default;
// cart reads this at checkout.
import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Font, Spacing, Radius } from '@/constants/theme';
import { useBranch } from '@/context/BranchContext';
import { storageGet, storageSet } from '@/utils/cache';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const PREFERRED_PAYMENT_KEY = 'pref:payment_method';

export default function PaymentMethodsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { paymentMethods, branch } = useBranch();
  const [preferredId, setPreferredId] = useState<string | null>(null);

  useEffect(() => {
    storageGet(PREFERRED_PAYMENT_KEY).then(setPreferredId);
  }, []);

  const select = async (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    setPreferredId(id);
    await storageSet(PREFERRED_PAYMENT_KEY, id);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Metode Pembayaran</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {branch?.branchName ? (
          <Text style={styles.sectionHint}>
            Tersedia di {branch.branchName}
          </Text>
        ) : null}

        {paymentMethods.length === 0 ? (
          <View style={styles.emptyWrap}>
            <View style={styles.iconCircle}>
              <Ionicons name="card-outline" size={32} color={Colors.green} />
            </View>
            <Text style={styles.emptyTitle}>Belum Ada Metode</Text>
            <Text style={styles.emptySubtitle}>
              Metode pembayaran akan muncul saat kamu memilih cabang.
            </Text>
          </View>
        ) : (
          paymentMethods.map((method) => {
            const isSelected = preferredId === method.id;
            return (
              <TouchableOpacity
                key={method.id}
                activeOpacity={0.7}
                onPress={() => select(method.id)}
                style={[styles.card, isSelected && styles.cardSelected]}
              >
                <View style={[styles.cardIcon, isSelected && styles.cardIconSelected]}>
                  <Ionicons name={method.icon as any} size={20} color={isSelected ? '#fff' : Colors.green} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardName}>{method.name}</Text>
                  {!method.available ? (
                    <Text style={styles.cardHint}>Mungkin tidak tersedia saat ini</Text>
                  ) : null}
                </View>
                {isSelected ? (
                  <View style={styles.checkCircle}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                ) : (
                  <View style={styles.emptyCircle} />
                )}
              </TouchableOpacity>
            );
          })
        )}

        <Text style={styles.footerNote}>
          Metode yang kamu pilih akan otomatis digunakan di halaman pembayaran. Kamu bisa mengubahnya kapan saja saat checkout.
        </Text>
      </ScrollView>
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

  body: { paddingHorizontal: Spacing.xxl, paddingTop: Spacing.md, paddingBottom: 40 },
  sectionHint: {
    fontFamily: Font.semibold, fontSize: 11, letterSpacing: 1,
    color: Colors.gold, textTransform: 'uppercase',
    marginBottom: Spacing.md,
  },

  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.sm + 2,
    gap: Spacing.md,
    borderWidth: 1.5, borderColor: 'transparent',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardSelected: {
    borderColor: Colors.green,
  },
  cardIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.greenMint, alignItems: 'center', justifyContent: 'center',
  },
  cardIconSelected: {
    backgroundColor: Colors.green,
  },
  cardBody: { flex: 1 },
  cardName: { fontFamily: Font.bold, fontSize: 15, color: Colors.text },
  cardHint: { fontFamily: Font.regular, fontSize: 11, color: Colors.textSoft, marginTop: 2 },

  checkCircle: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.green, alignItems: 'center', justifyContent: 'center',
  },
  emptyCircle: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 1.5, borderColor: '#E0D8C9',
  },

  emptyWrap: { alignItems: 'center', paddingTop: 60 },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.greenMint, alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontFamily: Font.displayBold, fontSize: 20, color: Colors.text, marginBottom: 8 },
  emptySubtitle: { fontFamily: Font.regular, fontSize: 13, color: Colors.textSoft, textAlign: 'center', paddingHorizontal: Spacing.xl },

  footerNote: {
    fontFamily: Font.regular, fontSize: 12, color: Colors.textSoft,
    marginTop: Spacing.xl, paddingHorizontal: Spacing.sm, lineHeight: 18, textAlign: 'center',
  },
});
