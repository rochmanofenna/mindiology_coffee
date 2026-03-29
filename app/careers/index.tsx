// app/careers/index.tsx — Job Listings
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Font, Spacing } from '@/constants/theme';
import { PressableCard } from '@/components/PressableCard';
import { JOBS } from '@/constants/jobs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CareersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Karir</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="people" size={32} color={Colors.green} />
        </View>
        <Text style={styles.heroTitle}>Bergabung dengan Tim Kami</Text>
        <Text style={styles.heroDesc}>Kami mencari individu berbakat yang passionate tentang kopi, makanan, dan pelayanan terbaik.</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {JOBS.map(job => (
          <PressableCard key={job.id} style={styles.jobCard} onPress={() => router.push(`/careers/${job.id}`)}>
            <View style={styles.jobTop}>
              <View>
                <Text style={styles.jobTitle}>{job.title}</Text>
                <Text style={styles.jobBranch}>{job.branch}</Text>
              </View>
              <View style={[styles.typeBadge, job.type === 'part-time' && styles.typeBadgePT]}>
                <Text style={[styles.typeText, job.type === 'part-time' && styles.typeTextPT]}>
                  {job.type === 'full-time' ? 'Full-time' : 'Part-time'}
                </Text>
              </View>
            </View>
            <Text style={styles.jobDesc} numberOfLines={2}>{job.description}</Text>
            <View style={styles.jobFooter}>
              <Text style={styles.applyLink}>Lihat detail</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.green} />
            </View>
          </PressableCard>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xxl, marginBottom: 8 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  title: { fontFamily: Font.displayBold, fontSize: 22, color: Colors.text },

  hero: { alignItems: 'center', paddingHorizontal: Spacing.xxl, paddingVertical: 20 },
  heroIcon: { width: 64, height: 64, borderRadius: 20, backgroundColor: Colors.greenPale, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroTitle: { fontFamily: Font.display, fontSize: 20, color: Colors.text, marginBottom: 6, textAlign: 'center' },
  heroDesc: { fontFamily: Font.regular, fontSize: 13, color: Colors.textSoft, textAlign: 'center', lineHeight: 20 },

  list: { paddingHorizontal: Spacing.xxl, paddingBottom: 40 },

  jobCard: { backgroundColor: Colors.white, borderRadius: 16, padding: 18, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  jobTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  jobTitle: { fontFamily: Font.bold, fontSize: 16, color: Colors.text },
  jobBranch: { fontFamily: Font.regular, fontSize: 12, color: Colors.textSoft, marginTop: 2 },
  typeBadge: { backgroundColor: Colors.greenMint, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeBadgePT: { backgroundColor: Colors.parchment },
  typeText: { fontFamily: Font.semibold, fontSize: 11, color: Colors.green },
  typeTextPT: { color: Colors.brown },
  jobDesc: { fontFamily: Font.regular, fontSize: 13, color: Colors.textSoft, lineHeight: 19, marginBottom: 12 },
  jobFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  applyLink: { fontFamily: Font.semibold, fontSize: 13, color: Colors.green },
});
