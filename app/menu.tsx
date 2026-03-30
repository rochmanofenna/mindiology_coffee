// app/menu.tsx — Menu Screen (standalone stack screen, accessed via center button)
import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, FlatList, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Font, Spacing, fmtPrice } from '@/constants/theme';
import { useBranch } from '@/context/BranchContext';
import { useCart } from '@/context/CartContext';
import { MenuItemRow } from '@/components/MenuItemRow';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addToCart, cartCount, subtotal } = useCart();
  const { loading, error, reload, tabGroups, menu, allItems } = useBranch();
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [activeSub, setActiveSub] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const effectiveGroup = activeGroup || (tabGroups.length > 0 ? tabGroups[0].key : null);
  const group = tabGroups.find(g => g.key === effectiveGroup);
  const categories = group ? group.categories.map(k => ({ key: k, ...menu[k] })).filter(c => c.items) : [];
  const currentCat = activeSub ? categories.find(c => c.key === activeSub) : null;

  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return allItems.filter(i => i.name.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q));
  }, [search, allItems]);

  return (
    <View style={styles.container}>
      {/* Header with back button */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={22} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Menu</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={Colors.textSoft} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Cari menu..."
            placeholderTextColor={Colors.textSoft}
            style={styles.searchInput}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textSoft} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <SkeletonLoader count={5} height={90} style={{ paddingHorizontal: Spacing.xxl }} />
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={40} color={Colors.hibiscus} />
            <Text style={styles.errorText}>Tidak bisa memuat data</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => reload()}>
              <Text style={styles.retryBtnText}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : searchResults ? (
        <FlatList
          data={searchResults}
          keyExtractor={item => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          renderItem={({ item }) => (
            <MenuItemRow
              item={item}
              onTap={() => router.push(`/item/${item.id}`)}
              onAdd={() => addToCart(item)}
              fmtPrice={fmtPrice}
            />
          )}
          ListHeaderComponent={
            <Text style={styles.searchCount}>{searchResults.length} hasil untuk "{search}"</Text>
          }
          contentContainerStyle={[styles.listContent, cartCount > 0 && { paddingBottom: 160 }]}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{ paddingBottom: cartCount > 0 ? 160 : 40 }}>
          {/* Tab Group Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
            {tabGroups.map(g => (
              <TouchableOpacity
                key={g.key}
                style={[styles.tabChip, effectiveGroup === g.key && styles.tabChipActive]}
                onPress={() => { setActiveGroup(g.key); setActiveSub(null); }}
              >
                <Text style={[styles.tabChipText, effectiveGroup === g.key && styles.tabChipTextActive]}>
                  {g.icon} {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {!activeSub ? (
            <View style={styles.catList}>
              {categories.map((cat, i) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[styles.catCard, i < categories.length - 1 && styles.catCardBorder]}
                  activeOpacity={0.6}
                  onPress={() => setActiveSub(cat.key)}
                >
                  {cat.firstImageUrl ? (
                    <Image source={{ uri: cat.firstImageUrl }} style={styles.catThumb} />
                  ) : (
                    <View style={styles.catIcon}>
                      <Text style={{ fontSize: 26 }}>{cat.emoji}</Text>
                    </View>
                  )}
                  <View style={styles.catInfo}>
                    <Text style={styles.catName}>{cat.label}</Text>
                    <Text style={styles.catCount}>{cat.items.length} item</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Colors.brownLight} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.catList}>
              <TouchableOpacity style={styles.catBackBtn} onPress={() => setActiveSub(null)}>
                <Ionicons name="chevron-back" size={18} color={Colors.green} />
                <Text style={styles.catBackText}>{currentCat?.label}</Text>
                <Text style={styles.catBackCount}>{currentCat?.items.length} item</Text>
              </TouchableOpacity>
              {currentCat?.items.map(item => (
                <MenuItemRow
                  key={item.id}
                  item={item}
                  onTap={() => router.push(`/item/${item.id}`)}
                  onAdd={() => addToCart(item)}
                  fmtPrice={fmtPrice}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Floating Cart Bar */}
      {cartCount > 0 && (
        <TouchableOpacity style={styles.cartBar} activeOpacity={0.9} onPress={() => router.push('/cart' as any)}>
          <View style={styles.cartBarLeft}>
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
            <Text style={styles.cartBarLabel}>Lihat Keranjang</Text>
          </View>
          <Text style={styles.cartBarPrice}>{fmtPrice(subtotal)}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  header: { paddingHorizontal: Spacing.xxl },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  title: { fontFamily: Font.displayBold, fontSize: 22, color: Colors.text },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.white, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 14, borderWidth: 1, borderColor: '#E8E0D8' },
  searchInput: { flex: 1, fontFamily: Font.regular, fontSize: 14, color: Colors.text },
  searchCount: { fontFamily: Font.regular, fontSize: 12, color: Colors.textSoft, marginBottom: 10, paddingHorizontal: Spacing.xxl },
  listContent: { paddingHorizontal: Spacing.xxl, paddingBottom: 40 },

  tabRow: { gap: 8, paddingHorizontal: Spacing.xxl, marginBottom: 16 },
  tabChip: { height: 38, paddingHorizontal: 16, borderRadius: 19, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#E0D5C7', alignItems: 'center', justifyContent: 'center' },
  tabChipActive: { backgroundColor: Colors.green, borderColor: Colors.green, shadowColor: Colors.green, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 },
  tabChipText: { fontFamily: Font.semibold, fontSize: 13, color: Colors.brown },
  tabChipTextActive: { color: '#fff' },

  catList: { paddingHorizontal: Spacing.xxl },
  catCard: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  catCardBorder: { borderBottomWidth: 1, borderBottomColor: '#F0EBE4' },
  catIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E8F0E4', alignItems: 'center', justifyContent: 'center' },
  catThumb: { width: 56, height: 56, borderRadius: 16, overflow: 'hidden' as const, backgroundColor: '#E8F0E4' },
  catInfo: { flex: 1 },
  catName: { fontFamily: Font.bold, fontSize: 16, color: Colors.text },
  catCount: { fontFamily: Font.regular, fontSize: 13, color: Colors.textSoft, marginTop: 2 },
  catBackBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16, paddingVertical: 4 },
  catBackText: { fontFamily: Font.bold, fontSize: 16, color: Colors.green },
  catBackCount: { fontFamily: Font.regular, fontSize: 13, color: Colors.textSoft, marginLeft: 8 },

  errorCard: { backgroundColor: Colors.white, borderRadius: 20, paddingVertical: 32, paddingHorizontal: 28, alignItems: 'center' as const, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  errorText: { fontFamily: Font.semibold, fontSize: 16, color: Colors.text, textAlign: 'center' as const },
  retryBtn: { marginTop: 4, backgroundColor: Colors.green, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 28 },
  retryBtnText: { fontFamily: Font.bold, fontSize: 14, color: '#fff' },

  // Floating cart bar
  cartBar: { position: 'absolute', bottom: 30, left: Spacing.xxl, right: Spacing.xxl, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.green, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20, shadowColor: Colors.green, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
  cartBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cartBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  cartBadgeText: { fontFamily: Font.bold, fontSize: 12, color: '#fff' },
  cartBarLabel: { fontFamily: Font.bold, fontSize: 15, color: '#fff' },
  cartBarPrice: { fontFamily: Font.extrabold, fontSize: 16, color: '#fff' },
});
