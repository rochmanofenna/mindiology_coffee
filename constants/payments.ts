// constants/payments.ts — Payment method configuration based on ESB branch settings

export interface PaymentMethod {
  id: string;
  name: string;
  available: boolean;
  comingSoonText?: string;
  icon: string; // Ionicon name
}

// Fallback used only when branch settings haven't loaded yet. Real availability
// comes from ESB branch.payment. All methods flow through the universal
// payment-status screen so none require client-side filtering.
export const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'dana', name: 'DANA', available: true, icon: 'wallet-outline' },
  { id: 'cashier', name: 'Bayar di Kasir', available: true, icon: 'cash-outline' },
  { id: 'ovo', name: 'OVO', available: true, icon: 'wallet-outline' },
  { id: 'qris', name: 'QRIS', available: true, icon: 'qr-code-outline' },
  { id: 'shopeepay', name: 'ShopeePay', available: true, icon: 'cart-outline' },
];
