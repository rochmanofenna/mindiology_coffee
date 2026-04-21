// components/AnimatedSplash.tsx
// "Bloom" — animated splash overlay that takes over from the native expo
// splash once the JS bundle is mounted. Uses the same asset + background
// as app.json's splash config (icon.png on Colors.cream) so the handoff
// from static → animated reads as a single continuous moment.
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  StyleSheet,
  type NativeEventSubscription,
} from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Font } from '@/constants/theme';

interface Props {
  /** App-level readiness signal (fonts loaded, auth restored, etc.). */
  isReady: boolean;
  /** Fired after the exit animation finishes and the overlay unmounts. */
  onFinish: () => void;
}

const BRAND = 'Mindiology';
const MIN_DISPLAY_MS = 2200;
const MIN_DISPLAY_REDUCED_MS = 600;

export default function AnimatedSplash({ isReady, onFinish }: Props) {
  const [visible, setVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const mountedAt = useRef(Date.now());

  // ─── Animated values ──────────────────────────────────────────────────
  const logoOpacity = useRef(new Animated.Value(0.35)).current;
  const logoScale = useRef(new Animated.Value(0.88)).current;
  // logoTilt settles from -0.08 → 0; interpolated to ~-4.8° → 0°
  const logoTilt = useRef(new Animated.Value(-0.08)).current;
  const breathe = useRef(new Animated.Value(1)).current;

  // One opacity + translateY pair per letter for a soft stagger reveal.
  const letters = useRef(
    BRAND.split('').map(() => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(-8),
    })),
  ).current;

  const exitOpacity = useRef(new Animated.Value(1)).current;
  const exitScale = useRef(new Animated.Value(1)).current;

  // ─── Reduced-motion detection ─────────────────────────────────────────
  useEffect(() => {
    let sub: NativeEventSubscription | undefined;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then(setReducedMotion)
      .catch(() => {});
    sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => sub?.remove?.();
  }, []);

  // ─── Entrance ─────────────────────────────────────────────────────────
  useEffect(() => {
    // Hand off from the native splash the moment we have a first frame.
    SplashScreen.hideAsync().catch(() => {});

    if (reducedMotion) {
      // Skip staggers and springs — just fade everything in together.
      logoScale.setValue(1);
      logoTilt.setValue(0);
      letters.forEach((l) => l.translateY.setValue(0));
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
        ...letters.map((l) =>
          Animated.timing(l.opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
        ),
      ]).start();
      return;
    }

    Animated.sequence([
      // 1. Logo bloom: fade in, spring to 1.0, settle the -4.8° tilt.
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          tension: 58,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 440,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoTilt, {
          toValue: 0,
          duration: 640,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),

      // 2. Hold — let the logo breathe.
      Animated.delay(180),

      // 3. Brand name — letter-staggered fade + rise.
      Animated.stagger(
        55,
        letters.map((l) =>
          Animated.parallel([
            Animated.timing(l.opacity, {
              toValue: 1,
              duration: 320,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(l.translateY, {
              toValue: 0,
              duration: 320,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
        ),
      ),
    ]).start(() => {
      // Idle breathing pulse — tells the user "still loading" without a spinner.
      Animated.loop(
        Animated.sequence([
          Animated.timing(breathe, {
            toValue: 0.93,
            duration: 1400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(breathe, {
            toValue: 1,
            duration: 1400,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    });
  }, [reducedMotion]);

  // ─── Exit ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isReady) return;
    const elapsed = Date.now() - mountedAt.current;
    const minHold = reducedMotion ? MIN_DISPLAY_REDUCED_MS : MIN_DISPLAY_MS;
    const delay = Math.max(0, minHold - elapsed);

    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(exitOpacity, {
          toValue: 0,
          duration: reducedMotion ? 220 : 520,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(exitScale, {
          toValue: reducedMotion ? 1 : 1.04,
          duration: 520,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start(() => {
        setVisible(false);
        onFinish();
      });
    }, delay);

    return () => clearTimeout(t);
  }, [isReady, reducedMotion, onFinish]);

  if (!visible) return null;

  // -0.08 maps to -4.8°; 0 → 0°. Range padded so the math is obvious.
  const rotate = logoTilt.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-60deg', '60deg'],
  });
  const logoAlpha = Animated.multiply(logoOpacity, breathe);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        { opacity: exitOpacity, transform: [{ scale: exitScale }] },
      ]}
    >
      {/* Warm cream → parchment vertical wash for depth */}
      <LinearGradient
        colors={[Colors.cream, Colors.parchment]}
        locations={[0.35, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Lotus — the app icon (white lotus on deep green rounded square) */}
      <Animated.View
        style={[
          styles.logoWrap,
          {
            opacity: logoAlpha,
            transform: [{ scale: logoScale }, { rotate }],
          },
        ]}
      >
        <Image
          source={require('../assets/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Wordmark — Fraunces, letter-staggered */}
      <Animated.View style={styles.brandRow}>
        {BRAND.split('').map((ch, i) => (
          <Animated.Text
            key={`${ch}-${i}`}
            style={[
              styles.brand,
              {
                opacity: letters[i].opacity,
                transform: [{ translateY: letters[i].translateY }],
              },
            ]}
          >
            {ch}
          </Animated.Text>
        ))}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  logoWrap: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
  },
  logo: {
    width: 240,
    height: 240,
    // iOS superellipse is ~22.5% of width; matches how the app icon renders
    // on the home screen so the splash feels like "the icon woke up".
    borderRadius: 54,
  },
  brandRow: {
    flexDirection: 'row',
  },
  brand: {
    fontFamily: Font.display,
    fontSize: 56,
    color: Colors.greenDeep,
    letterSpacing: 0.5,
    lineHeight: 64,
    includeFontPadding: false,
  },
});
