// context/AuthContext.tsx — Authentication state manager
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { checkMembership } from '@/services/api';
import {
  cacheGet,
  cacheSet,
  cacheClear,
  storageGet,
  storageSet,
  storageRemove,
  AUTH_USER_KEY,
  GUEST_KEY,
  CART_KEY,
} from '@/utils/cache';

export interface User {
  phone: string;
  name: string;
  memberCode: string;
  points: number;
  tier: 'Perunggu' | 'Perak' | 'Emas';
  authkey: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isGuest: boolean;
  login: (phone: string, authkey: string, branch: string) => Promise<void>;
  logout: () => Promise<void>;
  setGuest: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

function determineTier(points: number): 'Perunggu' | 'Perak' | 'Emas' {
  if (points >= 500) return 'Emas';
  if (points >= 200) return 'Perak';
  return 'Perunggu';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  // Restore persisted auth state on mount
  useEffect(() => {
    (async () => {
      try {
        const [cachedUser, token, guestFlag] = await Promise.all([
          cacheGet<User>(AUTH_USER_KEY),
          SecureStore.getItemAsync('auth_token'),
          storageGet(GUEST_KEY),
        ]);

        if (cachedUser && token) {
          setUser(cachedUser);
        }

        if (guestFlag === 'true') {
          setIsGuest(true);
        }
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (phone: string, authkey: string, branch: string) => {
    let memberData: any = null;
    try {
      memberData = await checkMembership(branch, phone);
    } catch {
      // Membership check failed (staging auth issue, network, etc.) — proceed with basic user
    }

    // No member data or not registered — create basic user
    if (!memberData || memberData?.status === 'NOT_REGISTERED' || (!memberData?.memberName && !memberData?.name && !memberData?.memberCode)) {
      const basicUser: User = {
        phone,
        authkey,
        name: phone,
        memberCode: '',
        points: 0,
        tier: 'Perunggu',
      };
      setUser(basicUser);
      await cacheSet(AUTH_USER_KEY, basicUser);
      await SecureStore.setItemAsync('auth_token', authkey);
      return;
    }

    const newUser: User = {
      phone,
      authkey,
      name: memberData.memberName || memberData.name || phone,
      memberCode: memberData.memberCode || memberData.memberID || '',
      points: memberData.totalPoint || memberData.points || 0,
      tier: determineTier(memberData.totalPoint || 0),
    };

    await Promise.all([
      cacheSet(AUTH_USER_KEY, newUser),
      SecureStore.setItemAsync('auth_token', authkey),
      storageRemove(GUEST_KEY),
    ]);

    setUser(newUser);
    setIsGuest(false);
  };

  const logout = async () => {
    await Promise.all([
      cacheClear(AUTH_USER_KEY),
      SecureStore.deleteItemAsync('auth_token'),
      storageRemove(GUEST_KEY),
      cacheClear(CART_KEY),
    ]);

    setUser(null);
    setIsGuest(false);
  };

  const setGuestMode = async () => {
    await storageSet(GUEST_KEY, 'true');
    setIsGuest(true);
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, isGuest, login, logout, setGuest: setGuestMode }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
