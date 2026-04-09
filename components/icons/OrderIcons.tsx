// components/icons/OrderIcons.tsx
// Custom hand-drawn SVG icon family for the Order tracking screen.
// Stroke-only, confident single-pass lines, slight imperfection —
// like a chef's quick mark on a kitchen ticket, not a generic icon font.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path, Circle, G, Line } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
}

const DEFAULTS = {
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none' as const,
};

/* ─────────────────────────────────────────────────────────────
 * StepCheckmark
 * A confident single-stroke tick, slightly off-center so it
 * reads like a pen mark rather than an icon-font glyph.
 * ───────────────────────────────────────────────────────────── */
export const StepCheckmark: React.FC<IconProps> = ({
  size = 18,
  color = '#FFFFFF',
  strokeWidth = 2.2,
  style,
}) => (
  <Svg width={size} height={size} viewBox="0 0 18 18" style={style}>
    <Path
      d="M3.5 9.8 L7.2 13.2 L14.5 4.8"
      stroke={color}
      strokeWidth={strokeWidth}
      {...DEFAULTS}
    />
  </Svg>
);

/* ─────────────────────────────────────────────────────────────
 * StepClock
 * Waiting/pending state. Minimal clock face, hands at ~10:10
 * (classic "optimistic" watch advertisement pose).
 * ───────────────────────────────────────────────────────────── */
export const StepClock: React.FC<IconProps> = ({
  size = 18,
  color = '#A09890',
  strokeWidth = 1.6,
  style,
}) => (
  <Svg width={size} height={size} viewBox="0 0 18 18" style={style}>
    <Circle
      cx="9"
      cy="9"
      r="6.2"
      stroke={color}
      strokeWidth={strokeWidth}
      fill="none"
    />
    {/* Hour hand — to ~10 o'clock */}
    <Path
      d="M9 9 L5.8 6.5"
      stroke={color}
      strokeWidth={strokeWidth}
      {...DEFAULTS}
    />
    {/* Minute hand — to ~2 o'clock */}
    <Path
      d="M9 9 L12 5.6"
      stroke={color}
      strokeWidth={strokeWidth}
      {...DEFAULTS}
    />
  </Svg>
);

/* ─────────────────────────────────────────────────────────────
 * StepFlame
 * Processing / cooking. Organic curves, inner ember accent.
 * ───────────────────────────────────────────────────────────── */
export const StepFlame: React.FC<IconProps> = ({
  size = 18,
  color = '#C9A84C',
  strokeWidth = 1.8,
  style,
}) => (
  <Svg width={size} height={size} viewBox="0 0 18 18" style={style}>
    {/* Outer flame — gently asymmetric, like a real wick */}
    <Path
      d="M9 2.2 C9 2.2 5.3 6.2 4.9 9.8 C4.5 13.3 6.5 15.6 9 15.6 C11.5 15.6 13.5 13.3 13.1 9.8 C12.8 7 10.9 4.6 9 2.2 Z"
      stroke={color}
      strokeWidth={strokeWidth}
      {...DEFAULTS}
    />
    {/* Inner ember — small curl near the base */}
    <Path
      d="M9 10.2 C8.2 10.8 7.7 11.6 7.8 12.4 C7.9 13.2 8.4 13.8 9.1 13.8 C9.8 13.8 10.3 13.2 10.3 12.5 C10.3 11.7 9.7 10.8 9 10.2 Z"
      stroke={color}
      strokeWidth={strokeWidth - 0.3}
      {...DEFAULTS}
    />
  </Svg>
);

/* ─────────────────────────────────────────────────────────────
 * StepBell
 * Ready for pickup. Bell silhouette with clapper stem.
 * ───────────────────────────────────────────────────────────── */
export const StepBell: React.FC<IconProps> = ({
  size = 18,
  color = '#A09890',
  strokeWidth = 1.6,
  style,
}) => (
  <Svg width={size} height={size} viewBox="0 0 18 18" style={style}>
    {/* Bell body */}
    <Path
      d="M4.8 12.6 C4.8 10.4 5.3 8.4 5.3 6.6 C5.3 4.6 6.9 3.2 9 3.2 C11.1 3.2 12.7 4.6 12.7 6.6 C12.7 8.4 13.2 10.4 13.2 12.6 Z"
      stroke={color}
      strokeWidth={strokeWidth}
      {...DEFAULTS}
    />
    {/* Base */}
    <Path
      d="M3.8 12.6 L14.2 12.6"
      stroke={color}
      strokeWidth={strokeWidth}
      {...DEFAULTS}
    />
    {/* Clapper stem */}
    <Path
      d="M9 14.2 L9 15.5"
      stroke={color}
      strokeWidth={strokeWidth}
      {...DEFAULTS}
    />
    {/* Top nub */}
    <Path
      d="M8.2 3.2 L9.8 3.2"
      stroke={color}
      strokeWidth={strokeWidth}
      {...DEFAULTS}
    />
  </Svg>
);

/* ─────────────────────────────────────────────────────────────
 * StepStar
 * Completed / done. 5-point star, deliberately slightly
 * irregular so it reads as hand-drawn.
 * ───────────────────────────────────────────────────────────── */
export const StepStar: React.FC<IconProps> = ({
  size = 18,
  color = '#C9A84C',
  strokeWidth = 1.8,
  style,
}) => (
  <Svg width={size} height={size} viewBox="0 0 18 18" style={style}>
    <Path
      d="M9 1.8 L11.1 6.5 L16.2 7.1 L12.3 10.7 L13.4 15.8 L9 13.3 L4.6 15.8 L5.7 10.7 L1.8 7.1 L6.9 6.5 Z"
      stroke={color}
      strokeWidth={strokeWidth}
      {...DEFAULTS}
    />
  </Svg>
);

/* ─────────────────────────────────────────────────────────────
 * CancelX
 * Cancelled state. Two strokes that deliberately don't quite
 * meet in the center — like a quick pen slash.
 * ───────────────────────────────────────────────────────────── */
export const CancelX: React.FC<IconProps> = ({
  size = 18,
  color = '#C43A4B',
  strokeWidth = 2,
  style,
}) => (
  <Svg width={size} height={size} viewBox="0 0 18 18" style={style}>
    {/* Down-right stroke, with a tiny gap before center */}
    <Path
      d="M4.2 4.2 L8.4 8.4"
      stroke={color}
      strokeWidth={strokeWidth}
      {...DEFAULTS}
    />
    <Path
      d="M9.6 9.6 L13.8 13.8"
      stroke={color}
      strokeWidth={strokeWidth}
      {...DEFAULTS}
    />
    {/* Down-left stroke, with tiny gap */}
    <Path
      d="M13.8 4.2 L9.6 8.4"
      stroke={color}
      strokeWidth={strokeWidth}
      {...DEFAULTS}
    />
    <Path
      d="M8.4 9.6 L4.2 13.8"
      stroke={color}
      strokeWidth={strokeWidth}
      {...DEFAULTS}
    />
  </Svg>
);

/* ─────────────────────────────────────────────────────────────
 * PaymentWait
 * Hourglass. Used in the waiting_payment banner.
 * Animated variant flips 180° on a 3s ease-in-out loop.
 * ───────────────────────────────────────────────────────────── */
export const PaymentWait: React.FC<IconProps> = ({
  size = 18,
  color = '#C9A84C',
  strokeWidth = 1.8,
  style,
}) => (
  <Svg width={size} height={size} viewBox="0 0 18 18" style={style}>
    {/* Top rail */}
    <Path d="M4.5 2.8 L13.5 2.8" stroke={color} strokeWidth={strokeWidth} {...DEFAULTS} />
    {/* Bottom rail */}
    <Path d="M4.5 15.2 L13.5 15.2" stroke={color} strokeWidth={strokeWidth} {...DEFAULTS} />
    {/* Outer hourglass silhouette */}
    <Path
      d="M5 2.8 C5 6 8 8.5 9 9 C10 9.5 13 12 13 15.2"
      stroke={color}
      strokeWidth={strokeWidth}
      {...DEFAULTS}
    />
    <Path
      d="M13 2.8 C13 6 10 8.5 9 9 C8 9.5 5 12 5 15.2"
      stroke={color}
      strokeWidth={strokeWidth}
      {...DEFAULTS}
    />
    {/* Sand dots — tiny detail that tells you it's not just a bowtie */}
    <Circle cx="9" cy="6.5" r="0.4" fill={color} />
    <Circle cx="8" cy="12.8" r="0.4" fill={color} />
    <Circle cx="10" cy="13.1" r="0.4" fill={color} />
  </Svg>
);

/* ─────────────────────────────────────────────────────────────
 * PaymentWaitAnimated
 * PaymentWait wrapped in an infinite 180° rotation loop.
 * Used as the hero icon in the waiting_payment banner.
 * ───────────────────────────────────────────────────────────── */
export const PaymentWaitAnimated: React.FC<IconProps> = (props) => {
  const rot = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(rot, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(400),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [rot]);

  const rotate = rot.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Animated.View style={[{ transform: [{ rotate }] }, props.style]}>
      <PaymentWait {...props} style={undefined} />
    </Animated.View>
  );
};

/* ─────────────────────────────────────────────────────────────
 * EmptyOrderGlyph — the hero image for the empty-state card.
 * A steaming coffee cup, three wavy steam lines above a
 * minimal saucered cup. Line-drawn, hand-felt.
 * ───────────────────────────────────────────────────────────── */
export const EmptyOrderGlyph: React.FC<IconProps> = ({
  size = 56,
  color = '#F5F0EB',
  strokeWidth = 1.8,
  style,
}) => (
  <Svg width={size} height={size} viewBox="0 0 56 56" style={style}>
    <G>
      {/* Steam — three waves */}
      <Path
        d="M20 8 C18 10 22 12 20 14 C18 16 22 18 20 20"
        stroke={color}
        strokeWidth={strokeWidth}
        {...DEFAULTS}
      />
      <Path
        d="M28 6 C26 8 30 10 28 12 C26 14 30 16 28 18"
        stroke={color}
        strokeWidth={strokeWidth}
        {...DEFAULTS}
      />
      <Path
        d="M36 8 C34 10 38 12 36 14 C34 16 38 18 36 20"
        stroke={color}
        strokeWidth={strokeWidth}
        {...DEFAULTS}
      />
      {/* Cup body */}
      <Path
        d="M13 25 L13 40 C13 44 16 47 20 47 L32 47 C36 47 39 44 39 40 L39 25 Z"
        stroke={color}
        strokeWidth={strokeWidth}
        {...DEFAULTS}
      />
      {/* Handle */}
      <Path
        d="M39 28 C43 28 45 30 45 33 C45 36 43 38 39 38"
        stroke={color}
        strokeWidth={strokeWidth}
        {...DEFAULTS}
      />
      {/* Saucer */}
      <Path
        d="M9 49 L43 49"
        stroke={color}
        strokeWidth={strokeWidth}
        {...DEFAULTS}
      />
      {/* Top rim line */}
      <Path
        d="M13 25 L39 25"
        stroke={color}
        strokeWidth={strokeWidth}
        {...DEFAULTS}
      />
    </G>
  </Svg>
);

/* ─────────────────────────────────────────────────────────────
 * CtaForkKnife — replaces the generic Ionicons restaurant icon
 * on the "Pesan Sekarang" bounce CTA.
 * ───────────────────────────────────────────────────────────── */
export const CtaForkKnife: React.FC<IconProps> = ({
  size = 18,
  color = '#FFFFFF',
  strokeWidth = 1.8,
  style,
}) => (
  <Svg width={size} height={size} viewBox="0 0 18 18" style={style}>
    {/* Fork (left): three tines + shaft */}
    <Line x1="5" y1="2.5" x2="5" y2="6" stroke={color} strokeWidth={strokeWidth} {...DEFAULTS} />
    <Line x1="7" y1="2.5" x2="7" y2="6" stroke={color} strokeWidth={strokeWidth} {...DEFAULTS} />
    <Line x1="3" y1="2.5" x2="3" y2="6" stroke={color} strokeWidth={strokeWidth} {...DEFAULTS} />
    <Path
      d="M3 6 C3 7 4 8 5 8 L5 15.5"
      stroke={color}
      strokeWidth={strokeWidth}
      {...DEFAULTS}
    />
    <Path
      d="M7 6 C7 7 6 8 5 8"
      stroke={color}
      strokeWidth={strokeWidth}
      {...DEFAULTS}
    />
    {/* Knife (right): blade + handle */}
    <Path
      d="M13 2.5 C11 4 11 7 13 8.5 L13 15.5"
      stroke={color}
      strokeWidth={strokeWidth}
      {...DEFAULTS}
    />
  </Svg>
);

/* ─────────────────────────────────────────────────────────────
 * ChevronDown — used for the expand indicator. Line-art variant.
 * ───────────────────────────────────────────────────────────── */
export const ChevronDown: React.FC<IconProps> = ({
  size = 14,
  color = '#A09890',
  strokeWidth = 1.8,
  style,
}) => (
  <Svg width={size} height={size} viewBox="0 0 14 14" style={style}>
    <Path
      d="M3 5 L7 9 L11 5"
      stroke={color}
      strokeWidth={strokeWidth}
      {...DEFAULTS}
    />
  </Svg>
);

export const ChevronUp: React.FC<IconProps> = ({
  size = 14,
  color = '#A09890',
  strokeWidth = 1.8,
  style,
}) => (
  <Svg width={size} height={size} viewBox="0 0 14 14" style={style}>
    <Path
      d="M3 9 L7 5 L11 9"
      stroke={color}
      strokeWidth={strokeWidth}
      {...DEFAULTS}
    />
  </Svg>
);

/* ─────────────────────────────────────────────────────────────
 * SyncDot — used in the "last updated" floating tag. A small
 * ticking circle with a dot instead of Ionicons' sync icon.
 * ───────────────────────────────────────────────────────────── */
export const SyncDot: React.FC<IconProps> = ({
  size = 10,
  color = '#A09890',
  strokeWidth = 1.4,
  style,
}) => (
  <Svg width={size} height={size} viewBox="0 0 10 10" style={style}>
    <Circle cx="5" cy="5" r="3.6" stroke={color} strokeWidth={strokeWidth} fill="none" />
    <Circle cx="5" cy="5" r="1" fill={color} />
  </Svg>
);

/* ─────────────────────────────────────────────────────────────
 * ArrowRight — minimal line arrow for inline CTAs (e.g. "Buka DANA →")
 * ───────────────────────────────────────────────────────────── */
export const ArrowRight: React.FC<IconProps> = ({
  size = 14,
  color = '#C9A84C',
  strokeWidth = 1.8,
  style,
}) => (
  <Svg width={size} height={size} viewBox="0 0 14 14" style={style}>
    <Path d="M2 7 L12 7" stroke={color} strokeWidth={strokeWidth} {...DEFAULTS} />
    <Path d="M8 3 L12 7 L8 11" stroke={color} strokeWidth={strokeWidth} {...DEFAULTS} />
  </Svg>
);
