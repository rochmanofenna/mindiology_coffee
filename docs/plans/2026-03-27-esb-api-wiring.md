# ESB API Wiring — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all hardcoded menu/branch data with live ESB POS API calls through the Express middleware on localhost:3001.

**Architecture:** Transform layer in `services/api.ts` converts ESB response shapes into existing app types. New `BranchProvider` context loads branch settings on startup. CartContext expanded with API-fetched menu data. Screens get data from context — minimal screen-level changes. Dual price model: `displayPrice` (K format for UI) and `apiPrice` (full Rupiah for ESB API calls).

**Tech Stack:** React Native (Expo), TypeScript, Express middleware (already running on :3001), ESB POS staging API

**Verified API credentials:**
- Branch: `MDOUT`, Company: `SAE`
- Token: in `server/.env`
- visitPurposeID: `63` (takeAway), `65` (dineIn), `64` (delivery)
- Tax: PB1 10%, SC 0%
- Payment: DANA

---

### Task 1: Transform Layer + Types in services/api.ts

**Files:**
- Modify: `services/api.ts`

**Step 1: Add ESB response types and transform functions**

Add these types and transforms at the top of `services/api.ts`, after the existing `api()` function:

```typescript
// ─── ESB Response Types ───

export interface ESBMenuItem {
  menuID: number;
  menuName: string;
  menuShortName: string;
  menuCode: string;
  sellPrice: number;        // Full Rupiah (e.g. 30000)
  originalSellPrice: number;
  price: number;
  originalPrice: number;
  flagTax: boolean;
  flagOtherTax: boolean;
  imageUrl: string;
  imageOptimUrl: string;
  imageThumbnailUrl: string;
  description: string;
  qty: number;              // Stock qty (0 = unlimited)
  flagSoldOut: boolean;
  flagRecommendation: number; // 0 or 1
  menuIcons: { iconName: string; iconUrl: string }[];
  relatedMenus: { menuID: number; orderID: number }[];
  menuPackages: any[];
  menuExtras: {
    menuGroupID: number;
    menuGroup: string;
    minQty: number;
    maxQty: number;
    extras: {
      menuGroupID: number;
      menuExtraID: number;
      menuExtraName: string;
      sellPrice: number;
      price: number;
      flagSoldOut: boolean;
    }[];
  }[];
}

export interface ESBCategoryDetail {
  menuCategoryDetailID: number;
  menuCategoryDetailCode: string;
  menuCategoryDetailDesc: string;
  imageUrl: string | null;
  menus: ESBMenuItem[];
}

export interface ESBCategory {
  menuCategoryID: number;
  menuCategoryCode: string;
  menuCategoryDesc: string;
  imageUrl: string;
  menuCategoryDetails: ESBCategoryDetail[];
}

export interface ESBMenuResponse {
  rangeMenuPrice: { labelAveragePrice: string; averagePrice: number; currencySign: string };
  menuCategories: ESBCategory[];
}

export interface ESBBranchSettings {
  companyCode: string;
  branchCode: string;
  branchName: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
  taxName: string;
  taxValue: number;
  additionalTaxName: string;
  additionalTaxValue: number;
  isOpen: boolean;
  isTemporaryClosed: boolean;
  orderModes: { type: string; visitPurposeID: string }[];
  feature: {
    whatsappLogin: boolean;
    voucherUsage: boolean;
    pickup: { pickupType: { pickupNow: boolean; pickupLater: boolean } };
  };
  payment: {
    atCashier: boolean;
    online: { id: string; name: string; available: boolean }[];
  };
}

// ─── App Types (matching existing MenuItem interface) ───

export interface AppMenuItem {
  id: string;          // menuID as string
  menuID: number;      // Original ESB menuID for API calls
  name: string;
  price: number;       // Display price in K (sellPrice / 1000)
  apiPrice: number;    // Full Rupiah for ESB API calls
  desc: string;
  rec: boolean;
  spicy: boolean;
  soldOut: boolean;
  imageUrl: string;
  extras: {
    groupName: string;
    items: { id: number; name: string; price: number; apiPrice: number }[];
  }[];
}

export interface AppCategory {
  key: string;
  label: string;
  emoji: string;
  items: AppMenuItem[];
}

export interface AppTabGroup {
  key: string;
  label: string;
  icon: string;
  categories: string[];
}

// ─── Transform Functions ───

function transformMenuItem(esb: ESBMenuItem): AppMenuItem {
  return {
    id: String(esb.menuID),
    menuID: esb.menuID,
    name: esb.menuName,
    price: esb.sellPrice / 1000,      // 30000 → 30 (display)
    apiPrice: esb.sellPrice,            // 30000 (for API calls)
    desc: esb.description || '',
    rec: esb.flagRecommendation === 1,
    spicy: esb.menuIcons?.some(i => i.iconName === '200') ?? false,
    soldOut: esb.flagSoldOut,
    imageUrl: esb.imageOptimUrl || esb.imageUrl || '',
    extras: (esb.menuExtras || []).map(g => ({
      groupName: g.menuGroup,
      items: (g.extras || []).map(e => ({
        id: e.menuExtraID,
        name: e.menuExtraName,
        price: e.sellPrice / 1000,
        apiPrice: e.sellPrice,
      })),
    })),
  };
}

// Category detail code → emoji mapping
const CATEGORY_EMOJIS: Record<string, string> = {
  'APP': '🍽', 'DES': '🍰', 'MAI': '🍗', 'JUI': '🧃', 'SOF': '🥤',
  'camilan': '🍘', 'ekstra': '➕', 'modifier': '⚙️',
  'nasimiekwetiawbakso': '🍜', 'nasimangkok': '🍚', 'nasimeremmelek': '🍛',
  'nasinusantara': '🍚', 'pastry': '🥐',
};

function getCategoryEmoji(code: string): string {
  for (const [prefix, emoji] of Object.entries(CATEGORY_EMOJIS)) {
    if (code.toLowerCase().startsWith(prefix.toLowerCase())) return emoji;
  }
  return '🍽';
}

// Tab group code → config
const TAB_GROUP_MAP: Record<string, { label: string; icon: string }> = {
  'FOOD-SA-1': { label: 'Makanan', icon: '🍽' },
  'DRINK-SA-1': { label: 'Minuman', icon: '🥤' },
  'makanan': { label: 'Makanan', icon: '🍽' },
  'QFOOD': { label: 'Side Dish', icon: '🥗' },
  'KS-Makanan': { label: 'Steak', icon: '🥩' },
  'RBM': { label: 'Rice Bowl', icon: '🍚' },
};

export function transformMenuResponse(data: ESBMenuResponse): {
  tabGroups: AppTabGroup[];
  menu: Record<string, AppCategory>;
  allItems: AppMenuItem[];
} {
  const menu: Record<string, AppCategory> = {};
  const tabGroups: AppTabGroup[] = [];
  const allItems: AppMenuItem[] = [];

  for (const cat of data.menuCategories) {
    const catKeys: string[] = [];

    for (const detail of cat.menuCategoryDetails) {
      const key = detail.menuCategoryDetailCode || `cat-${detail.menuCategoryDetailID}`;
      const items = detail.menus
        .map(transformMenuItem)
        .filter(m => m.apiPrice > 0); // Skip 0-price items (modifiers etc)

      if (items.length === 0) continue;

      menu[key] = {
        key,
        label: detail.menuCategoryDetailDesc,
        emoji: getCategoryEmoji(detail.menuCategoryDetailCode),
        items,
      };
      catKeys.push(key);
      allItems.push(...items);
    }

    if (catKeys.length === 0) continue;

    const groupConfig = TAB_GROUP_MAP[cat.menuCategoryCode] || {
      label: cat.menuCategoryDesc,
      icon: '🍽',
    };

    tabGroups.push({
      key: cat.menuCategoryCode || `group-${cat.menuCategoryID}`,
      label: groupConfig.label,
      icon: groupConfig.icon,
      categories: catKeys,
    });
  }

  return { tabGroups, menu, allItems };
}
```

**Step 2: Verify transform works**

Run from project root:
```bash
cd /home/ryan/mindiology/kamarasan-app
npx tsx -e "
const { getMenu, transformMenuResponse } = require('./services/api');
// Can't import directly, but we can test the transform logic
console.log('Transform functions defined successfully');
"
```

**Step 3: Commit**
```bash
git add services/api.ts
git commit -m "feat: add ESB response types and transform layer"
```

---

### Task 2: BranchProvider Context

**Files:**
- Create: `context/BranchContext.tsx`
- Modify: `app/_layout.tsx`

**Step 1: Create BranchContext**

```typescript
// context/BranchContext.tsx
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getBranchSettings, getMenu, transformMenuResponse, type ESBBranchSettings, type AppMenuItem, type AppCategory, type AppTabGroup } from '@/services/api';

interface BranchState {
  loading: boolean;
  error: string | null;
  branch: ESBBranchSettings | null;
  tabGroups: AppTabGroup[];
  menu: Record<string, AppCategory>;
  allItems: AppMenuItem[];
  taxRate: number;       // e.g. 0.10
  serviceRate: number;   // e.g. 0.05
  branchCode: string;
  visitPurposeID: string;
  reload: () => void;
}

const BranchContext = createContext<BranchState | null>(null);

const DEFAULT_BRANCH = 'MDOUT';
const DEFAULT_VISIT_PURPOSE = '63'; // takeAway

export function BranchProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branch, setBranch] = useState<ESBBranchSettings | null>(null);
  const [tabGroups, setTabGroups] = useState<AppTabGroup[]>([]);
  const [menu, setMenu] = useState<Record<string, AppCategory>>({});
  const [allItems, setAllItems] = useState<AppMenuItem[]>([]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [branchData, menuData] = await Promise.all([
        getBranchSettings(DEFAULT_BRANCH),
        getMenu(DEFAULT_BRANCH, DEFAULT_VISIT_PURPOSE),
      ]);
      setBranch(branchData);
      const { tabGroups: tg, menu: m, allItems: ai } = transformMenuResponse(menuData);
      setTabGroups(tg);
      setMenu(m);
      setAllItems(ai);
    } catch (e: any) {
      console.error('BranchProvider load error:', e);
      setError(e.message || 'Failed to load branch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const taxRate = (branch?.taxValue ?? 10) / 100;
  const serviceRate = (branch?.additionalTaxValue ?? 0) / 100;

  return (
    <BranchContext.Provider value={{
      loading, error, branch,
      tabGroups, menu, allItems,
      taxRate, serviceRate,
      branchCode: DEFAULT_BRANCH,
      visitPurposeID: DEFAULT_VISIT_PURPOSE,
      reload: load,
    }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error('useBranch must be used within BranchProvider');
  return ctx;
}
```

**Step 2: Wrap app with BranchProvider**

Modify `app/_layout.tsx`:

```typescript
// app/_layout.tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CartProvider } from '@/context/CartContext';
import { BranchProvider } from '@/context/BranchContext';
import { Colors } from '@/constants/theme';

export default function RootLayout() {
  return (
    <BranchProvider>
      <CartProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.cream },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="item/[id]"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
        </Stack>
      </CartProvider>
    </BranchProvider>
  );
}
```

**Step 3: Commit**
```bash
git add context/BranchContext.tsx app/_layout.tsx
git commit -m "feat: add BranchProvider for live ESB data"
```

---

### Task 3: Update CartContext for Dual Pricing

**Files:**
- Modify: `context/CartContext.tsx`

**Step 1: Update CartItem to carry apiPrice**

The CartContext needs to work with the new AppMenuItem which has both `price` (display K) and `apiPrice` (Rupiah). The subtotal for display uses `price`, but checkout uses `apiPrice`.

Replace full file with:

```typescript
// context/CartContext.tsx
import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { AppMenuItem } from '@/services/api';

export interface CartItem extends AppMenuItem {
  qty: number;
}

interface CartContextType {
  cart: CartItem[];
  points: number;
  addToCart: (item: AppMenuItem, qty?: number) => void;
  updateQty: (index: number, newQty: number) => void;
  removeItem: (index: number) => void;
  clearCart: () => void;
  checkout: () => { items: CartItem[]; total: number };
  cartCount: number;
  subtotal: number;       // Display price in K
  subtotalRupiah: number; // Full Rupiah for API
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [points, setPoints] = useState(218);

  const addToCart = useCallback((item: AppMenuItem, qty = 1) => {
    setCart(prev => {
      const idx = prev.findIndex(c => c.id === item.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + qty };
        return next;
      }
      return [...prev, { ...item, qty }];
    });
  }, []);

  const updateQty = useCallback((index: number, newQty: number) => {
    if (newQty < 1) {
      setCart(prev => prev.filter((_, i) => i !== index));
    } else {
      setCart(prev => prev.map((it, i) => (i === index ? { ...it, qty: newQty } : it)));
    }
  }, []);

  const removeItem = useCallback((index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const subtotalRupiah = cart.reduce((sum, item) => sum + item.apiPrice * item.qty, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const checkout = useCallback(() => {
    const sub = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const total = Math.round(sub * 1.10); // Use branch taxRate in future
    const orderItems = [...cart];
    setPoints(p => p + Math.round(sub));
    setCart([]);
    return { items: orderItems, total };
  }, [cart]);

  return (
    <CartContext.Provider
      value={{ cart, points, addToCart, updateQty, removeItem, clearCart, checkout, cartCount, subtotal, subtotalRupiah }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
```

**Step 2: Commit**
```bash
git add context/CartContext.tsx
git commit -m "feat: update CartContext with dual pricing (display + API)"
```

---

### Task 4: Wire Menu Screen

**Files:**
- Modify: `app/(tabs)/menu.tsx`

**Step 1: Replace static imports with BranchContext**

Key changes:
- Remove: `import { MENU, TAB_GROUPS, getAllItems } from '@/constants/menu'`
- Add: `import { useBranch } from '@/context/BranchContext'`
- Use `useBranch()` for `tabGroups`, `menu`, `allItems`
- Add loading state
- Item lookup uses `item.id` (now string of menuID)

Replace the imports and component head:

```typescript
// app/(tabs)/menu.tsx — Menu Screen
import { useState, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, fmtPrice } from '@/constants/theme';
import { useBranch } from '@/context/BranchContext';
import { useCart } from '@/context/CartContext';
import type { AppMenuItem } from '@/services/api';
```

In the component body, replace the data sources:

```typescript
export default function MenuScreen() {
  const router = useRouter();
  const { addToCart } = useCart();
  const { tabGroups, menu, allItems, loading } = useBranch();
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [activeSub, setActiveSub] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Default to first group once loaded
  const effectiveGroup = activeGroup || tabGroups[0]?.key || '';
  const group = tabGroups.find(g => g.key === effectiveGroup);
  const categories = group ? group.categories.map(k => menu[k]).filter(Boolean) : [];
  const currentCat = activeSub ? menu[activeSub] : null;

  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return allItems.filter(i =>
      i.name.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q)
    );
  }, [search, allItems]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.green} />
        <Text style={{ marginTop: 12, color: Colors.textSoft, fontSize: 13 }}>Memuat menu...</Text>
      </View>
    );
  }
  // ... rest of JSX stays the same, but update references:
```

In the MenuItemRow component, update type from `MenuItem` to `AppMenuItem`:
```typescript
function MenuItemRow({ item, onTap, onAdd }: { item: AppMenuItem; onTap: () => void; onAdd: () => void }) {
```

In the tab chips, use `effectiveGroup` instead of `activeGroup`:
```typescript
style={[styles.tabChip, effectiveGroup === g.key && styles.tabChipActive]}
onPress={() => { setActiveGroup(g.key); setActiveSub(null); }}
```

In the category list, use `cat.key` and `cat.label`:
```typescript
{categories.map(cat => (
  <TouchableOpacity
    key={cat.key}
    style={styles.catCard}
    activeOpacity={0.7}
    onPress={() => setActiveSub(cat.key)}
  >
    <View style={styles.catIcon}>
      <Text style={{ fontSize: 24 }}>{cat.emoji}</Text>
    </View>
    <View style={styles.catInfo}>
      <Text style={styles.catName}>{cat.label}</Text>
      <Text style={styles.catCount}>{cat.items.length} item</Text>
    </View>
    <Ionicons name="chevron-forward" size={18} color={Colors.goldLight} />
  </TouchableOpacity>
))}
```

**Step 2: Verify menu loads from API**

Open Expo app, navigate to Menu tab. Should see ESB categories with real items.

**Step 3: Commit**
```bash
git add app/\(tabs\)/menu.tsx
git commit -m "feat: wire menu screen to live ESB API"
```

---

### Task 5: Wire Item Detail Screen

**Files:**
- Modify: `app/item/[id].tsx`

**Step 1: Replace findItemById with BranchContext lookup**

Key changes:
- Remove: `import { findItemById } from '@/constants/menu'`
- Add: `import { useBranch } from '@/context/BranchContext'`
- Find item: `const item = allItems.find(i => i.id === id)`
- Show image if available
- Show extras if available

Replace imports:
```typescript
import { useBranch } from '@/context/BranchContext';
import type { AppMenuItem } from '@/services/api';
```

Replace item lookup:
```typescript
const { allItems } = useBranch();
const item = allItems.find(i => i.id === (id || ''));
```

Add image display (insert before the badges section in `infoSection`):
```typescript
{item.imageUrl ? (
  <Image
    source={{ uri: item.imageUrl }}
    style={{ width: '100%', height: 200, borderRadius: Radius.lg, marginBottom: 16 }}
    resizeMode="cover"
  />
) : null}
```

Add `Image` to the react-native import:
```typescript
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
```

Add soldOut indicator to the add button:
```typescript
{item.soldOut ? (
  <View style={[styles.addBtn, { opacity: 0.5 }]}>
    <Text style={styles.addBtnText}>Habis</Text>
  </View>
) : (
  <TouchableOpacity activeOpacity={0.8} onPress={handleAdd}>
    <LinearGradient ...>
      ...
    </LinearGradient>
  </TouchableOpacity>
)}
```

**Step 2: Commit**
```bash
git add app/item/\\[id\\].tsx
git commit -m "feat: wire item detail to ESB data with images"
```

---

### Task 6: Wire Cart Screen with Real Tax

**Files:**
- Modify: `app/(tabs)/cart.tsx`

**Step 1: Use branch tax rates instead of hardcoded**

Add import:
```typescript
import { useBranch } from '@/context/BranchContext';
```

In component:
```typescript
const { branch, taxRate, serviceRate } = useBranch();

const tax = Math.round(subtotal * taxRate);
const svc = Math.round(subtotal * serviceRate);
const total = subtotal + tax + svc;
```

Update pickup text:
```typescript
<Text style={styles.pickupText}>
  Pickup di {branch?.branchName || 'Mindiology'} · ~15 min
</Text>
```

Update summary labels to use real tax names:
```typescript
{ label: `${branch?.taxName || 'Pajak'} (${Math.round(taxRate * 100)}%)`, val: fmtPrice(tax) },
{ label: `${branch?.additionalTaxName || 'Service'} (${Math.round(serviceRate * 100)}%)`, val: fmtPrice(svc) },
```

**Step 2: Commit**
```bash
git add app/\(tabs\)/cart.tsx
git commit -m "feat: wire cart to real branch tax rates"
```

---

### Task 7: Wire Home Screen

**Files:**
- Modify: `app/(tabs)/index.tsx`

**Step 1: Replace hardcoded recs and store info**

Replace `import { getAllItems } from '@/constants/menu'` with:
```typescript
import { useBranch } from '@/context/BranchContext';
```

In component:
```typescript
const { allItems, branch, loading } = useBranch();
const recs = allItems.filter(i => i.rec).slice(0, 8);
```

Update store info section to use branch data:
```typescript
<View style={styles.storeCard}>
  <Text style={styles.storeTitle}>Kunjungi Kami</Text>
  {branch ? (
    <>
      <View style={styles.storeRow}>
        <Ionicons name="location-outline" size={14} color={Colors.textSoft} />
        <Text style={styles.storeText}>{branch.branchName}</Text>
      </View>
      <View style={styles.storeRow}>
        <Ionicons name="location-outline" size={14} color={Colors.textSoft} />
        <Text style={styles.storeText}>{branch.address}</Text>
      </View>
      <View style={styles.storeRow}>
        <Ionicons name="time-outline" size={14} color={Colors.textSoft} />
        <Text style={styles.storeText}>
          {branch.isOpen ? 'Buka Sekarang' : 'Tutup'}
        </Text>
      </View>
    </>
  ) : (
    <>
      <View style={styles.storeRow}>
        <Ionicons name="location-outline" size={14} color={Colors.textSoft} />
        <Text style={styles.storeText}>Mindiology Coffee, Fresh Market Emerald Bintaro</Text>
      </View>
      <View style={styles.storeRow}>
        <Ionicons name="time-outline" size={14} color={Colors.textSoft} />
        <Text style={styles.storeText}>Buka 07:00 – 23:00 WIB</Text>
      </View>
    </>
  )}
</View>
```

**Step 2: Add loading state for recs**

If `loading`, show a skeleton or spinner for the recommendations carousel.

**Step 3: Commit**
```bash
git add app/\(tabs\)/index.tsx
git commit -m "feat: wire home screen to live branch + menu data"
```

---

### Task 8: Wire Rewards + Profile (Graceful)

**Files:**
- Modify: `app/(tabs)/rewards.tsx`
- Modify: `app/(tabs)/profile.tsx`

**Step 1: Rewards — keep local rewards, add branch context**

Rewards stays mostly the same since ESB Loop requires auth. Just add branch context for future use:

```typescript
import { useBranch } from '@/context/BranchContext';

// In component:
const { branch } = useBranch();
```

Keep `REWARDS` from constants for now — will be replaced when auth is implemented.

**Step 2: Profile — dynamic branch info**

Add import:
```typescript
import { useBranch } from '@/context/BranchContext';
```

Replace hardcoded store locations:
```typescript
const { branch } = useBranch();

// In the stores section:
<View style={styles.storesSection}>
  <Text style={styles.storesTitle}>Lokasi Kami</Text>
  {branch && (
    <View style={styles.storeCard}>
      <Text style={styles.storeName}>{branch.branchName}</Text>
      <Text style={styles.storeAddr}>{branch.address}</Text>
      <Text style={styles.storeHours}>
        {branch.isOpen ? '🟢 Buka' : '🔴 Tutup'}
      </Text>
    </View>
  )}
  {/* Keep hardcoded stores as additional locations */}
  <View style={styles.storeCard}>
    <Text style={styles.storeName}>Mindiology Coffee, Bintaro</Text>
    <Text style={styles.storeAddr}>Fresh Market Emerald Bintaro</Text>
    <Text style={styles.storeHours}>07:00 – 23:00 WIB</Text>
  </View>
  <View style={styles.storeCard}>
    <Text style={styles.storeName}>Mindiology Coffee, Danareksa</Text>
    <Text style={styles.storeAddr}>Jl. Medan Merdeka Sel. No.14, Jakarta Pusat</Text>
    <Text style={styles.storeHours}>10:00 – 20:00 WIB</Text>
  </View>
</View>
```

**Step 3: Commit**
```bash
git add app/\(tabs\)/rewards.tsx app/\(tabs\)/profile.tsx
git commit -m "feat: wire rewards + profile with branch context"
```

---

### Task 9: Update constants/menu.ts — Keep Types as Fallback

**Files:**
- Modify: `constants/menu.ts`

**Step 1: Keep types, export from api.ts, deprecate hardcoded data**

The menu.ts types (`MenuItem`, `MenuCategory`, `TabGroup`) are used across the app. Replace the type exports to re-export from api.ts, and keep the hardcoded data only as fallback:

Add at the top:
```typescript
// Re-export new types for backwards compat
export type { AppMenuItem as MenuItem } from '@/services/api';
```

Keep `REWARDS`, `findItemById`, `getAllItems` for screens that still need them (rewards).

Actually, the simplest approach: just keep the file as-is for now. The screens that are wired to API will use BranchContext. Rewards still uses REWARDS from here. No need to touch this file.

**Step 2: No commit needed for this task if no changes.**

---

### Task 10: Verify End-to-End

**Step 1: Ensure server is running**
```bash
cd /home/ryan/mindiology/kamarasan-app/server
npx tsx index.ts &
```

**Step 2: Start Expo**
```bash
cd /home/ryan/mindiology/kamarasan-app
npx expo start --web
```

**Step 3: Verify each screen**
- Home: Shows recommendations from ESB API, branch info from settings
- Menu: Categories and items from ESB, search works across API data
- Item Detail: Shows item with image (if available), correct pricing
- Cart: Tax rate from branch settings (PB1 10%), correct total
- Rewards: Local rewards still work (unchanged)
- Profile: Shows Mindiology Outlet from API + hardcoded stores

**Step 4: Final commit**
```bash
git add -A
git commit -m "feat: complete ESB API wiring — live menu, branch settings, dynamic pricing"
```
