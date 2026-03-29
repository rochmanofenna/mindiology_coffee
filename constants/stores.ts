// constants/stores.ts — Shared branch/store data
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
}

export const STORES: StoreInfo[] = [
  {
    id: 'bintaro',
    name: 'Mindiology Coffee, Bintaro',
    shortName: 'Emerald Bintaro',
    addr: 'Fresh Market Emerald Bintaro, Jl. Emerald Boulevard No.10 RC 09, Tangerang Selatan',
    hours: '07:00 – 23:00',
    lat: -6.287,
    lng: 106.716,
    branchCode: 'MDOUT',
    supportsDineIn: true,
  },
  {
    id: 'citra8',
    name: 'Sandwicherie Lakeside, Citra 8',
    shortName: 'Lakeside Citra 8',
    addr: 'Kawasan Sunset Avenue A, Aeroworld 8 Citra Garden, Jakarta 11080',
    hours: '07:00 – 23:00',
    lat: -6.157,
    lng: 106.679,
    branchCode: 'SLOUT',
    supportsDineIn: true,
  },
  {
    id: 'danareksa',
    name: 'Mindiology Coffee, Danareksa',
    shortName: 'Danareksa',
    addr: 'Jl. Medan Merdeka Sel. No.14, Gambir, Jakarta Pusat 10110',
    hours: '10:00 – 20:00',
    lat: -6.186,
    lng: 106.831,
    branchCode: 'MDDAN',
    supportsDineIn: false,
  },
];
