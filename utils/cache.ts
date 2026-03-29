// utils/cache.ts — AsyncStorage cache utility with TTL support
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Cache duration constants (milliseconds)
export const MENU_TTL = 15 * 60 * 1000;       // 15 minutes
export const STORES_TTL = 24 * 60 * 60 * 1000; // 24 hours
export const CART_KEY = 'cache:cart';
export const AUTH_USER_KEY = 'cache:auth_user';
export const AUTH_TOKEN_KEY = 'cache:auth_token';
export const GUEST_KEY = 'cache:is_guest';

export async function cacheGet<T>(key: string, maxAge = Infinity): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (maxAge < Infinity && Date.now() - entry.timestamp > maxAge) return null;
    return entry.data;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, data: T): Promise<void> {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Cache write failure is non-critical
  }
}

export async function cacheClear(key: string): Promise<void> {
  try { await AsyncStorage.removeItem(key); } catch {}
}

export async function cacheClearAll(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(k => k.startsWith('cache:'));
    if (cacheKeys.length) await AsyncStorage.multiRemove(cacheKeys);
  } catch {}
}

/** Get raw string value (not cache-wrapped) */
export async function storageGet(key: string): Promise<string | null> {
  try { return await AsyncStorage.getItem(key); } catch { return null; }
}

/** Set raw string value (not cache-wrapped) */
export async function storageSet(key: string, value: string): Promise<void> {
  try { await AsyncStorage.setItem(key, value); } catch {}
}

/** Remove raw storage key */
export async function storageRemove(key: string): Promise<void> {
  try { await AsyncStorage.removeItem(key); } catch {}
}
