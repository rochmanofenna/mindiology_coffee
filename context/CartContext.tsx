// context/CartContext.tsx
import React, { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { AppMenuItem } from '@/services/api';
import { cacheGet, cacheSet, cacheClear, CART_KEY } from '@/utils/cache';

export interface SelectedExtra {
  id: number;
  name: string;
  price: number;
}

export interface CartItem extends AppMenuItem {
  qty: number;
  selectedExtras: SelectedExtra[];
  notes: string;
  /** Composite key for dedup: item id + sorted extra ids */
  cartKey: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: AppMenuItem, qty?: number, extras?: SelectedExtra[], notes?: string) => void;
  updateQty: (index: number, newQty: number) => void;
  removeItem: (index: number) => void;
  clearCart: () => void;
  checkout: (taxRate?: number, serviceRate?: number) => { items: CartItem[]; total: number };
  cartCount: number;
  subtotal: number;
  subtotalRupiah: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);

  // Restore cart from AsyncStorage on mount
  useEffect(() => {
    cacheGet<CartItem[]>(CART_KEY).then(cached => {
      if (cached && cached.length > 0) setCart(cached);
    });
  }, []);

  // Save cart to AsyncStorage on every change (debounced)
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      if (cart.length > 0) {
        cacheSet(CART_KEY, cart);
      } else {
        cacheClear(CART_KEY);
      }
    }, 500);
    return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current); };
  }, [cart]);

  const addToCart = useCallback((item: AppMenuItem, qty = 1, extras: SelectedExtra[] = [], notes = '') => {
    const extraIds = extras.map(e => e.id).sort().join(',');
    const cartKey = `${item.id}:${extraIds}`;
    setCart(prev => {
      const idx = prev.findIndex(c => c.cartKey === cartKey);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + qty };
        return next;
      }
      return [...prev, { ...item, qty, selectedExtras: extras, notes, cartKey }];
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

  const clearCart = useCallback(() => {
    setCart([]);
    cacheClear(CART_KEY);
  }, []);

  const subtotal = cart.reduce((sum, item) => {
    const extrasPrice = item.selectedExtras.reduce((s, e) => s + e.price, 0);
    return sum + (item.price + extrasPrice) * item.qty;
  }, 0);
  const subtotalRupiah = cart.reduce((sum, item) => sum + item.apiPrice * item.qty, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  const checkout = useCallback((taxRate = 0.10, serviceRate = 0) => {
    const sub = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const tax = Math.round(sub * taxRate);
    const svc = Math.round(sub * serviceRate);
    const total = sub + tax + svc;
    const orderItems = [...cart];
    setCart([]);
    return { items: orderItems, total };
  }, [cart]);

  return (
    <CartContext.Provider
      value={{ cart, addToCart, updateQty, removeItem, clearCart, checkout, cartCount, subtotal, subtotalRupiah }}
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
