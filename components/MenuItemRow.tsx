// components/MenuItemRow.tsx — Menu item card with image, info, price, add button
import { useRef } from 'react';
import { View, Text, TouchableOpacity, Image, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Font } from '@/constants/theme';
import type { AppMenuItem } from '@/services/api';

interface Props {
  item: AppMenuItem;
  onTap: () => void;
  onAdd: () => void;
  fmtPrice: (p: number) => string;
}

export function MenuItemRow({ item, onTap, onAdd, fmtPrice }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const hasImage = !!item.imageUrl;

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start()}
      onPress={onTap}
    >
      <Animated.View style={[styles.row, item.soldOut && styles.soldOut, { transform: [{ scale }] }]}>
        {hasImage ? (
          <Image source={{ uri: item.imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.placeholder}>
            <Text style={{ fontSize: 28 }}>🍽</Text>
          </View>
        )}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            {item.spicy && <Text style={{ fontSize: 11 }}>🌶</Text>}
          </View>
          {item.rec && (
            <View style={styles.chefBadge}><Text style={styles.chefText}>CHEF PICK</Text></View>
          )}
          <Text style={styles.desc} numberOfLines={2}>{item.desc}</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.price}>{fmtPrice(item.price)}</Text>
          {item.soldOut ? (
            <View style={styles.habisBadge}>
              <Text style={styles.habisText}>Habis</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.addBtn} onPress={(e) => { e.stopPropagation(); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); onAdd(); }}>
              <Ionicons name="add" size={18} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.white, borderRadius: 16, padding: 10, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  soldOut: { opacity: 0.5 },
  image: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#E8F0E4' },
  placeholder: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#E8F0E4', alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  name: { fontFamily: Font.semibold, fontSize: 15, color: Colors.text, flexShrink: 1 },
  chefBadge: { backgroundColor: Colors.greenMint, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, alignSelf: 'flex-start', marginBottom: 2 },
  chefText: { fontFamily: Font.extrabold, fontSize: 8, color: Colors.green, letterSpacing: 0.5 },
  desc: { fontFamily: Font.regular, fontSize: 12, color: Colors.textSoft, lineHeight: 16 },
  right: { alignItems: 'flex-end', gap: 6 },
  price: { fontFamily: Font.bold, fontSize: 16, color: Colors.greenForest },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.green, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.green, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
  habisBadge: { backgroundColor: Colors.hibiscusLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  habisText: { fontFamily: Font.bold, fontSize: 10, color: Colors.hibiscus },
});
