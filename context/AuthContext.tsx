// context/AuthContext.tsx — Authentication state manager
// Supports: WhatsApp OTP, Sign in with Apple, Guest mode
// Apple users can browse without ESB link; phone linking happens at checkout.
import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Sentry from '@sentry/react-native';
import { Platform } from 'react-native';
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

export type LoginMethod = 'whatsapp' | 'apple' | 'guest';

export interface User {
  phone: string;
  name: string;
  memberCode: string;
  points: number;
  tier: 'Perunggu' | 'Perak' | 'Emas';
  authkey: string;
  // Apple Sign In fields
  appleUserID?: string;
  appleEmail?: string;
  loginMethod: LoginMethod;
  esbLinked: boolean;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isGuest: boolean;
  login: (phone: string, authkey: string, branch: string, verifiedName?: string) => Promise<void>;
  loginWithApple: () => Promise<void>;
  linkESBAccount: (phone: string, authkey: string, branch: string) => Promise<void>;
  logout: () => Promise<void>;
  setGuest: () => Promise<void>;
  updateName: (name: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

function determineTier(points: number): 'Perunggu' | 'Perak' | 'Emas' {
  if (points >= 500) return 'Emas';
  if (points >= 200) return 'Perak';
  return 'Perunggu';
}

/** Persist user to AsyncStorage (authkey stripped for security). */
async function persistUser(user: User) {
  await cacheSet(AUTH_USER_KEY, { ...user, authkey: '' });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  // ─── Restore persisted auth state on mount ───
  useEffect(() => {
    (async () => {
      try {
        const [cachedUser, token, guestFlag] = await Promise.all([
          cacheGet<User>(AUTH_USER_KEY),
          SecureStore.getItemAsync('auth_token'),
          storageGet(GUEST_KEY),
        ]);

        if (cachedUser) {
          // Backward compat: users cached before auth overhaul won't have these fields
          const loginMethod = cachedUser.loginMethod || (cachedUser.appleUserID ? 'apple' : 'whatsapp');
          const esbLinked = cachedUser.esbLinked ?? (!!token && !!cachedUser.phone);

          if (loginMethod === 'apple' && !esbLinked) {
            // Apple user without ESB link — restore without authkey
            setUser({ ...cachedUser, loginMethod, esbLinked, authkey: '' });
          } else if (token) {
            // WhatsApp user or linked Apple user — restore with authkey
            setUser({ ...cachedUser, loginMethod, esbLinked: true, authkey: token });
          }
          // If no token and not an unlinked Apple user, fall through to guest/welcome
        }

        if (guestFlag === 'true' && !cachedUser) {
          setIsGuest(true);
        }
      } catch (err) {
        Sentry.captureException(err, { tags: { context: 'auth_restore' } });
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ─── WhatsApp OTP login ───
  const login = useCallback(async (phone: string, authkey: string, branch: string, verifiedName?: string) => {
    let memberData: any = null;
    try {
      memberData = await checkMembership(branch, phone);
    } catch {
      // Membership check failed — proceed with basic user
    }

    const isRegistered = memberData
      && memberData.status !== 'NOT_REGISTERED'
      && (memberData.memberName || memberData.name || memberData.memberCode);

    const newUser: User = {
      phone,
      authkey,
      name: isRegistered
        ? (memberData.memberName || memberData.name || verifiedName || phone)
        : (verifiedName || phone),
      memberCode: isRegistered ? (memberData.memberCode || memberData.memberID || '') : '',
      points: isRegistered ? (memberData.totalPoint || memberData.points || 0) : 0,
      tier: determineTier(isRegistered ? (memberData.totalPoint || 0) : 0),
      loginMethod: 'whatsapp',
      esbLinked: true,
    };

    setUser(newUser);
    setIsGuest(false);
    await Promise.all([
      persistUser(newUser),
      SecureStore.setItemAsync('auth_token', authkey),
      storageRemove(GUEST_KEY),
    ]);
  }, []);

  // ─── Sign in with Apple ───
  const loginWithApple = useCallback(async () => {
    // Track which step we're on for Sentry diagnosis if anything throws.
    // Apple rejected iPad (iPadOS 26.4.1) Apr 14 2026 with a generic error — this
    // instrumentation makes the next failure pinpoint-able.
    let step: string = 'signInAsync';
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const appleUserID = credential.user;
      const email = credential.email ?? undefined;
      const fullName = credential.fullName;
      const displayName = fullName
        ? [fullName.givenName, fullName.familyName].filter(Boolean).join(' ') || undefined
        : undefined;

      // Persist Apple identity on first sign-in (name/email only returned once)
      if (displayName || email) {
        step = 'storeAppleIdentity';
        await SecureStore.setItemAsync(
          `apple_identity:${appleUserID}`,
          JSON.stringify({ displayName, email }),
        );
      }

      // Retrieve stored display name if this isn't the first sign-in
      let storedName = displayName;
      let storedEmail = email;
      if (!storedName || !storedEmail) {
        try {
          step = 'readAppleIdentity';
          const stored = await SecureStore.getItemAsync(`apple_identity:${appleUserID}`);
          if (stored) {
            const parsed = JSON.parse(stored);
            storedName = storedName || parsed.displayName;
            storedEmail = storedEmail || parsed.email;
          }
        } catch { /* ignore */ }
      }

      // Check for previously linked ESB account
      let linkedData: { phone: string; authkey: string; branch: string } | null = null;
      try {
        step = 'readEsbLink';
        const stored = await SecureStore.getItemAsync(`apple_esb_link:${appleUserID}`);
        if (stored) linkedData = JSON.parse(stored);
      } catch { /* ignore */ }

      if (linkedData?.authkey) {
        // Restore linked ESB session
        let memberData: any = null;
        try {
          step = 'checkMembership';
          memberData = await checkMembership(linkedData.branch, linkedData.phone);
        } catch { /* proceed with cached data */ }

        const restoredUser: User = {
          phone: linkedData.phone,
          authkey: linkedData.authkey,
          name: memberData?.memberName || memberData?.name || storedName || storedEmail || 'Member',
          memberCode: memberData?.memberCode || memberData?.memberID || '',
          points: memberData?.totalPoint || memberData?.points || 0,
          tier: determineTier(memberData?.totalPoint || 0),
          appleUserID,
          appleEmail: storedEmail,
          loginMethod: 'apple',
          esbLinked: true,
        };

        step = 'persistLinkedUser';
        setUser(restoredUser);
        setIsGuest(false);
        await Promise.all([
          persistUser(restoredUser),
          SecureStore.setItemAsync('auth_token', linkedData.authkey),
          storageRemove(GUEST_KEY),
        ]);
      } else {
        // Apple-only session — no ESB link yet
        const appleUser: User = {
          phone: '',
          authkey: '',
          name: storedName || storedEmail || 'Member',
          memberCode: '',
          points: 0,
          tier: 'Perunggu',
          appleUserID,
          appleEmail: storedEmail,
          loginMethod: 'apple',
          esbLinked: false,
        };

        step = 'persistAppleOnlyUser';
        setUser(appleUser);
        setIsGuest(false);
        await Promise.all([
          persistUser(appleUser),
          storageRemove(GUEST_KEY),
        ]);
      }
    } catch (err: any) {
      // Don't report user cancellations — those are normal.
      if (err?.code !== 'ERR_REQUEST_CANCELED') {
        Sentry.captureException(err, {
          tags: {
            context: 'apple_sign_in',
            step,
            platform: Platform.OS,
            isPad: String((Platform as any).isPad ?? false),
          },
          extra: {
            errorCode: err?.code,
            errorDomain: err?.domain,
            errorMessage: err?.message,
            nativeStackIOS: err?.nativeStackIOS,
            osVersion: Platform.Version,
          },
        });
      }
      throw err;
    }
  }, []);

  // ─── Link ESB account to Apple user ───
  const linkESBAccount = useCallback(async (phone: string, authkey: string, branch: string) => {
    if (!user) return;

    let memberData: any = null;
    try {
      memberData = await checkMembership(branch, phone);
    } catch { /* proceed without member data */ }

    const isRegistered = memberData
      && memberData.status !== 'NOT_REGISTERED'
      && (memberData.memberName || memberData.name || memberData.memberCode);

    const linkedUser: User = {
      ...user,
      phone,
      authkey,
      name: isRegistered ? (memberData.memberName || memberData.name || user.name) : user.name,
      memberCode: isRegistered ? (memberData.memberCode || memberData.memberID || '') : '',
      points: isRegistered ? (memberData.totalPoint || memberData.points || 0) : 0,
      tier: determineTier(isRegistered ? (memberData.totalPoint || 0) : 0),
      esbLinked: true,
    };

    setUser(linkedUser);
    await Promise.all([
      persistUser(linkedUser),
      SecureStore.setItemAsync('auth_token', authkey),
    ]);

    // Store the Apple ID ↔ ESB link for future session restores
    if (user.appleUserID) {
      await SecureStore.setItemAsync(
        `apple_esb_link:${user.appleUserID}`,
        JSON.stringify({ phone, authkey, branch }),
      );
    }
  }, [user]);

  // ─── Logout ───
  const logout = useCallback(async () => {
    const appleUserID = user?.appleUserID;
    await Promise.all([
      cacheClear(AUTH_USER_KEY),
      SecureStore.deleteItemAsync('auth_token'),
      storageRemove(GUEST_KEY),
      cacheClear(CART_KEY),
    ]);
    setUser(null);
    setIsGuest(false);
  }, [user]);

  // ─── Delete account ───
  const deleteAccount = useCallback(async () => {
    const appleUserID = user?.appleUserID;
    await Promise.all([
      cacheClear(AUTH_USER_KEY),
      SecureStore.deleteItemAsync('auth_token'),
      storageRemove(GUEST_KEY),
      cacheClear(CART_KEY),
      cacheClear('cache:active_orders'),
      cacheClear('cache:order_history'),
      // Clear Apple-specific keys if applicable
      appleUserID ? SecureStore.deleteItemAsync(`apple_esb_link:${appleUserID}`) : Promise.resolve(),
      appleUserID ? SecureStore.deleteItemAsync(`apple_identity:${appleUserID}`) : Promise.resolve(),
    ]);
    setUser(null);
    setIsGuest(false);
  }, [user]);

  // ─── Update display name ───
  const updateName = useCallback(async (name: string) => {
    if (!user) return;
    const updated = { ...user, name };
    setUser(updated);
    await persistUser(updated);
  }, [user]);

  // ─── Guest mode ───
  const setGuestMode = useCallback(async () => {
    await storageSet(GUEST_KEY, 'true');
    setIsGuest(true);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user, isLoading, isGuest,
        login, loginWithApple, linkESBAccount,
        logout, setGuest: setGuestMode, updateName, deleteAccount,
      }}
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
