// constants/payments.ts — Payment method configuration based on ESB branch settings

export interface PaymentMethod {
  id: string;
  name: string;
  available: boolean;
  comingSoonText?: string;
  icon: string; // Ionicon name
}

// Based on ESB branch settings: only DANA is available: true
// OVO, QRIS, ShopeePay have warning messages indicating instability
// atCashier is disabled (false) in ESB config
export const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'dana', name: 'DANA', available: true, icon: 'wallet-outline' },
  { id: 'cashier', name: 'Bayar di Kasir', available: true, icon: 'cash-outline' },
  { id: 'ovo', name: 'OVO', available: false, comingSoonText: 'Segera hadir', icon: 'wallet-outline' },
  { id: 'qris', name: 'QRIS', available: false, comingSoonText: 'Segera hadir', icon: 'qr-code-outline' },
  { id: 'shopeepay', name: 'ShopeePay', available: false, comingSoonText: 'Segera hadir', icon: 'cart-outline' },
];
