// utils/otpPolling.ts — Shared OTP verification polling utility
// Used by both app/auth/phone.tsx and components/PhoneLinkSheet.tsx
import { verifyOTP } from '@/services/api';

export interface VerificationResult {
  status: 'VERIFIED' | 'EXPIRED' | 'TIMEOUT';
  phone?: string;
  authkey?: string;
  name?: string;
}

/**
 * Poll ESB OTP verification status until VERIFIED, EXPIRED, or timeout.
 * Returns a promise that resolves with the result.
 * The caller can abort by calling the returned AbortController.
 */
export function pollVerification(
  otp: string,
  timeoutMs: number = 5 * 60 * 1000,
  intervalMs: number = 3000,
): { promise: Promise<VerificationResult>; abort: () => void } {
  let timer: ReturnType<typeof setInterval> | null = null;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let aborted = false;

  const promise = new Promise<VerificationResult>((resolve) => {
    const startTime = Date.now();

    const poll = async () => {
      if (aborted) return;
      if (Date.now() - startTime > timeoutMs) {
        cleanup();
        resolve({ status: 'TIMEOUT' });
        return;
      }

      try {
        const result = await verifyOTP(otp);
        const data = result?.data || result;
        const otpStatus = data?.status;

        if (otpStatus === 'VERIFIED') {
          cleanup();
          const rawPhone = data.verifiedPhoneNumber || '';
          const phone = rawPhone.startsWith('62')
            ? rawPhone
            : rawPhone.startsWith('0')
              ? `62${rawPhone.slice(1)}`
              : rawPhone.startsWith('+62')
                ? rawPhone.slice(1)
                : `62${rawPhone}`;

          resolve({
            status: 'VERIFIED',
            phone,
            authkey: data.authkey || '',
            name: data.customerName || data.name || undefined,
          });
        } else if (otpStatus === 'EXPIRED') {
          cleanup();
          resolve({ status: 'EXPIRED' });
        }
        // PENDING → keep polling
      } catch {
        // Network error — keep polling
      }
    };

    // Poll immediately, then on interval
    poll();
    timer = setInterval(poll, intervalMs);

    // Hard timeout
    timeout = setTimeout(() => {
      cleanup();
      resolve({ status: 'TIMEOUT' });
    }, timeoutMs);
  });

  function cleanup() {
    if (timer) { clearInterval(timer); timer = null; }
    if (timeout) { clearTimeout(timeout); timeout = null; }
  }

  function abort() {
    aborted = true;
    cleanup();
  }

  return { promise, abort };
}
