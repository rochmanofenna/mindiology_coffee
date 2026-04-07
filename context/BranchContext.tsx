// context/BranchContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import {
  getBranchSettings, getMenu, transformMenuResponse,
  type ESBBranchSettings, type AppMenuItem, type AppCategory, type AppTabGroup,
} from '@/services/api';
import { type PaymentMethod, PAYMENT_METHODS } from '@/constants/payments';
import { cacheGet, cacheSet, cacheClear, MENU_TTL } from '@/utils/cache';

interface BranchState {
  loading: boolean;
  error: string | null;
  branch: ESBBranchSettings | null;
  tabGroups: AppTabGroup[];
  menu: Record<string, AppCategory>;
  allItems: AppMenuItem[];
  taxRate: number;
  serviceRate: number;
  branchCode: string;
  visitPurposeID: string;
  paymentMethods: PaymentMethod[];
  reload: () => Promise<void>;
  setBranchCode: (code: string) => void;
  currentBranchCode: string;
}

const BranchContext = createContext<BranchState | null>(null);

const DEFAULT_BRANCH = 'MDOUT';
const DEFAULT_VISIT_PURPOSE = '63'; // takeAway

export function BranchProvider({ children }: { children: ReactNode }) {
  const [branchCode, setBranchCodeState] = useState('MDOUT');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branch, setBranch] = useState<ESBBranchSettings | null>(null);
  const [tabGroups, setTabGroups] = useState<AppTabGroup[]>([]);
  const [menu, setMenu] = useState<Record<string, AppCategory>>({});
  const [allItems, setAllItems] = useState<AppMenuItem[]>([]);

  const branchCodeRef = useRef(branchCode);
  branchCodeRef.current = branchCode;

  // Clear old branch cache on branch switch
  const prevBranchCode = useRef(branchCode);
  useEffect(() => {
    if (prevBranchCode.current !== branchCode) {
      cacheClear(`cache:menu_${prevBranchCode.current}`);
      prevBranchCode.current = branchCode;
    }
  }, [branchCode]);

  const load = useCallback(async () => {
    const code = branchCodeRef.current;
    setLoading(true);
    setError(null);

    // Stale-while-revalidate: serve cached data immediately
    const cachedMenu = await cacheGet<{ tabGroups: AppTabGroup[]; menu: Record<string, AppCategory>; allItems: AppMenuItem[] }>(`cache:menu_${code}`, MENU_TTL);
    const cachedBranch = await cacheGet<ESBBranchSettings>(`cache:branch_${code}`, MENU_TTL);

    let hadCache = false;
    if (cachedMenu && cachedBranch) {
      setBranch(cachedBranch);
      setTabGroups(cachedMenu.tabGroups);
      setMenu(cachedMenu.menu);
      setAllItems(cachedMenu.allItems);
      setLoading(false);
      hadCache = true;
      // Continue to fetch fresh data in background (don't return)
    }

    try {
      const [branchData, menuData] = await Promise.all([
        getBranchSettings(code),
        getMenu(code, DEFAULT_VISIT_PURPOSE),
      ]);
      setBranch(branchData);
      const transformed = transformMenuResponse(menuData);
      setTabGroups(transformed.tabGroups);
      setMenu(transformed.menu);
      setAllItems(transformed.allItems);
      await cacheSet(`cache:menu_${code}`, transformed);
      await cacheSet(`cache:branch_${code}`, branchData);
    } catch (e: any) {
      console.error('BranchProvider load error:', e);
      // Only set error if there's no cached data already showing
      if (!hadCache) {
        setError(e.message || 'Failed to load branch data');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [branchCode, load]);

  const taxRate = (branch?.taxValue ?? 10) / 100;
  const serviceRate = (branch?.additionalTaxValue ?? 0) / 100;

  // Derive payment methods from ESB branch settings, fall back to hardcoded
  const paymentMethods: PaymentMethod[] = (() => {
    if (!branch?.payment) return PAYMENT_METHODS;
    const methods: PaymentMethod[] = [];
    // Online payment methods from ESB
    if (branch.payment.online?.length) {
      for (const m of branch.payment.online) {
        methods.push({
          id: m.id,
          name: m.name,
          available: m.available,
          icon: m.id === 'dana' ? 'wallet-outline' : m.id === 'ovo' ? 'wallet-outline' : m.id === 'qris' ? 'qr-code-outline' : m.id === 'shopeepay' ? 'cart-outline' : 'wallet-outline',
          ...(!m.available ? { comingSoonText: 'Segera hadir' } : {}),
        });
      }
    }
    // Pay at cashier
    if (branch.payment.atCashier) {
      methods.push({ id: 'cashier', name: 'Bayar di Kasir', available: true, icon: 'cash-outline' });
    }
    return methods.length > 0 ? methods : PAYMENT_METHODS;
  })();

  return (
    <BranchContext.Provider value={{
      loading, error, branch,
      tabGroups, menu, allItems,
      taxRate, serviceRate,
      branchCode,
      visitPurposeID: DEFAULT_VISIT_PURPOSE,
      paymentMethods,
      reload: load,
      setBranchCode: setBranchCodeState,
      currentBranchCode: branchCode,
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
