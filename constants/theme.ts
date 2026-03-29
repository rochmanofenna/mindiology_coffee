// constants/theme.ts
// Kamarasan Soulfood Nusantara — Design System

export const Colors = {
  cream: '#FDF6EC',
  parchment: '#F5EBDA',
  gold: '#C9A84C',
  goldLight: '#E8D5A0',
  green: '#1B5E3B',
  greenDeep: '#0E3A24',
  greenLight: '#2D8B5E',
  greenMint: '#D4E8DB',
  hibiscus: '#C43A4B',
  hibiscusLight: '#F2D1D5',
  brown: '#5C3D2E',
  brownLight: '#8B6B56',
  espresso: '#2A1A0E',
  white: '#FFFFFF',
  text: '#1E1E1E',
  textSoft: '#6B5D50',
  border: '#E8D5A044',
  shadow: 'rgba(27,94,59,0.08)',
  shadowMd: 'rgba(27,94,59,0.14)',
  transparent: 'transparent',
  // ISMAYA-inspired variants
  greenForest: '#1B4332',
  greenSage: '#2D6A4F',
  greenPale: '#B7E4C7',
  badgeRed: '#EF4444',
  muted: '#6B7280',
  goldAccent: '#D4A843',
  textBody: '#4A5568',
} as const;

// Font families — loaded in _layout.tsx via expo-google-fonts
export const Font = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
  extrabold: 'DMSans_800ExtraBold',
  // Display serif for brand/headings
  display: 'Fraunces_700Bold',
  displayBold: 'Fraunces_800ExtraBold',
  displayBlack: 'Fraunces_900Black',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 14,
  lg: 18,
  xl: 22,
  full: 999,
} as const;

// Consistent shadow presets
export const Shadow = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 4 },
  green: { shadowColor: Colors.green, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 4 },
  card: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
  promo: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 6 },
  action: { shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 4 },
} as const;

// Format price: 30 → "Rp 30.000"
export function fmtPrice(price: number): string {
  return `Rp ${(price * 1000).toLocaleString('id-ID')}`;
}

/** @deprecated Use fmtPrice instead — identical behavior */
export const fmtRupiah = fmtPrice;
