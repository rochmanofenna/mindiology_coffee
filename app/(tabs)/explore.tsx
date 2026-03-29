// app/(tabs)/explore.tsx — Explore / Discovery Tab
import { useState, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Image, ImageBackground, Dimensions, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Font, Spacing, fmtPrice } from '@/constants/theme';
import { useBranch } from '@/context/BranchContext';
import { useCart } from '@/context/CartContext';
import { STORES } from '@/constants/stores';
import { PressableCard } from '@/components/PressableCard';
import { SectionHeader } from '@/components/SectionHeader';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = (SCREEN_W - 60) / 2;

const FILTERS = ['Semua', 'Terbaru', 'Reservasi', 'Promo', 'Menu'] as const;

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { addToCart } = useCart();
  const { loading, error, allItems, tabGroups, menu, reload } = useBranch();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('Semua');
  const [refreshing, setRefreshing] = useState(false);

  // --- Pull to refresh ---
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  // --- Search ---
  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return allItems.filter(
      i => i.name.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q),
    );
  }, [search, allItems]);

  // --- Menu highlights (rec items, fallback to items with images) ---
  const highlightItems = useMemo(() => {
    const recs = allItems.filter(i => i.rec);
    if (recs.length > 0) return recs.slice(0, 6);
    return allItems.filter(i => i.imageUrl).slice(0, 6);
  }, [allItems]);

  // --- Promo image helpers ---
  const drinkImage = useMemo(() => {
    const drinkCatKey = Object.keys(menu).find(
      k => k.toLowerCase().includes('drink')
        || k.toLowerCase().includes('jui')
        || k.toLowerCase().includes('sof'),
    );
    if (drinkCatKey) {
      const catItems = menu[drinkCatKey]?.items ?? [];
      const found = catItems.find(i => i.imageUrl);
      if (found) return found.imageUrl;
    }
    return allItems.find(i => i.imageUrl)?.imageUrl ?? '';
  }, [menu, allItems]);

  const foodImage = useMemo(() => {
    const foodCatKey = Object.keys(menu).find(
      k => k.toLowerCase().includes('main')
        || k.toLowerCase().includes('nasi')
        || k.toLowerCase().includes('app'),
    );
    if (foodCatKey) {
      const catItems = menu[foodCatKey]?.items ?? [];
      const found = catItems.find(i => i.imageUrl);
      if (found) return found.imageUrl;
    }
    // fallback: second item with image, or first
    const withImg = allItems.filter(i => i.imageUrl);
    return (withImg[1] ?? withImg[0])?.imageUrl ?? '';
  }, [menu, allItems]);

  // --- Filter: Terbaru (last 12 reversed) ---
  const terbaruItems = useMemo(
    () => [...allItems].reverse().slice(0, 12),
    [allItems],
  );

  // --- Filter: Menu (all items with images) ---
  const menuGridItems = useMemo(
    () => allItems.filter(i => i.imageUrl),
    [allItems],
  );

  // --- Filter handling ---
  const handleFilterPress = (filter: string) => {
    if (filter === 'Reservasi') {
      router.push('/reservation' as any);
      return;
    }
    setActiveFilter(filter);
  };

  // --- Promo data ---
  const promos = [
    { title: 'Happy Hour', desc: 'Diskon 30% kopi 14:00-16:00', image: drinkImage },
    { title: 'Family Bundle', desc: '4 nasi + 4 minuman Rp 150.000', image: foodImage },
  ];

  // ==================== Render helpers ====================

  const renderItemCard = (item: typeof allItems[0], badge?: string) => (
    <PressableCard
      key={item.id}
      style={styles.gridCard}
      onPress={() => router.push(`/item/${item.id}`)}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.gridImage} />
      ) : (
        <View style={[styles.gridImage, styles.gridImagePlaceholder]}>
          <Ionicons name="restaurant-outline" size={28} color={Colors.greenLight} />
        </View>
      )}
      {badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <View style={styles.gridInfo}>
        <Text style={styles.gridName} numberOfLines={2}>{item.name}</Text>
        <View style={styles.gridBottom}>
          <Text style={styles.gridPrice}>{fmtPrice(item.price)}</Text>
          <TouchableOpacity
            style={styles.miniAdd}
            onPress={() => addToCart(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={14} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </PressableCard>
  );

  const renderPromoCards = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.promoScroll}
    >
      {promos.map((p, i) => (
        <View key={i} style={styles.promoCard}>
          <ImageBackground
            source={{ uri: p.image }}
            style={styles.promoBackground}
            imageStyle={{ borderRadius: 16 }}
          >
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.65)']}
              style={styles.promoGradient}
            >
              <Text style={styles.promoTitle}>{p.title}</Text>
              <Text style={styles.promoDesc}>{p.desc}</Text>
            </LinearGradient>
          </ImageBackground>
        </View>
      ))}
    </ScrollView>
  );

  const renderLocations = () => (
    <View>
      {STORES.map(store => {
        const thumbUrl = allItems.find(i => i.imageUrl)?.imageUrl;
        return (
          <PressableCard key={store.id} style={styles.storeCard}>
            {thumbUrl ? (
              <Image source={{ uri: thumbUrl }} style={styles.storeThumbnail} />
            ) : (
              <View style={[styles.storeThumbnail, styles.storeIconFallback]}>
                <Ionicons name="cafe" size={22} color={Colors.green} />
              </View>
            )}
            <View style={styles.storeInfo}>
              <Text style={styles.storeName}>{store.name}</Text>
              <Text style={styles.storeAddr} numberOfLines={1}>{store.addr}</Text>
              <Text style={styles.storeHours}>{store.hours} WIB</Text>
            </View>
            <TouchableOpacity
              style={styles.storeNav}
              onPress={() => {}}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-forward" size={16} color="#fff" />
            </TouchableOpacity>
          </PressableCard>
        );
      })}
    </View>
  );

  const renderCategoryPills = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.categoryScroll}
    >
      {tabGroups.map(tg => (
        <TouchableOpacity
          key={tg.key}
          style={styles.categoryPill}
          onPress={() => router.push('/menu' as any)}
          activeOpacity={0.7}
        >
          <Text style={styles.categoryIcon}>{tg.icon}</Text>
          <Text style={styles.categoryLabel}>{tg.label}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // ==================== Main render ====================

  // --- Loading state ---
  if (loading && allItems.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.title}>Explore</Text>
        </View>
        <SkeletonLoader variant="card" count={4} style={{ paddingHorizontal: Spacing.xxl }} />
      </View>
    );
  }

  // --- Error state ---
  if (error && allItems.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.title}>Explore</Text>
        </View>
        <View style={styles.errorCard}>
          <Ionicons name="cloud-offline-outline" size={40} color={Colors.textSoft} />
          <Text style={styles.errorText}>Gagal memuat data</Text>
          <Text style={styles.errorSub}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={reload} activeOpacity={0.7}>
            <Text style={styles.retryText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>Explore</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={Colors.textSoft} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Cari menu, promo, lokasi..."
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

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
            onPress={() => handleFilterPress(f)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Scrollable content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.green}
            colors={[Colors.green]}
          />
        }
      >
        {/* ===== Search results mode ===== */}
        {searchResults ? (
          <View style={styles.section}>
            <Text style={styles.resultCount}>
              {searchResults.length} hasil untuk &quot;{search}&quot;
            </Text>
            {searchResults.slice(0, 20).map(item => (
              <PressableCard
                key={item.id}
                style={styles.searchCard}
                onPress={() => router.push(`/item/${item.id}`)}
              >
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.searchImage} />
                ) : (
                  <View style={[styles.searchImage, styles.searchImagePlaceholder]}>
                    <Ionicons name="restaurant-outline" size={20} color={Colors.greenLight} />
                  </View>
                )}
                <View style={styles.searchInfo}>
                  <Text style={styles.searchName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.searchDesc} numberOfLines={1}>{item.desc}</Text>
                </View>
                <Text style={styles.searchPrice}>{fmtPrice(item.price)}</Text>
              </PressableCard>
            ))}
          </View>
        ) : (
          <>
            {/* ===== Filter: Semua ===== */}
            {activeFilter === 'Semua' && (
              <>
                {/* Menu Highlights — 2-column grid */}
                <View style={styles.section}>
                  <SectionHeader
                    title="Menu Highlights"
                    onSeeAll={() => router.push('/menu' as any)}
                  />
                  {loading ? (
                    <SkeletonLoader variant="card" count={4} style={{ paddingHorizontal: 0 }} />
                  ) : (
                    <View style={styles.grid}>
                      {highlightItems.map(item => renderItemCard(item))}
                    </View>
                  )}
                </View>

                {/* Promo Aktif */}
                <View style={styles.section}>
                  <SectionHeader title="Promo Aktif" />
                  {renderPromoCards()}
                </View>

                {/* Lokasi Kami */}
                <View style={styles.section}>
                  <SectionHeader title="Lokasi Kami" />
                  {renderLocations()}
                </View>

                {/* Kategori Menu */}
                <View style={styles.section}>
                  <SectionHeader
                    title="Kategori"
                    onSeeAll={() => router.push('/menu' as any)}
                  />
                  {renderCategoryPills()}
                </View>
              </>
            )}

            {/* ===== Filter: Menu — full grid of all items with images ===== */}
            {activeFilter === 'Menu' && (
              <View style={styles.section}>
                <SectionHeader
                  title="Semua Menu"
                  onSeeAll={() => router.push('/menu' as any)}
                />
                <View style={styles.grid}>
                  {menuGridItems.map(item => renderItemCard(item))}
                </View>
              </View>
            )}

            {/* ===== Filter: Promo ===== */}
            {activeFilter === 'Promo' && (
              <View style={styles.section}>
                <SectionHeader title="Promo Aktif" />
                {renderPromoCards()}
              </View>
            )}

            {/* ===== Filter: Terbaru ===== */}
            {activeFilter === 'Terbaru' && (
              <View style={styles.section}>
                <SectionHeader title="Terbaru" />
                <View style={styles.grid}>
                  {terbaruItems.map(item => renderItemCard(item, 'Baru'))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ==================== Styles ====================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },

  // Header
  header: {
    paddingHorizontal: Spacing.xxl,
  },
  title: {
    fontFamily: Font.displayBold,
    fontSize: 22,
    color: Colors.text,
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8E0D8',
  },
  searchInput: {
    flex: 1,
    fontFamily: Font.regular,
    fontSize: 14,
    color: Colors.text,
  },

  // Filter chips
  filterRow: {
    gap: 8,
    paddingHorizontal: Spacing.xxl,
    marginBottom: 20,
  },
  filterChip: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#E0D5C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  filterText: {
    fontFamily: Font.semibold,
    fontSize: 13,
    color: Colors.text,
  },
  filterTextActive: {
    color: '#fff',
  },

  // Sections
  section: {
    paddingHorizontal: Spacing.xxl,
    marginBottom: 28,
  },
  resultCount: {
    fontFamily: Font.regular,
    fontSize: 12,
    color: Colors.textSoft,
    marginBottom: 12,
  },

  // Search results
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  searchImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
  },
  searchImagePlaceholder: {
    backgroundColor: '#E8F0E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInfo: { flex: 1 },
  searchName: {
    fontFamily: Font.semibold,
    fontSize: 14,
    color: Colors.text,
  },
  searchDesc: {
    fontFamily: Font.regular,
    fontSize: 11,
    color: Colors.textSoft,
    marginTop: 2,
  },
  searchPrice: {
    fontFamily: Font.bold,
    fontSize: 14,
    color: Colors.green,
  },

  // 2-column grid
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    width: CARD_W,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: Colors.white,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  gridImage: {
    width: CARD_W,
    height: CARD_W,
    resizeMode: 'cover',
  },
  gridImagePlaceholder: {
    backgroundColor: '#E8F0E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridInfo: {
    padding: 10,
  },
  gridName: {
    fontFamily: Font.semibold,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 17,
    marginBottom: 6,
  },
  gridBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridPrice: {
    fontFamily: Font.bold,
    fontSize: 14,
    color: Colors.green,
  },
  miniAdd: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Badge
  badge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.green,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontFamily: Font.bold,
    fontSize: 10,
    color: '#fff',
  },

  // Promo cards
  promoScroll: {
    gap: 12,
    paddingRight: 4,
  },
  promoCard: {
    width: 280,
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
  },
  promoBackground: {
    width: '100%',
    height: '100%',
  },
  promoGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
    borderRadius: 16,
  },
  promoTitle: {
    fontFamily: Font.bold,
    fontSize: 18,
    color: '#fff',
    marginBottom: 4,
  },
  promoDesc: {
    fontFamily: Font.regular,
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
  },

  // Store / location cards
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#D4A843',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  storeThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  storeIconFallback: {
    backgroundColor: Colors.greenPale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontFamily: Font.bold,
    fontSize: 13,
    color: Colors.text,
  },
  storeAddr: {
    fontFamily: Font.regular,
    fontSize: 11,
    color: Colors.textSoft,
    marginTop: 2,
  },
  storeHours: {
    fontFamily: Font.regular,
    fontSize: 11,
    color: Colors.green,
    marginTop: 2,
  },
  storeNav: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Category pills
  categoryScroll: {
    gap: 10,
    paddingRight: 4,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E8E0D8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryLabel: {
    fontFamily: Font.semibold,
    fontSize: 13,
    color: Colors.text,
  },

  // Error state
  errorCard: {
    margin: Spacing.xxl,
    padding: 32,
    backgroundColor: Colors.white,
    borderRadius: 16,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  errorText: {
    fontFamily: Font.bold,
    fontSize: 16,
    color: Colors.text,
  },
  errorSub: {
    fontFamily: Font.regular,
    fontSize: 13,
    color: Colors.textSoft,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: Colors.green,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryText: {
    fontFamily: Font.bold,
    fontSize: 14,
    color: '#fff',
  },
});
