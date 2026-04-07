// app/coming-soon.tsx — Placeholder screen for upcoming features
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Font, Spacing } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ComingSoonScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { title } = useLocalSearchParams<{ title?: string }>();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title || 'Segera Hadir'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.iconCircle}>
          <Ionicons name="construct-outline" size={40} color={Colors.green} />
        </View>
        <Text style={styles.title}>Segera Hadir!</Text>
        <Text style={styles.subtitle}>
          Fitur ini sedang dalam pengembangan.{'\n'}Nantikan update terbaru dari Kamarasan.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.xxl, marginBottom: 4 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  headerTitle: { fontFamily: Font.displayBold, fontSize: 20, color: Colors.text },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxl, paddingBottom: 80 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.greenMint, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontFamily: Font.displayBold, fontSize: 22, color: Colors.text, marginBottom: 8 },
  subtitle: { fontFamily: Font.regular, fontSize: 14, color: Colors.textSoft, textAlign: 'center', lineHeight: 22 },
});
