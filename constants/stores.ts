// constants/stores.ts — Shared branch/store data (production MBLA branches)
export interface StoreInfo {
  id: string;
  name: string;
  shortName: string;
  addr: string;
  hours: string;
  lat: number;
  lng: number;
  branchCode: string;
  supportsDineIn: boolean;
  /**
   * Branch cashier/manager phone number. Currently unused by the client;
   * reserved for future support integrations. Leave empty — recovery flows
   * use mailto support only.
   */
  phone?: string;
}

export const STORES: StoreInfo[] = [
  {
    id: 'bintaro',
    name: 'Mindiology Coffee Emerald',
    shortName: 'Emerald Bintaro',
    addr: 'Jl. Bintaro Utama No.1a, Pd. Pucung, Kec. Pd. Aren, Tangerang Selatan',
    hours: '07:00 – 23:00',
    lat: -6.2812235,
    lng: 106.7083972,
    branchCode: 'MCE',
    supportsDineIn: true,
    phone: '',
  },
  {
    id: 'danareksa',
    name: 'Mindiology Coffee Danareksa',
    shortName: 'Danareksa',
    addr: 'Jl. Medan Merdeka Sel. No.14, Gambir, Jakarta Pusat',
    hours: '07:00 – 18:00',
    lat: -6.181252,
    lng: 106.830187,
    branchCode: 'MCEDR',
    supportsDineIn: true,
    phone: '',
  },
  {
    id: 'sandwicherie',
    name: 'Sandwicherie Lakeside',
    shortName: 'Lakeside',
    addr: 'Jl. Sunset Avenue No.5, Pegadungan, Kalideres, Jakarta Barat',
    hours: '07:00 – 23:00',
    lat: -6.1214997,
    lng: 106.6972068,
    branchCode: 'SLE',
    supportsDineIn: true,
    phone: '',
  },
  {
    id: 'citragarden',
    name: 'Kamarasan Citra Garden',
    shortName: 'Citra Garden',
    addr: 'Jl. Raya Citra Garden 8 No.11, Pegadungan, Kalideres, Jakarta Barat',
    hours: '10:00 – 22:00',
    lat: -6.1235809,
    lng: 106.6938151,
    branchCode: 'KCG',
    supportsDineIn: false,
    phone: '',
  },
];

/** Normalize a phone string to digits only. Empty string if none. */
export function getBranchPhoneDigits(branchCode: string, fallback?: string): string {
  const explicit = STORES.find(s => s.branchCode === branchCode)?.phone;
  return (explicit || fallback || '').replace(/[^\d]/g, '');
}
