// utils/formatting.ts — Shared display formatters

/**
 * Convert ALL-CAPS or inconsistent strings to Title Case.
 * "PICCOLO" → "Piccolo", "double espresso" → "Double Espresso".
 * Handles multiple whitespace characters and trims.
 */
export function titleCase(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .map((word) => (word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : ''))
    .join(' ');
}

/**
 * Human-readable relative time in Indonesian.
 * Used for "last updated" indicators.
 * Input: ms timestamp (e.g., from Date.now()).
 */
export function relativeTime(ms: number | null | undefined): string {
  if (!ms) return '—';
  const now = Date.now();
  const diffMs = Math.max(0, now - ms);
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 5) return 'Baru saja';
  if (seconds < 60) return `${seconds} detik lalu`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

/**
 * Format an ISO timestamp as "9 Apr, 16:11" (Indonesian short format).
 * Safe against invalid/empty strings.
 */
export function formatOrderTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const day = d.getDate();
  const month = MONTHS[d.getMonth()];
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month}, ${hours}:${mins}`;
}

/**
 * Format an ISO timestamp as just the short date "9 Apr" (for history list rows).
 */
export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/**
 * Human-readable payment method label.
 * Production ESB uses IDs like "danaesb", "ovoesb", "cashier" — normalize for display.
 */
export function paymentMethodLabel(id: string | null | undefined): string {
  if (!id) return 'Pembayaran';
  const normalized = String(id).toLowerCase();
  if (normalized.includes('dana')) return 'DANA';
  if (normalized.includes('ovo')) return 'OVO';
  if (normalized.includes('gopay')) return 'GoPay';
  if (normalized.includes('shopeepay') || normalized.includes('shopee')) return 'ShopeePay';
  if (normalized.includes('qris')) return 'QRIS';
  if (normalized.includes('cashier') || normalized.includes('kasir')) return 'Bayar di Kasir';
  return titleCase(id);
}

/**
 * Human-readable order mode label.
 * Handles variants: "takeAway", "take_away", "take away", "pickup", etc.
 */
export function orderModeLabel(mode: string | null | undefined): string {
  if (!mode) return '';
  const normalized = String(mode).toLowerCase().replace(/[_\s]/g, '');
  if (normalized === 'takeaway' || normalized === 'pickup') return 'Take Away';
  if (normalized === 'dinein') return 'Dine In';
  if (normalized === 'delivery') return 'Delivery';
  return titleCase(mode);
}
