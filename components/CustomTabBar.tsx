// components/CustomTabBar.tsx — Custom tab bar with elevated center action button
import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors, Font } from '@/constants/theme';
import { useCart } from '@/context/CartContext';
import { useOrder } from '@/context/OrderContext';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TAB_CONFIG: { name: string; label: string; iconActive: keyof typeof Ionicons.glyphMap; iconInactive: keyof typeof Ionicons.glyphMap }[] = [
  { name: 'index', label: 'Home', iconActive: 'home', iconInactive: 'home-outline' },
  { name: 'explore', label: 'Explore', iconActive: 'compass', iconInactive: 'compass-outline' },
  // center button is injected between index 1 and 2
  { name: 'order', label: 'Order', iconActive: 'receipt', iconInactive: 'receipt-outline' },
  { name: 'profile', label: 'Profil', iconActive: 'person', iconInactive: 'person-outline' },
];

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { cartCount } = useCart();
  const { activeOrders } = useOrder();
  const hasActiveOrders = activeOrders.length > 0;

  // Breathing glow for center button
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1000, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 1000, useNativeDriver: false }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const animatedShadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.5],
  });

  const animatedShadowRadius = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 16],
  });

  // Per-tab icon scale bounce
  const iconScales = useRef(TAB_CONFIG.map(() => new Animated.Value(1))).current;
  const prevIndex = useRef(state.index);

  useEffect(() => {
    const activeRouteIndex = state.index;
    if (activeRouteIndex === prevIndex.current) return;
    prevIndex.current = activeRouteIndex;

    // Find which TAB_CONFIG index corresponds to this route
    const tabIdx = TAB_CONFIG.findIndex(t => t.name === state.routes[activeRouteIndex]?.name);
    if (tabIdx < 0) return;

    iconScales[tabIdx].setValue(0.85);
    Animated.spring(iconScales[tabIdx], {
      toValue: 1,
      friction: 4,
      tension: 300,
      useNativeDriver: true,
    }).start();
  }, [state.index]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom, height: 65 + insets.bottom }]}>
      {TAB_CONFIG.map((tab, tabIndex) => {
        // Find the matching route in state
        const routeIndex = state.routes.findIndex(r => r.name === tab.name);
        const isFocused = state.index === routeIndex;

        const onPress = () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          const route = state.routes[routeIndex];
          if (!route) return;
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        // Inject center button after second tab
        const elements = [];
        if (tabIndex === 2) {
          elements.push(
            <Animated.View
              key="center"
              style={[
                styles.centerBtnWrap,
                {
                  shadowColor: Colors.green,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: animatedShadowOpacity,
                  shadowRadius: animatedShadowRadius,
                  elevation: 8,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.centerBtn}
                activeOpacity={0.8}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  router.push('/menu' as any);
                }}
              >
                <Ionicons name="restaurant" size={26} color="#fff" />
                {cartCount > 0 && (
                  <View style={styles.cartBadge}>
                    <Text style={styles.cartBadgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          );
        }

        const showOrderDot = tab.name === 'order' && hasActiveOrders;

        elements.unshift(
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={onPress}
            activeOpacity={0.7}
          >
            <Animated.View style={{ transform: [{ scale: iconScales[tabIndex] }] }}>
              <Ionicons
                name={isFocused ? tab.iconActive : tab.iconInactive}
                size={22}
                color={isFocused ? Colors.greenForest : '#9CA3AF'}
              />
              {showOrderDot && <View style={styles.orderDot} />}
            </Animated.View>
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );

        return elements;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    backgroundColor: Colors.cream,
    height: 65,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    fontFamily: Font.semibold,
    fontSize: 10,
    color: '#9CA3AF',
    letterSpacing: 0.3,
  },
  tabLabelActive: {
    color: Colors.greenForest,
  },
  centerBtnWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -30,
    width: 64,
  },
  centerBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.cream,
  },
  cartBadgeText: {
    fontFamily: Font.bold,
    fontSize: 9,
    color: '#fff',
  },
  // Peripheral-awareness dot for active orders on the Order tab icon.
  // Not a count — presence only. Sits above the icon, slightly right of center.
  orderDot: {
    position: 'absolute',
    top: -2,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.green,
    borderWidth: 1.5,
    borderColor: Colors.cream,
  },
});
