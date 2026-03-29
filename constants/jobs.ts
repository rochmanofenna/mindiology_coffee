// constants/jobs.ts — Job listings data

export interface JobListing {
  id: string;
  title: string;
  branch: string;
  type: 'full-time' | 'part-time';
  description: string;
  requirements: string[];
  benefits: string[];
}

export const JOBS: JobListing[] = [
  {
    id: '1', title: 'Barista', branch: 'Mindiology Bintaro', type: 'full-time',
    description: 'Bertanggung jawab menyajikan kopi dan minuman berkualitas tinggi dengan standar Mindiology. Melayani pelanggan dengan ramah dan profesional.',
    requirements: ['Pengalaman minimal 6 bulan sebagai barista', 'Memahami dasar-dasar kopi dan latte art', 'Komunikatif dan ramah', 'Bersedia bekerja shift'],
    benefits: ['Gaji kompetitif', 'Makan siang gratis', 'Pelatihan barista profesional', 'Jenjang karir jelas'],
  },
  {
    id: '2', title: 'Kitchen Staff', branch: 'Sandwicherie Lakeside', type: 'full-time',
    description: 'Membantu persiapan dan penyajian makanan sesuai standar resep Kamarasan. Menjaga kebersihan area dapur.',
    requirements: ['Pengalaman di bidang F&B minimal 1 tahun', 'Memahami food hygiene', 'Dapat bekerja dalam tim', 'Bersedia bekerja shift'],
    benefits: ['Gaji kompetitif', 'Makan gratis', 'BPJS Kesehatan & Ketenagakerjaan', 'THR'],
  },
  {
    id: '3', title: 'Kasir', branch: 'Semua Cabang', type: 'part-time',
    description: 'Mengelola transaksi pembayaran, memberikan pelayanan terbaik kepada pelanggan, dan membantu operasional outlet.',
    requirements: ['Teliti dan jujur', 'Pengalaman kasir diutamakan', 'Mampu mengoperasikan POS system', 'Ramah dan komunikatif'],
    benefits: ['Gaji per jam kompetitif', 'Jadwal fleksibel', 'Diskon karyawan 50%', 'Lingkungan kerja menyenangkan'],
  },
  {
    id: '4', title: 'Supervisor Outlet', branch: 'Mindiology Danareksa', type: 'full-time',
    description: 'Mengawasi operasional harian outlet, mengelola tim, memastikan standar kualitas dan pelayanan terjaga.',
    requirements: ['Pengalaman minimal 2 tahun di F&B', 'Kemampuan leadership yang baik', 'Mampu bekerja di bawah tekanan', 'Memiliki SIM C'],
    benefits: ['Gaji + insentif bulanan', 'BPJS lengkap', 'Bonus tahunan', 'Pelatihan manajemen'],
  },
  {
    id: '5', title: 'Social Media Admin', branch: 'Semua Cabang', type: 'part-time',
    description: 'Mengelola akun media sosial Mindiology & Kamarasan, membuat konten kreatif, dan berinteraksi dengan followers.',
    requirements: ['Mahir menggunakan Instagram, TikTok, dan tools desain', 'Kreatif dan up-to-date dengan tren', 'Pengalaman content creation', 'Memiliki portofolio'],
    benefits: ['Gaji per proyek', 'Remote-friendly', 'Produk gratis untuk konten', 'Networking F&B industry'],
  },
];
