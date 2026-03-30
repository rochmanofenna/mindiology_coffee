// ─── services/api.ts ─── Expo app API client ───
// All ESB calls go through your middleware (server/index.ts)
import Constants from 'expo-constants';

function getApiBase(): string {
  if (!__DEV__) return 'https://api.kamarasan.app';

  // In dev, derive middleware URL from Expo's dev server host
  const debuggerHost =
    Constants.expoConfig?.hostUri ??        // SDK 49+
    (Constants as any).manifest?.debuggerHost;  // older SDKs
  if (debuggerHost) {
    const host = debuggerHost.split(':')[0]; // strip metro port
    return `http://${host}:3001`;
  }
  return 'http://localhost:3001'; // web fallback
}

const API = getApiBase();

type Opts = { branch?: string; body?: any; method?: string };

const api = async (path: string, opts: Opts = {}) => {
  const url = new URL(`${API}${path}`);
  if (opts.branch) url.searchParams.set('branch', opts.branch);

  if (__DEV__) console.log(`[api] ${url}`);
  const res = await fetch(url.toString(), {
    method: opts.method || (opts.body ? 'POST' : 'GET'),
    headers: opts.body ? { 'Content-Type': 'application/json' } : {},
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
  });
  if (!res.ok) {
    const text = await res.text();
    let err: any;
    try { err = JSON.parse(text); } catch { err = { message: text || `HTTP ${res.status}` }; }
    throw err;
  }
  return res.json();
};

// ─── ESB Response Types ───

export interface ESBMenuItem {
  menuID: number;
  menuName: string;
  menuShortName: string;
  menuCode: string;
  sellPrice: number;
  originalSellPrice: number;
  price: number;
  originalPrice: number;
  flagTax: boolean;
  flagOtherTax: boolean;
  imageUrl: string;
  imageOptimUrl: string;
  imageThumbnailUrl: string;
  description: string;
  qty: number;
  flagSoldOut: boolean;
  flagRecommendation: number;
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
      menuExtraShortName: string;
      sellPrice: number;
      price: number;
      minExtraQty: number;
      maxExtraQty: number;
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
  orderModes: { type: string; visitPurposeID: string; flagShowESBOrder: boolean }[];
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

// ─── App Types ───

export interface AppMenuItem {
  id: string;
  menuID: number;
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
  firstImageUrl: string;
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
    price: esb.sellPrice / 1000,
    apiPrice: esb.sellPrice,
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

const CATEGORY_EMOJIS: Record<string, string> = {
  'APP': '🍽', 'DES': '🍰', 'MAI': '🍗', 'JUI': '🧃', 'SOF': '🥤',
  'camilan': '🍘', 'ekstra': '➕', 'modifier': '⚙️',
  'nasimiekwetiawbakso': '🍜', 'nasimangkok': '🍚', 'nasimeremmelek': '🍛',
  'nasinusantara': '🍚', 'pastry': '🥐', 'QFAPP': '🥗', 'QFMAIN': '🍗',
  'QFSOUP': '🍲', 'RBSIJ': '🍚', 'KS-MS': '🥩', 'KS-KS': '🥩',
};

function getCategoryEmoji(code: string): string {
  for (const [prefix, emoji] of Object.entries(CATEGORY_EMOJIS)) {
    if (code.toLowerCase().startsWith(prefix.toLowerCase())) return emoji;
  }
  return '🍽';
}

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
    if (!cat.menuCategoryCode) continue;
    const catKeys: string[] = [];

    for (const detail of cat.menuCategoryDetails) {
      const key = detail.menuCategoryDetailCode || `cat-${detail.menuCategoryDetailID}`;
      const items = detail.menus
        .map(transformMenuItem)
        .filter(m => m.apiPrice > 0);

      if (items.length === 0) continue;

      const firstImage = items.find(i => i.imageUrl)?.imageUrl || '';
      menu[key] = {
        key,
        label: detail.menuCategoryDetailDesc,
        emoji: getCategoryEmoji(detail.menuCategoryDetailCode),
        items,
        firstImageUrl: firstImage,
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

  // Deduplicate tab groups by label (merges e.g. two "Makanan" groups)
  const merged: AppTabGroup[] = [];
  const seen = new Map<string, number>();
  for (const tg of tabGroups) {
    const idx = seen.get(tg.label);
    if (idx !== undefined) {
      merged[idx].categories.push(...tg.categories);
    } else {
      seen.set(tg.label, merged.length);
      merged.push({ ...tg });
    }
  }

  return { tabGroups: merged, menu, allItems };
}

// ─── API Functions ───

export const getBranches = (lat: number, lng: number) =>
  api(`/api/branches?lat=${lat}&lng=${lng}`);

export const getBranchSettings = (branch: string): Promise<ESBBranchSettings> =>
  api(`/api/branch/settings?branch=${branch}`);

export const getMenu = (branch: string, visitPurpose: string): Promise<ESBMenuResponse> =>
  api(`/api/menu?branch=${branch}&visitPurpose=${visitPurpose}`);

export const getMenuDetail = (branch: string, visitPurpose: string, menuId: string) =>
  api(`/api/menu/detail?branch=${branch}&visitPurpose=${visitPurpose}&menuId=${menuId}`);

export const checkItems = (branch: string, items: any[]) =>
  api('/api/order/check-items', { body: { branch, items } });

export const calculateTotal = (branch: string, orderData: any) =>
  api('/api/order/calculate', { body: { branch, ...orderData } });

export const saveOrder = (branch: string, orderData: any, userToken?: string) =>
  api('/api/order', { body: { branch, userToken, ...orderData } });

export const getOrder = (orderId: string, branch: string) =>
  api(`/api/order/${orderId}`, { branch });

export const validatePayment = (orderId: string, branch: string) =>
  api(`/api/payment/validate/${orderId}`, { branch });

export const getVouchers = (branch: string, memberCode: string) =>
  api(`/api/vouchers?branch=${branch}&memberCode=${memberCode}`);

export const checkMembership = (branch: string, phone: string) =>
  api('/api/membership/check', { body: { branch, phoneNumber: phone, countryCode: '+62' } });

export const sendWhatsAppOTP = (branch: string): Promise<{ data: { otp: string; otpMessageUrl: string } }> =>
  api('/api/auth/whatsapp/send-otp', { body: { branch } });

export const verifyOTP = (otp: string) =>
  api('/api/auth/whatsapp/verify', { body: { otp } });

export const getPromotions = (branch: string, cartItems: any) =>
  api('/api/promotions', { body: { branch, ...cartItems } });

export const validatePromoPayment = (branch: string, data: any) =>
  api('/api/promotions/validate-payment', { body: { branch, ...data } });

export const checkDeliveryDistance = (branch: string, lat: number, lng: number) =>
  api(`/api/delivery/distance?branch=${branch}&lat=${lat}&lng=${lng}`);

export const getCourierCost = (branch: string, data: any) =>
  api('/api/delivery/courier-cost', { body: { branch, ...data } });

export const getReservationTimes = (branch: string, date: string) =>
  api(`/api/reservations/times?branch=${branch}&date=${date}`);

export const createReservation = (branch: string, data: any) =>
  api('/api/reservations', { body: { branch, ...data } });

export const getUserOrders = (userToken: string, page: number = 1) =>
  api('/api/user/orders', { body: { userToken, page } });
