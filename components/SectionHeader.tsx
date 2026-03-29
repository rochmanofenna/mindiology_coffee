// components/SectionHeader.tsx — Section title + optional "Lihat semua" link
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Font } from '@/constants/theme';

interface Props {
  title: string;
  onSeeAll?: () => void;
  seeAllText?: string;
}

export function SectionHeader({ title, onSeeAll, seeAllText = 'Lihat semua' }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll}>
          <Text style={styles.link}>{seeAllText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { fontFamily: Font.displayBold, fontSize: 22, color: Colors.text },
  link: { fontFamily: Font.semibold, fontSize: 14, color: '#D4A843' },
});
