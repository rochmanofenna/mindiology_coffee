// components/MenuItemRow.tsx — Menu item card with image, info, price, add button
import { useRef } from 'react';
import { View, Text, TouchableOpacity, Image, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Font, Radius, Shadow } from '@/constants/theme';
import { titleCase } from '@/utils/formatting';
import type { AppMenuItem } from '@/services/api';

interface Props {
  item: AppMenuItem;
  onTap: () => void;
  onAdd: () => void;
  fmtPrice: (p: number) => string;
}

export function MenuItemRow({ item, onTap, onAdd, fmtPrice }: Props) {
  const cardScale = useRef(new Animated.Value(1)).current;
  const addScale = useRef(new Animated.Value(1)).current;
  const hasImage = !!item.imageUrl;

  const handleAdd = (e: any) => {
    e.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.sequence([
      Animated.spring(addScale, { toValue: 0.88, useNativeDriver: true, speed: 60, bounciness: 0 }),
      Animated.spring(addScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 10 }),
    ]).start();
    onAdd();
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={() => Animated.spring(cardScale, { toValue: 0.98, useNativeDriver: true, speed: 50, bounciness: 4 }).start()}
      onPressOut={() => Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start()}
      onPress={onTap}
    >
      <Animated.View style={[styles.row, item.soldOut && styles.soldOut, { transform: [{ scale: cardScale }] }]}>
        <View style={styles.imageWrap}>
          {hasImage ? (
            <Image source={{ uri: item.imageUrl }} style={styles.image} />
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name="cafe-outline" size={24} color={Colors.green} />
            </View>
          )}
        </View>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {titleCase(item.name)}
            </Text>
            {item.spicy && <Text style={{ fontSize: 11 }}>🌶</Text>}
          </View>
          {item.rec && (
            <View style={styles.chefBadge}>
              <Text style={styles.chefText}>CHEF PICK</Text>
            </View>
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
            <Animated.View style={{ transform: [{ scale: addScale }] }}>
              <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.85}>
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0E6D2',
    ...Shadow.card,
  },
  soldOut: { opacity: 0.5 },
  // aspect-square image container with cream fallback
  imageWrap: {
    width: 84,
    height: 84,
    borderRadius: Radius.sm + 2,
    overflow: 'hidden',
    backgroundColor: Colors.parchment,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  name: { fontFamily: Font.semibold, fontSize: 15, color: Colors.text, flexShrink: 1, letterSpacing: -0.1 },
  chefBadge: { backgroundColor: Colors.greenMint, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5, alignSelf: 'flex-start', marginBottom: 3 },
  chefText: { fontFamily: Font.extrabold, fontSize: 8, color: Colors.green, letterSpacing: 0.5 },
  desc: { fontFamily: Font.regular, fontSize: 12, color: Colors.textSoft, lineHeight: 16 },
  right: { alignItems: 'flex-end', gap: 8 },
  price: { fontFamily: Font.bold, fontSize: 15, color: Colors.greenForest, letterSpacing: -0.2 },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  habisBadge: { backgroundColor: Colors.hibiscusLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  habisText: { fontFamily: Font.bold, fontSize: 10, color: Colors.hibiscus },
});
