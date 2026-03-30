// app/item/[id].tsx — Premium Item Detail Screen
import { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Image, Dimensions, TextInput, Animated, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Font, Spacing, fmtPrice } from '@/constants/theme';
import { useBranch } from '@/context/BranchContext';
import { useCart } from '@/context/CartContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_W } = Dimensions.get('window');
const HERO_HEIGHT = 380;


export default function ItemDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { addToCart, cart } = useCart();
  const { allItems } = useBranch();
  const item = allItems.find(i => i.id === (id || ''));

  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [selectedExtras, setSelectedExtras] = useState<Record<number, boolean>>({});
  const [addedAnim, setAddedAnim] = useState(false);

  // Toast animation
  const toastAnim = useRef(new Animated.Value(-80)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const existingCartItem = cart.find(c => c.id === (id || ''));
  const isInCart = !!existingCartItem;

  if (!item) {
    return (
      <View style={styles.notFound}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textSoft} />
        <Text style={styles.notFoundText}>Item tidak ditemukan</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.notFoundBtn}>
          <Ionicons name="chevron-back" size={18} color={Colors.green} />
          <Text style={styles.backLink}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Calculate extras total
  const extrasTotal = item.extras.reduce((sum, group) => {
    return sum + group.items.reduce((gSum, ext) => {
      return gSum + (selectedExtras[ext.id] ? ext.price : 0);
    }, 0);
  }, 0);

  const total = (item.price + extrasTotal) * qty;
  const hasImage = !!item.imageUrl;

  const toggleExtra = (extId: number) => {
    setSelectedExtras(prev => ({ ...prev, [extId]: !prev[extId] }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const showToast = () => {
    toastAnim.setValue(-80);
    toastOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(toastAnim, {
        toValue: 60,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(toastAnim, {
            toValue: -80,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(toastOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start();
      }, 2000);
    });
  };

  const handleAdd = async () => {
    if (item.soldOut) return;
    const selectedExtrasList = item.extras.flatMap(g =>
      g.items.filter(e => selectedExtras[e.id]).map(e => ({ id: e.id, name: e.name, price: e.price }))
    );
    addToCart(item, qty, selectedExtrasList, notes);
    try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    setAddedAnim(true);
    showToast();
    const t = setTimeout(() => {
      setAddedAnim(false);
      router.back();
    }, 600);
    return () => clearTimeout(t);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <View style={styles.container}>
      {/* Toast notification */}
      <Animated.View
        style={[
          styles.toast,
          { transform: [{ translateY: toastAnim }], opacity: toastOpacity },
        ]}
        pointerEvents="none"
      >
        <Ionicons name="checkmark-circle" size={16} color="#fff" />
        <Text style={styles.toastText}>Ditambahkan ke keranjang</Text>
      </Animated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero Image */}
        {hasImage ? (
          <View style={styles.heroWrap}>
            <Image source={{ uri: item.imageUrl }} style={styles.heroImage} />
            {/* Top gradient for button readability */}
            <LinearGradient
              colors={['rgba(0,0,0,0.4)', 'transparent']}
              style={styles.topGradient}
            />
          </View>
        ) : (
          <View style={styles.heroPlaceholder}>
            <Ionicons name="restaurant-outline" size={72} color={Colors.goldLight} />
          </View>
        )}

        {/* Floating nav buttons */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={styles.navBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} activeOpacity={0.7}>
            <Ionicons name="share-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Content Card */}
        <View style={styles.contentCard}>
          {/* Drag handle */}
          <View style={styles.dragHandleWrap}>
            <View style={styles.dragHandle} />
          </View>

          {/* Item Info */}
          <View style={styles.infoSection}>
            <Text style={styles.itemName}>{item.name}</Text>

            {/* Badges */}
            <View style={styles.badges}>
              {item.rec && (
                <View style={styles.recBadge}>
                  <Text style={styles.recText}>Rekomendasi Chef</Text>
                </View>
              )}
              {item.spicy && (
                <View style={styles.spicyBadge}>
                  <Text style={styles.spicyText}>Pedas</Text>
                </View>
              )}
              {item.soldOut && (
                <View style={styles.soldOutBadge}>
                  <Text style={styles.soldOutText}>Habis</Text>
                </View>
              )}
            </View>

            {/* Description */}
            <Text style={styles.itemDesc}>
              {item.desc || 'Hidangan lezat dari dapur kami'}
            </Text>

            {/* Price */}
            <Text style={styles.price}>{fmtPrice(item.price)}</Text>
            <Text style={styles.taxNote}>Belum termasuk PB1 10%</Text>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Extras / Modifiers */}
          {item.extras.length > 0 && (
            <View style={styles.extrasSection}>
              <Text style={styles.sectionTitle}>Pilihan</Text>
              {item.extras.map((group, gi) => (
                <View key={gi} style={styles.extrasGroup}>
                  <Text style={styles.extrasGroupName}>{group.groupName}</Text>
                  {group.items.map(ext => {
                    const isSelected = !!selectedExtras[ext.id];
                    return (
                      <TouchableOpacity
                        key={ext.id}
                        style={styles.extraRow}
                        onPress={() => toggleExtra(ext.id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.extraLeft}>
                          <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                            {isSelected && (
                              <Ionicons name="checkmark" size={14} color="#fff" />
                            )}
                          </View>
                          <Text style={[styles.extraName, isSelected && styles.extraNameActive]}>
                            {ext.name}
                          </Text>
                        </View>
                        <Text style={styles.extraPrice}>+{fmtPrice(ext.price)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          )}

          {/* Special Instructions */}
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Catatan Khusus</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="Catatan khusus (opsional)"
              placeholderTextColor="#9CA3AF"
              value={notes}
              onChangeText={setNotes}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Quantity Selector */}
          {!item.soldOut && (
            <View style={styles.qtySection}>
              <Text style={styles.sectionTitle}>Jumlah</Text>
              <View style={styles.qtyControl}>
                <TouchableOpacity
                  style={[styles.qtyBtn, qty <= 1 && styles.qtyBtnDisabled]}
                  disabled={qty <= 1}
                  onPress={() => {
                    setQty(Math.max(1, qty - 1));
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="remove" size={22} color={qty <= 1 ? '#D1D5DB' : Colors.text} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{qty}</Text>
                <TouchableOpacity
                  style={styles.qtyBtnAdd}
                  onPress={() => {
                    setQty(qty + 1);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky Add to Cart Button */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleAdd}
          disabled={item.soldOut}
        >
          <LinearGradient
            colors={
              item.soldOut
                ? ['#9CA3AF', '#6B7280']
                : addedAnim
                  ? [Colors.greenLight, Colors.green]
                  : [Colors.green, Colors.greenDeep]
            }
            style={styles.addBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {addedAnim ? (
              <View style={styles.addedRow}>
                <Ionicons name="checkmark-circle" size={22} color="#fff" />
                <Text style={styles.addBtnText}>Ditambahkan!</Text>
              </View>
            ) : item.soldOut ? (
              <Text style={styles.addBtnText}>Stok Habis</Text>
            ) : (
              <Text style={styles.addBtnText}>
                {isInCart ? 'Perbarui Keranjang' : 'Tambah ke Keranjang'} — {fmtPrice(total)}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // Toast
  toast: {
    position: 'absolute',
    top: 0,
    left: SCREEN_W * 0.15,
    right: SCREEN_W * 0.15,
    zIndex: 999,
    backgroundColor: Colors.green,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  toastText: {
    fontFamily: Font.semibold,
    fontSize: 14,
    color: '#fff',
  },

  // Hero
  heroWrap: {
    width: SCREEN_W,
    height: HERO_HEIGHT,
    backgroundColor: '#E8F0E4',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  heroPlaceholder: {
    width: SCREEN_W,
    height: HERO_HEIGHT,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Nav buttons (overlaid on hero)
  navRow: {
    position: 'absolute',
    top: 52,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Content card
  contentCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingBottom: 24,
    minHeight: 400,
  },
  dragHandleWrap: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.goldLight,
  },

  // Info
  infoSection: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: 8,
  },
  itemName: {
    fontFamily: Font.displayBold,
    fontSize: 26,
    color: Colors.text,
    marginBottom: 10,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  recBadge: {
    backgroundColor: Colors.greenMint,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  recText: {
    fontSize: 12,
    fontFamily: Font.semibold,
    color: Colors.green,
  },
  spicyBadge: {
    backgroundColor: Colors.hibiscusLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  spicyText: {
    fontSize: 12,
    fontFamily: Font.semibold,
    color: Colors.hibiscus,
  },
  soldOutBadge: {
    backgroundColor: Colors.hibiscus,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  soldOutText: {
    fontSize: 12,
    fontFamily: Font.semibold,
    color: '#fff',
  },
  itemDesc: {
    fontFamily: Font.regular,
    fontSize: 15,
    color: Colors.textSoft,
    lineHeight: 22,
    marginBottom: 18,
  },
  price: {
    fontFamily: Font.displayBold,
    fontSize: 28,
    color: Colors.greenForest,
    marginBottom: 2,
  },
  taxNote: {
    fontSize: 12,
    fontFamily: Font.regular,
    color: '#9CA3AF',
    marginBottom: 4,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#F0EBE4',
    marginHorizontal: Spacing.xxl,
    marginTop: 16,
    marginBottom: 8,
  },

  // Extras
  extrasSection: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: 16,
  },
  sectionTitle: {
    fontFamily: Font.bold,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 12,
  },
  extrasGroup: {
    marginBottom: 16,
  },
  extrasGroupName: {
    fontFamily: Font.semibold,
    fontSize: 14,
    color: Colors.textSoft,
    marginBottom: 8,
  },
  extraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F1EC',
  },
  extraLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E8E0D8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.green,
    borderColor: Colors.green,
  },
  extraName: {
    fontFamily: Font.regular,
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  extraNameActive: {
    fontFamily: Font.semibold,
  },
  extraPrice: {
    fontFamily: Font.medium,
    fontSize: 14,
    color: Colors.textSoft,
  },

  // Notes
  notesSection: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: 20,
  },
  notesInput: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F0EBE4',
    minHeight: 50,
    fontFamily: Font.regular,
    fontSize: 14,
    color: Colors.text,
  },

  // Qty
  qtySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl,
    paddingTop: 24,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  qtyBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#F0EBE4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnDisabled: {
    borderColor: '#F5F1EC',
  },
  qtyBtnAdd: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontFamily: Font.extrabold,
    fontSize: 26,
    color: Colors.text,
    minWidth: 30,
    textAlign: 'center',
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.xxl,
    paddingTop: 14,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0EBE4',
  },
  addBtn: {
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.green,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 5,
  },
  addBtnText: {
    fontFamily: Font.bold,
    color: '#fff',
    fontSize: 16,
  },
  addedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // Not found
  notFound: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  notFoundText: {
    fontFamily: Font.medium,
    fontSize: 16,
    color: Colors.textSoft,
  },
  notFoundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  backLink: {
    fontSize: 15,
    color: Colors.green,
    fontFamily: Font.semibold,
  },
});
