// constants/payments.ts — Payment method configuration based on ESB branch settings

export interface PaymentMethod {
  id: string;
  name: string;
  available: boolean;
  comingSoonText?: string;
  icon: string; // Ionicon name
}

// Fallback used only when branch settings haven't loaded yet. IDs MUST match
// what ESB returns in branch.payment.online so a fallback-mode order doesn't
// get rejected by the POS. Verified live against MCE on 2026-04-14.
export const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'danaesb', name: 'DANA', available: true, icon: 'wallet-outline' },
  { id: 'cashier', name: 'Bayar di Kasir', available: true, icon: 'cash-outline' },
  { id: 'qrisesb', name: 'QRIS', available: true, icon: 'qr-code-outline' },
  { id: 'ovoesb', name: 'OVO', available: true, icon: 'wallet-outline' },
  { id: 'gopay', name: 'GoPay', available: true, icon: 'wallet-outline' },
  { id: 'shopeeesb', name: 'ShopeePay', available: true, icon: 'cart-outline' },
];
