// app/(tabs)/index.tsx — Home Screen (ISMAYA-inspired redesign — polished)
import { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Image,
  Animated, Dimensions, Linking, ImageBackground, RefreshControl,
  Modal, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Font, Spacing, Radius, Shadow, fmtPrice } from '@/constants/theme';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useBranch } from '@/context/BranchContext';
import { useOrder } from '@/context/OrderContext';
import { STORES } from '@/constants/stores';
import { PressableCard } from '@/components/PressableCard';
import { SectionHeader } from '@/components/SectionHeader';
import { BranchBottomSheet } from '@/components/BranchBottomSheet';
import { SkeletonLoader } from '@/components/SkeletonLoader';
import { titleCase } from '@/utils/formatting';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_W } = Dimensions.get('window');
const BANNER_W = SCREEN_W - 48;
const BANNER_H = 150;
const SECTION_COUNT = 8;

// Placeholder promos
const PROMOS = [
  { id: '1', title: 'Gratis Kopi Setiap Jumat', subtitle: 'Min. pembelian Rp 50.000', colors: ['#1B4332', '#2D6A4F'] as const },
  { id: '2', title: 'Diskon 20% Member Baru', subtitle: 'Daftar sekarang & nikmati', colors: ['#5C3D2E', '#8B6B56'] as const },
  { id: '3', title: 'Beli 2 Gratis 1', subtitle: 'Es tradisional favorit', colors: ['#0E3A24', '#1B5E3B'] as const },
];

const WEEKLY_PROMOS = [
  { id: 'w1', title: 'Happy Hour', desc: 'Diskon 30% kopi 14:00-16:00', color: '#2D6A4F' },
  { id: 'w2', title: 'Family Bundle', desc: '4 nasi + 4 minuman Rp 150.000', color: '#5C3D2E' },
  { id: 'w3', title: 'Ramadan Special', desc: 'Paket buka puasa Rp 35.000', color: '#1B4332' },
];

function RecCard({ item, onTap, onAdd }: { item: any; onTap: () => void; onAdd: () => void }) {
  const hasImage = !!item.imageUrl;
  const addScale = useRef(new Animated.Value(1)).current;

  const handleAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Animated.sequence([
      Animated.spring(addScale, { toValue: 0.88, useNativeDriver: true, speed: 60, bounciness: 0 }),
      Animated.spring(addScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 10 }),
    ]).start();
    onAdd();
  };

  return (
    <PressableCard style={styles.recCard} onPress={onTap} haptic>
      <View style={styles.recImageWrap}>
        {hasImage ? (
          <Image source={{ uri: item.imageUrl }} style={styles.recImage} />
        ) : (
          <View style={styles.recPlaceholder}>
            <Ionicons name="cafe-outline" size={32} color={Colors.green} />
          </View>
        )}
        {item.rec && (
          <View style={styles.recChefBadge}>
            <Text style={styles.recChefText}>CHEF PICK</Text>
          </View>
        )}
      </View>
      <View style={styles.recInfo}>
        <Text style={styles.recName} numberOfLines={2}>{titleCase(item.name)}</Text>
        <View style={styles.recBottom}>
          <Text style={styles.recPrice}>{fmtPrice(item.price)}</Text>
          <Animated.View style={{ transform: [{ scale: addScale }] }}>
            <TouchableOpacity style={styles.recAddBtn} onPress={handleAdd} activeOpacity={0.85}>
              <Ionicons name="add" size={18} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </PressableCard>
  );
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, updateName } = useAuth();
  const { activeOrders } = useOrder();
  const { addToCart } = useCart();
  const { loading, error, allItems, branch, menu, reload, setBranchCode, currentBranchCode } = useBranch();

  const points = user?.points || 0;

  // Rec items with fallback
  const rawRecs = allItems.filter(i => i.rec);
  const recs = rawRecs.length > 0 ? rawRecs.slice(0, 8) : allItems.filter(i => i.imageUrl).slice(0, 8);

  // Banner images from menu items
  const bannerImages = allItems.filter(i => i.imageUrl).slice(0, 3);

  // Weekly promo images
  const weeklyImages = allItems.filter(i => i.imageUrl);

  // Store thumbnails — distinct image per branch
  const storeImages = allItems.filter(i => i.imageUrl);

  const tier = points >= 500 ? 'Emas' : points >= 200 ? 'Perak' : 'Perunggu';
  const tierEmoji = tier === 'Emas' ? '🥇' : tier === 'Perak' ? '🥈' : '🥉';

  // Branch bottom sheet
  const [showBranchSheet, setShowBranchSheet] = useState(false);

  // Name prompt — show once when name equals phone (ESB OTP doesn't return name)
  const needsName = !!user && user.name === user.phone;
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [nameInput, setNameInput] = useState('');
  useEffect(() => {
    if (needsName) setShowNamePrompt(true);
  }, [needsName]);

  const handleNameSubmit = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    await updateName(trimmed);
    setShowNamePrompt(false);
  };

  // Pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }, [reload]);

  // Promo carousel
  const [activePromo, setActivePromo] = useState(0);
  const activePromoRef = useRef(activePromo);
  activePromoRef.current = activePromo;
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    const timer = setInterval(() => {
      const next = (activePromoRef.current + 1) % PROMOS.length;
      scrollRef.current?.scrollTo({ x: next * (BANNER_W + 12), animated: true });
      setActivePromo(next);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // ---------- Staggered entry animations (P7) ----------
  const sectionOpacities = useRef(
    Array.from({ length: SECTION_COUNT }, () => new Animated.Value(0))
  ).current;
  const sectionTranslateYs = useRef(
    Array.from({ length: SECTION_COUNT }, () => new Animated.Value(20))
  ).current;

  useEffect(() => {
    if (!loading) {
      Animated.stagger(
        100,
        sectionOpacities.map((_, i) =>
          Animated.parallel([
            Animated.timing(sectionOpacities[i], { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(sectionTranslateYs[i], { toValue: 0, duration: 400, useNativeDriver: true }),
          ])
        )
      ).start();
    }
  }, [loading]);

  // ---------- Secondary action stagger (P13) ----------
  const secOpacities = useRef(
    Array.from({ length: 3 }, () => new Animated.Value(0))
  ).current;
  const secTranslateYs = useRef(
    Array.from({ length: 3 }, () => new Animated.Value(15))
  ).current;

  useEffect(() => {
    if (!loading) {
      Animated.stagger(
        80,
        secOpacities.map((_, i) =>
          Animated.parallel([
            Animated.timing(secOpacities[i], { toValue: 1, duration: 350, useNativeDriver: true }),
            Animated.timing(secTranslateYs[i], { toValue: 0, duration: 350, useNativeDriver: true }),
          ])
        )
      ).start();
    }
  }, [loading]);

  // ---------- Badge pulse animation (P13) ----------
  const badgeScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(badgeScale, { toValue: 1.2, duration: 1500, useNativeDriver: true }),
        Animated.timing(badgeScale, { toValue: 1.0, duration: 1500, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  // ---------- Skeleton pulse ----------
  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    if (!loading) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [loading]);

  // Helper to wrap section in staggered Animated.View
  const animSection = (index: number, children: React.ReactNode) => (
    <Animated.View
      style={{
        opacity: sectionOpacities[index],
        transform: [{ translateY: sectionTranslateYs[index] }],
      }}
    >
      {children}
    </Animated.View>
  );

  // ---------- Error State (P10) ----------
  if (error && allItems.length === 0) {
    return (
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.errorContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.green} colors={[Colors.green]} />
        }
      >
        <View style={styles.errorCard}>
          <Ionicons name="cloud-offline-outline" size={48} color={Colors.textSoft} />
          <Text style={styles.errorTitle}>Oops, terjadi kesalahan</Text>
          <Text style={styles.errorDesc}>{error}</Text>
          <TouchableOpacity style={styles.errorRetryBtn} onPress={handleRefresh}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.errorRetryText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  const branchDisplayName = STORES.find(s => s.branchCode === currentBranchCode)?.shortName || branch?.branchName || 'Mindiology';

  const SECONDARY_ACTIONS = [
    { icon: 'pricetag-outline' as const, label: 'Voucher', badge: 0, onPress: () => router.push('/menu' as any) },
    { icon: 'flame-outline' as const, label: 'Daily Special', badge: 0, onPress: () => router.push('/menu' as any) },
    { icon: 'receipt-outline' as const, label: 'Riwayat', badge: activeOrders.length, onPress: () => router.push('/(tabs)/order' as any) },
  ];

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.green} colors={[Colors.green]} />
      }
    >
      {/* ====== Section 0: Header ====== */}
      {animSection(0,
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <View style={styles.headerLeft}>
            <Text style={styles.brandTitle}>Mindiology</Text>
            <TouchableOpacity style={styles.branchRow} onPress={() => setShowBranchSheet(true)}>
              <Ionicons name="location" size={12} color={Colors.green} />
              <Text style={styles.branchName}>{branchDisplayName}</Text>
              <Ionicons name="chevron-down" size={12} color={Colors.textSoft} />
            </TouchableOpacity>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerIcon} onPress={() => router.push('/barcode' as any)}>
              <Ionicons name="barcode-outline" size={22} color={Colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ====== Section 1: Promo Banner Carousel ====== */}
      {animSection(1,
        <View style={styles.bannerWrap}>
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={BANNER_W + 12}
            decelerationRate="fast"
            contentContainerStyle={{ gap: 12, paddingHorizontal: Spacing.xxl }}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / (BANNER_W + 12));
              setActivePromo(idx);
            }}
          >
            {PROMOS.map((promo, idx) => {
              if (bannerImages.length >= 3) {
                return (
                  <View key={promo.id} style={styles.bannerCardOuter}>
                    <ImageBackground
                      source={{ uri: bannerImages[idx]?.imageUrl }}
                      style={styles.bannerCard}
                      imageStyle={{ borderRadius: 16 }}
                    >
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.65)']}
                        style={styles.bannerOverlay}
                      >
                        <Text style={styles.bannerTitle}>{promo.title}</Text>
                        <Text style={styles.bannerSub}>{promo.subtitle}</Text>
                      </LinearGradient>
                      {/* Dots inside banner */}
                      <View style={styles.dotsInner}>
                        {PROMOS.map((_, i) => (
                          <View key={i} style={[styles.dot, activePromo === i ? styles.dotActiveInner : styles.dotInactiveInner]} />
                        ))}
                      </View>
                    </ImageBackground>
                  </View>
                );
              }
              return (
                <View key={promo.id} style={styles.bannerCardOuter}>
                  <LinearGradient colors={[...promo.colors]} style={styles.bannerCard}>
                    <Text style={styles.bannerTitle}>{promo.title}</Text>
                    <Text style={styles.bannerSub}>{promo.subtitle}</Text>
                    {/* Dots inside banner fallback */}
                    <View style={styles.dotsInner}>
                      {PROMOS.map((_, i) => (
                        <View key={i} style={[styles.dot, activePromo === i ? styles.dotActiveInner : styles.dotInactiveInner]} />
                      ))}
                    </View>
                  </LinearGradient>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ====== Section 2: User Greeting Row ====== */}
      {animSection(2,
        <View style={styles.greetingRow}>
          <Text style={styles.greetingText}>Hi, <Text style={styles.greetingName}>{user?.name || 'Tamu'}</Text></Text>
          <View style={styles.tierPill}>
            <Text style={{ fontSize: 12 }}>{tierEmoji}</Text>
            <Text style={styles.tierPillText}>{tier}</Text>
          </View>
          <View style={styles.pointsPill}>
            <Ionicons name="star" size={12} color={Colors.gold} />
            <Text style={styles.pointsText}>{points} pts</Text>
          </View>
        </View>
      )}

      {/* ====== Section 3: 2x2 Quick Action Grid ====== */}
      {animSection(3,
        <View style={styles.gridWrap}>
          {[
            { icon: 'restaurant-outline' as const, label: 'Pesan\nSekarang', onPress: () => router.push('/menu' as any), primary: true },
            { icon: 'calendar-outline' as const, label: 'Reservasi', onPress: () => router.push('/reservation' as any), primary: false },
            { icon: 'star-outline' as const, label: 'Rewards', onPress: () => router.push('/barcode' as any), primary: false },
            { icon: 'navigate-outline' as const, label: 'Lokasi\nKami', onPress: () => router.push('/(tabs)/profile' as any), primary: false },
          ].map((action, i) => (
            <PressableCard
              key={i}
              style={action.primary ? [styles.gridCard, styles.gridCardPrimary] : [styles.gridCard, styles.gridCardSecondary]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                action.onPress();
              }}
              haptic
            >
              {action.primary ? (
                <LinearGradient
                  colors={[Colors.green, Colors.greenDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gridCardAccentGradient}
                >
                  <View style={styles.gridIconAccent}>
                    <Ionicons name={action.icon} size={24} color="#fff" />
                  </View>
                  <Text style={[styles.gridLabel, { color: '#fff' }]}>{action.label}</Text>
                </LinearGradient>
              ) : (
                <>
                  <View style={styles.gridIconWrap}>
                    <Ionicons name={action.icon} size={24} color={Colors.green} />
                  </View>
                  <Text style={styles.gridLabel}>{action.label}</Text>
                </>
              )}
            </PressableCard>
          ))}
        </View>
      )}

      {/* ====== Section 4: Secondary Action Row (pill chips) ====== */}
      {animSection(4,
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {SECONDARY_ACTIONS.map((item, i) => (
            <Animated.View
              key={i}
              style={{
                opacity: secOpacities[i],
                transform: [{ translateY: secTranslateYs[i] }],
              }}
            >
              <TouchableOpacity
                style={styles.chip}
                activeOpacity={0.85}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  item.onPress();
                }}
              >
                <Ionicons name={item.icon} size={16} color={Colors.greenDeep} style={styles.chipIcon} />
                <Text style={styles.chipLabel}>{item.label}</Text>
                {item.badge > 0 && (
                  <Animated.View style={[styles.chipBadge, { transform: [{ scale: badgeScale }] }]}>
                    <Text style={styles.chipBadgeText}>{item.badge}</Text>
                  </Animated.View>
                )}
              </TouchableOpacity>
            </Animated.View>
          ))}
        </ScrollView>
      )}

      {/* ====== Section 5: Rekomendasi Chef ====== */}
      {animSection(5,
        <View style={styles.section}>
          <SectionHeader title="Rekomendasi Chef" onSeeAll={() => router.push('/menu' as any)} />
          {loading ? (
            <SkeletonLoader variant="card" count={3} gap={12} style={{ paddingRight: 24 }} />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recScroll}>
              {recs.map(item => (
                <RecCard
                  key={item.id}
                  item={item}
                  onTap={() => router.push(`/item/${item.id}`)}
                  onAdd={() => addToCart(item)}
                />
              ))}
            </ScrollView>
          )}
        </View>
      )}

      {/* ====== Section 6: Promo Minggu Ini ====== */}
      {animSection(6,
        <View style={styles.section}>
          <SectionHeader title="Promo Minggu Ini" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recScroll}>
            {WEEKLY_PROMOS.map((promo, idx) => {
              const imgIdx = idx === 0 ? 0 : idx === 1 ? 3 : 6;
              const weeklyImg = weeklyImages[imgIdx]?.imageUrl;

              if (weeklyImg) {
                return (
                  <View key={promo.id} style={styles.weeklyCardOuter}>
                    <ImageBackground
                      source={{ uri: weeklyImg }}
                      style={styles.weeklyCard}
                      imageStyle={{ borderRadius: 14 }}
                    >
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.6)']}
                        style={styles.weeklyOverlay}
                      >
                        <Text style={styles.weeklyTitle}>{promo.title}</Text>
                        <Text style={styles.weeklyDesc}>{promo.desc}</Text>
                      </LinearGradient>
                    </ImageBackground>
                  </View>
                );
              }

              return (
                <View key={promo.id} style={[styles.weeklyCard, { backgroundColor: promo.color }]}>
                  <Text style={styles.weeklyTitle}>{promo.title}</Text>
                  <Text style={styles.weeklyDesc}>{promo.desc}</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ====== Section 7: Kunjungi Kami ====== */}
      {animSection(7,
        <View style={styles.section}>
          <SectionHeader title="Kunjungi Kami" />
          {STORES.map((store, storeIndex) => {
            // Distribute menu item photos across branches deterministically
            // so each branch gets its own distinctive thumbnail that doesn't
            // change on every render (using a simple modulo stride).
            const stride = Math.max(1, Math.floor(storeImages.length / STORES.length) || 1);
            const storeThumb = storeImages[storeIndex * stride]?.imageUrl;
            return (
              <PressableCard
                key={store.id}
                style={styles.storeCard}
                onPress={() => Linking.openURL(`https://maps.google.com/?q=${store.lat},${store.lng}`)}
              >
                <View style={styles.storeThumbWrap}>
                  {storeThumb ? (
                    <Image source={{ uri: storeThumb }} style={styles.storeThumb} />
                  ) : (
                    <View style={styles.storeImagePlaceholder}>
                      <Ionicons name="cafe" size={22} color={Colors.green} />
                    </View>
                  )}
                </View>
                <View style={styles.storeInfo}>
                  <Text style={styles.storeName}>{store.name}</Text>
                  <Text style={styles.storeAddr} numberOfLines={1}>{store.addr}</Text>
                  <View style={styles.storeHoursRow}>
                    <Ionicons name="time-outline" size={11} color={Colors.green} />
                    <Text style={styles.storeHours}>{store.hours} WIB</Text>
                  </View>
                </View>
                <View style={styles.naviBtn}>
                  <Ionicons name="navigate-outline" size={16} color={Colors.green} />
                </View>
              </PressableCard>
            );
          })}
        </View>
      )}

      <View style={{ height: 100 }} />

      {/* Branch bottom sheet */}
      <BranchBottomSheet
        visible={showBranchSheet}
        onClose={() => setShowBranchSheet(false)}
        onSelect={(store) => { setBranchCode(store.branchCode); setShowBranchSheet(false); }}
        selectedBranchCode={currentBranchCode}
      />

      {/* Name prompt modal — shown once when ESB OTP didn't return a name */}
      <Modal visible={showNamePrompt} transparent animationType="fade">
        <View style={styles.nameOverlay}>
          <View style={styles.nameCard}>
            <Text style={styles.nameTitle}>Selamat Datang!</Text>
            <Text style={styles.nameSubtitle}>Siapa nama kamu?</Text>
            <TextInput
              style={styles.nameInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Masukkan nama"
              placeholderTextColor={Colors.textSoft + '88'}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleNameSubmit}
            />
            <TouchableOpacity
              style={[styles.nameBtn, !nameInput.trim() && { opacity: 0.5 }]}
              onPress={handleNameSubmit}
              disabled={!nameInput.trim()}
            >
              <Text style={styles.nameBtnText}>Lanjutkan</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowNamePrompt(false)} style={{ marginTop: 12 }}>
              <Text style={styles.nameSkip}>Nanti saja</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },

  // Error state
  errorContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xxl },
  errorCard: { backgroundColor: Colors.white, borderRadius: 20, padding: 32, alignItems: 'center', width: '100%', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 4 },
  errorTitle: { fontFamily: Font.displayBold, fontSize: 20, color: Colors.text, marginTop: 16, marginBottom: 8 },
  errorDesc: { fontFamily: Font.regular, fontSize: 14, color: Colors.textSoft, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  errorRetryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.green, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  errorRetryText: { fontFamily: Font.bold, fontSize: 14, color: '#fff' },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: Spacing.xxl, paddingBottom: 16 },
  headerLeft: {},
  brandTitle: { fontFamily: Font.displayBlack, fontSize: 28, color: Colors.text, letterSpacing: -0.5 },
  branchRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  branchName: { fontFamily: Font.medium, fontSize: 13, color: Colors.textSoft },
  headerRight: { flexDirection: 'row', gap: 6, paddingTop: 4 },
  headerIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  notifDot: { position: 'absolute', top: 8, right: 8, width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.badgeRed },

  // Banner
  bannerWrap: { marginBottom: 20 },
  bannerCardOuter: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 6 },
  bannerCard: { width: BANNER_W, height: BANNER_H, borderRadius: 16, justifyContent: 'center', overflow: 'hidden' },
  bannerOverlay: { flex: 1, borderRadius: 16, padding: 24, justifyContent: 'flex-end' },
  bannerTitle: { fontFamily: Font.displayBold, fontSize: 22, color: '#fff', marginBottom: 6 },
  bannerSub: { fontFamily: Font.regular, fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  dotsInner: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotActiveInner: { width: 20, backgroundColor: '#fff' },
  dotInactiveInner: { backgroundColor: 'rgba(255,255,255,0.4)' },

  // Greeting
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: Spacing.xxl, marginBottom: 20 },
  greetingText: { fontFamily: Font.regular, fontSize: 15, color: Colors.textSoft },
  greetingName: { fontSize: 18, fontFamily: Font.bold, color: Colors.text },
  tierPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.greenMint, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tierPillText: { fontFamily: Font.semibold, fontSize: 11, color: Colors.green },
  pointsPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.parchment, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  pointsText: { fontFamily: Font.extrabold, fontSize: 11, color: Colors.gold },

  // Grid — 2×2 with the primary CTA as the only filled tile
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: Spacing.xxl,
    marginBottom: 24,
  },
  gridCard: {
    width: (SCREEN_W - 48 - 10) / 2,
    height: 96,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gridCardPrimary: {
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  gridCardSecondary: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#E8E0D6',
    ...Shadow.sm,
  },
  gridCardAccentGradient: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
  },
  gridIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.greenMint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  gridIconAccent: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  gridLabel: {
    fontFamily: Font.semibold,
    fontSize: 13,
    color: Colors.greenDeep,
    textAlign: 'center',
    lineHeight: 17,
    letterSpacing: 0.1,
  },

  // Pill chips row — replaces the old circle icon row
  chipsRow: {
    gap: 10,
    paddingHorizontal: Spacing.xxl,
    marginBottom: 28,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#E8E0D6',
    ...Shadow.sm,
  },
  chipIcon: {
    marginRight: 6,
  },
  chipLabel: {
    fontFamily: Font.semibold,
    fontSize: 13,
    color: Colors.greenDeep,
    letterSpacing: 0.1,
  },
  chipBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    marginLeft: 7,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipBadgeText: {
    fontFamily: Font.bold,
    fontSize: 10,
    color: '#fff',
  },

  // Sections
  section: { paddingHorizontal: Spacing.xxl, marginBottom: 28 },

  // Rec cards
  recScroll: { gap: 12, paddingRight: 24 },
  recCard: {
    width: 164,
    height: 232,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#F0E6D2',
    ...Shadow.card,
  },
  recImageWrap: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: Colors.parchment,
    overflow: 'hidden',
    position: 'relative',
  },
  recImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  recPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recInfo: { padding: 11, flex: 1, justifyContent: 'space-between' },
  recName: { fontFamily: Font.semibold, fontSize: 13, color: Colors.text, lineHeight: 17, letterSpacing: -0.1 },
  recBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recPrice: { fontFamily: Font.bold, fontSize: 14, color: Colors.greenForest, letterSpacing: -0.2 },
  recAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  recChefBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(253, 246, 236, 0.95)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  recChefText: {
    fontFamily: Font.extrabold,
    fontSize: 8,
    color: Colors.green,
    letterSpacing: 0.6,
  },

  // Weekly promos
  weeklyCardOuter: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 6 },
  weeklyCard: { width: 220, height: 140, borderRadius: 14, overflow: 'hidden', justifyContent: 'center' },
  weeklyOverlay: { flex: 1, borderRadius: 14, padding: 16, justifyContent: 'flex-end' },
  weeklyTitle: { fontFamily: Font.bold, fontSize: 16, color: '#fff', marginBottom: 4 },
  weeklyDesc: { fontFamily: Font.regular, fontSize: 12, color: 'rgba(255,255,255,0.8)' },

  // Stores
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.goldAccent,
    borderWidth: 1,
    borderColor: '#F0E6D2',
    ...Shadow.sm,
  },
  storeThumbWrap: {
    width: 68,
    height: 68,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.parchment,
  },
  storeImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.greenMint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeThumb: { width: '100%', height: '100%', resizeMode: 'cover' },
  storeInfo: { flex: 1 },
  storeName: { fontFamily: Font.bold, fontSize: 13, color: Colors.text, marginBottom: 2, letterSpacing: -0.1 },
  storeAddr: { fontFamily: Font.regular, fontSize: 11, color: Colors.textSoft, marginBottom: 4 },
  storeHoursRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  storeHours: { fontFamily: Font.semibold, fontSize: 11, color: Colors.green },
  naviBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.greenMint, alignItems: 'center', justifyContent: 'center' },

  // Name prompt modal
  nameOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  nameCard: { backgroundColor: Colors.white, borderRadius: 20, padding: 28, width: '100%', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 8 },
  nameTitle: { fontFamily: Font.displayBold, fontSize: 22, color: Colors.text, marginBottom: 4 },
  nameSubtitle: { fontFamily: Font.regular, fontSize: 14, color: Colors.textSoft, marginBottom: 20 },
  nameInput: { width: '100%', fontFamily: Font.medium, fontSize: 16, color: Colors.text, backgroundColor: Colors.cream, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16 },
  nameBtn: { width: '100%', backgroundColor: Colors.green, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  nameBtnText: { fontFamily: Font.bold, fontSize: 15, color: '#fff' },
  nameSkip: { fontFamily: Font.medium, fontSize: 13, color: Colors.textSoft },
});
