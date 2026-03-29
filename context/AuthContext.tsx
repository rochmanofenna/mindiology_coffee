// context/AuthContext.tsx — Authentication state manager
import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { checkMembership } from '@/services/api';
import {
  cacheGet,
  cacheSet,
  cacheClear,
  storageGet,
  storageSet,
  storageRemove,
  AUTH_USER_KEY,
  AUTH_TOKEN_KEY,
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
          storageGet(AUTH_TOKEN_KEY),
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
    const memberData = await checkMembership(branch, phone);

    const newUser: User = {
      phone,
      authkey,
      name: memberData.memberName || memberData.name || phone,
      memberCode: memberData.memberCode || memberData.memberID || `KMR-${phone.slice(-6)}`,
      points: memberData.totalPoint || memberData.points || 0,
      tier: determineTier(memberData.totalPoint || 0),
    };

    await Promise.all([
      cacheSet(AUTH_USER_KEY, newUser),
      storageSet(AUTH_TOKEN_KEY, authkey),
      storageRemove(GUEST_KEY),
    ]);

    setUser(newUser);
    setIsGuest(false);
  };

  const logout = async () => {
    await Promise.all([
      cacheClear(AUTH_USER_KEY),
      storageRemove(AUTH_TOKEN_KEY),
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
