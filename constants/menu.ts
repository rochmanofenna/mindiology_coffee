// constants/menu.ts
// Full menu data extracted from Kamarasan Soulfood Nusantara Sept 2025 PDF

export interface MenuItem {
  id: string;
  name: string;
  price: number; // in thousands (K)
  desc: string;
  rec?: boolean;   // chef recommendation
  spicy?: boolean;
}

export interface MenuCategory {
  label: string;
  emoji: string;
  items: MenuItem[];
}

export interface TabGroup {
  key: string;
  label: string;
  icon: string;
  categories: string[];
}

export const MENU: Record<string, MenuCategory> = {
  pembuka: {
    label: 'Pembuka', emoji: '🍽',
    items: [
      { id: 'p1', name: 'Singkong Goreng Kampoeng', price: 30, desc: 'Camilan tradisional, renyah di luar lembut di dalam', rec: true },
      { id: 'p2', name: 'Singkong Goreng Keju', price: 35, desc: 'Singkong goreng dengan taburan keju parut' },
      { id: 'p3', name: 'Bakwan / Bala-Bala', price: 27, desc: 'Gorengan sayuran wortel, kol, toge & daun bawang' },
      { id: 'p4', name: 'Tahu Jeletot', price: 37, desc: 'Tahu goreng isi sayuran dan cabai rawit', spicy: true },
      { id: 'p5', name: 'Tempe Mendoan', price: 31, desc: 'Tempe tipis dibalur tepung, digoreng setengah matang' },
      { id: 'p6', name: 'Cireng Rujak Kampoeng', price: 25, desc: 'Cireng dengan saus rujak pedas manis' },
      { id: 'p7', name: 'Tahu Telor', price: 51.5, desc: 'Lontong, tauge, kol, bumbu kacang gurih manis' },
      { id: 'p8', name: 'Siomay Bandung', price: 38, desc: 'Siomay lembut dengan kentang, kol, tahu, telur rebus' },
      { id: 'p9', name: 'Pisang Goreng Kamarasan', price: 37, desc: 'Pisang gula aren, digoreng keemasan', rec: true },
      { id: 'p10', name: 'Pisang Goreng Coklat Keju', price: 37, desc: 'Pisang goreng dengan coklat dan keju' },
      { id: 'p11', name: 'Tempe Goreng', price: 26, desc: 'Tempe dipotong dan digoreng renyah' },
      { id: 'p12', name: 'Tahu Goreng', price: 25, desc: 'Tahu digoreng renyah di luar, lembut di dalam' },
      { id: 'p13', name: 'Tahu Penyet', price: 30, desc: 'Tahu goreng dihancurkan dengan sambal pedas', spicy: true },
      { id: 'p14', name: 'Mix Platter', price: 55, desc: 'Aneka gorengan: tahu isi, tempe, bakwan, pisang goreng', rec: true },
    ],
  },
  sarapan: {
    label: 'Sarapan', emoji: '🌅',
    items: [
      { id: 's1', name: 'Bubur Ketan Hitam', price: 25, desc: 'Ketan hitam dengan santan, gula & daun pandan' },
      { id: 's2', name: 'Bubur Kacang Ijo', price: 28.5, desc: 'Kacang hijau dengan santan, gula & pandan' },
      { id: 's3', name: 'Bubur Kacang Ijo + Ketan Hitam', price: 30, desc: 'Kombinasi kacang hijau dan ketan hitam', rec: true },
      { id: 's4', name: 'Kaya Toast', price: 35, desc: 'Roti panggang renyah, selai kaya, mentega lembut', rec: true },
      { id: 's5', name: 'Telur 1/2 Matang', price: 22, desc: 'Telur setengah matang, putih lembut, kuning creamy' },
    ],
  },
  ayam: {
    label: 'Ayam', emoji: '🍗',
    items: [
      { id: 'a1', name: 'Ayam Bakar Kecap', price: 47, desc: 'Bumbu kecap rempah, daging lembut dengan lalapan', rec: true },
      { id: 'a2', name: 'Ayam Pecak', price: 49, desc: 'Bumbu rempah dengan sambal pecak kencur & jahe' },
      { id: 'a3', name: 'Ayam Goreng Serundeng', price: 47, desc: 'Goreng kecokelatan, taburan serundeng kelapa gurih' },
      { id: 'a4', name: 'Ayam Goreng Sambal Matah', price: 47, desc: 'Bumbu rempah dengan sambal matah segar', spicy: true },
      { id: 'a5', name: 'Ayam Goreng Geprek Sambal Ijo', price: 47, desc: 'Geprek dengan sambal hijau pedas segar', spicy: true, rec: true },
      { id: 'a6', name: 'Ayam Goreng Bali', price: 47, desc: 'Bumbu khas Bali, kaya rempah, gurih dan pedas' },
      { id: 'a7', name: 'Ayam Goreng Asam Manis', price: 35, desc: 'Saus asam manis segar, gurih dan manis' },
      { id: 'a8', name: 'Ayam Goreng Asam Pedas', price: 35, desc: 'Saus asam pedas, gurih dan menggigit', spicy: true },
      { id: 'a9', name: 'Ayam Bakar Kamarasan 1 Ekor', price: 129, desc: 'Ayam utuh bakar bumbu marinasi khas, rasa smoky', rec: true },
      { id: 'a10', name: 'Ayam Bakar Kamarasan ½ Ekor', price: 65, desc: 'Setengah ekor ayam bakar bumbu khas nusantara' },
    ],
  },
  bebek: {
    label: 'Bebek', emoji: '🦆',
    items: [
      { id: 'b1', name: 'Bebek Sambal Ijo', price: 49, desc: 'Bebek renyah dengan sambal hijau pedas segar', spicy: true, rec: true },
      { id: 'b2', name: 'Bebek Goreng Bali', price: 51, desc: 'Marinasi bumbu & rempah khas Bali, gurih', rec: true },
      { id: 'b3', name: 'Bebek Bakar Kecap', price: 50, desc: 'Bumbu kecap manis rempah, gurih, manis & smoky' },
      { id: 'b4', name: 'Bebek Bakar Kamarasan 1 Ekor', price: 150, desc: 'Bebek utuh bakar bumbu rempah khas, renyah & lembut', rec: true },
      { id: 'b5', name: 'Bebek Bakar Kamarasan ½ Ekor', price: 80, desc: 'Setengah bebek bakar rempah nusantara' },
    ],
  },
  sate: {
    label: 'Sate', emoji: '🥩',
    items: [
      { id: 'st1', name: 'Sate Ayam', price: 50, desc: 'Sate nusantara dipanggang, acar sayur & bumbu kacang' },
      { id: 'st2', name: 'Sate Maranggi', price: 58, desc: 'Sate Purwakarta, marinasi bumbu khas, acar & sambal tomat', rec: true },
      { id: 'st3', name: 'Sate Udang', price: 61, desc: 'Udang dipanggang dengan berbagai bumbu kaya rasa', rec: true },
      { id: 'st4', name: 'Sate Taichan', price: 52.5, desc: 'Sate ayam khas Jakarta, sambal tomat & jeruk nipis' },
    ],
  },
  soto_sop: {
    label: 'Soto & Sop', emoji: '🍲',
    items: [
      { id: 'ss1', name: 'Sop Iga', price: 98, desc: 'Iga sapi empuk, wortel, kentang, seledri & rempah' },
      { id: 'ss2', name: 'Tongseng Iga Sapi', price: 95, desc: 'Iga sapi bumbu khas Kamarasan, kol & tomat', rec: true },
      { id: 'ss3', name: 'Tongseng Ayam', price: 55, desc: 'Soto Betawi daging sapi, kentang, kuah santan kaya' },
      { id: 'ss4', name: 'Soto Bandung', price: 44.5, desc: 'Irisan daging sapi, lobak, tauge, kuah bening gurih' },
      { id: 'ss5', name: 'Sayur Asam Kamarasan', price: 22, desc: 'Kacang panjang, labu siam, jagung manis, melinjo' },
    ],
  },
  iga: {
    label: 'Iga', emoji: '🦴',
    items: [
      { id: 'ig1', name: 'Iga Bakar Sambal Matah', price: 98, desc: 'Iga bakar dengan sambal matah segar', spicy: true, rec: true },
      { id: 'ig2', name: 'Iga Bakar Kecap', price: 96, desc: 'Iga sapi bumbu kecap manis, dibakar berkaramel' },
    ],
  },
  ikan: {
    label: 'Ikan', emoji: '🐟',
    items: [
      { id: 'ik1', name: 'Ikan Nila Kamarasan', price: 57, desc: 'Nila goreng kecokelatan, renyah, gurih & lembut', rec: true },
      { id: 'ik2', name: 'Ikan Nila Bakar', price: 67, desc: 'Nila bakar bumbu marinasi khas, gurih & smoky' },
      { id: 'ik3', name: 'Ikan Nila Pecak', price: 62, desc: 'Nila goreng garing dengan sambal pecak pedas', spicy: true },
      { id: 'ik4', name: 'Ikan Gurame Kamarasan', price: 95, desc: 'Gurame goreng renyah, kulit garing, daging juicy', rec: true },
      { id: 'ik5', name: 'Ikan Gurame Asam Manis', price: 95, desc: 'Gurame goreng dengan saus asam manis segar' },
      { id: 'ik6', name: 'Ikan Bakar Gurame', price: 90, desc: 'Gurame bakar bumbu rempah khas, gurih & smoky' },
      { id: 'ik7', name: 'Ikan Gurame Terbang', price: 80, desc: 'Gurame goreng teknik khusus, renyah & ringan' },
      { id: 'ik8', name: 'Ikan Bawal Kamarasan', price: 94, desc: 'Bawal goreng bumbu rempah, kulit renyah, daging lembut' },
      { id: 'ik9', name: 'Ikan Bakar Bawal', price: 94, desc: 'Bawal bakar bumbu nusantara, gurih & smoky', rec: true },
      { id: 'ik10', name: 'Ikan Baronang Kamarasan', price: 93, desc: 'Baronang goreng renyah, daging lembut & gurih alami', rec: true },
      { id: 'ik11', name: 'Ikan Baronang Pecak', price: 96, desc: 'Baronang bumbu Kamarasan, sambal pecak pedas segar' },
      { id: 'ik12', name: 'Ikan Bakar Baronang', price: 94, desc: 'Baronang bakar bumbu rempah khas, gurih & smoky', rec: true },
      { id: 'ik13', name: 'Jambal Roti', price: 15, desc: 'Ikan asin fermentasi, tekstur rapuh', rec: true },
      { id: 'ik14', name: 'Peda', price: 15, desc: 'Ikan asin fermentasi via penggaraman & penjemuran' },
    ],
  },
  seafood: {
    label: 'Seafood', emoji: '🦐',
    items: [
      { id: 'sf1', name: 'Cumi Bakar Kamarasan', price: 68, desc: 'Bumbu kecap manis meresap, aroma harum gurih manis', rec: true },
      { id: 'sf2', name: 'Cumi Saus Tiram', price: 58, desc: 'Saus tiram gurih manis, rempah-rempah lezat' },
      { id: 'sf3', name: 'Cumi Saus Padang', price: 58, desc: 'Saus Padang pedas asam, bumbu rempah kaya rasa', rec: true },
      { id: 'sf4', name: 'Cumi Asam Manis', price: 63, desc: 'Cumi segar saus asam, cita rasa asam segar manis' },
      { id: 'sf5', name: 'Cumi Asam Pedas', price: 65, desc: 'Cumi-cumi saus asam dan pedas', spicy: true },
      { id: 'sf6', name: 'Udang Rebus Kamarasan', price: 57, desc: 'Udang direbus bumbu khas, rasa alami udang manis' },
      { id: 'sf7', name: 'Udang Saus Padang', price: 78, desc: 'Saus Padang pedas asam, bumbu rempah kaya rasa', rec: true },
      { id: 'sf8', name: 'Udang Asam Manis', price: 58, desc: 'Saus asam manis khas Kamarasan yang segar' },
      { id: 'sf9', name: 'Udang Asam Pedas', price: 59, desc: 'Udang goreng renyah saus asam pedas khas' },
      { id: 'sf10', name: 'Udang Bakar Talagasari', price: 84.5, desc: 'Bumbu khas Kamarasan, sambal tomat & lalapan segar', rec: true },
      { id: 'sf11', name: 'Udang Bakar Kamarasan', price: 85, desc: 'Dipanggang hingga matang, rasa smoky & kenyal', rec: true },
    ],
  },
  nasi: {
    label: 'Nasi', emoji: '🍚',
    items: [
      { id: 'n1', name: 'Nasi Putih', price: 12, desc: 'Nasi putih tanpa bumbu' },
      { id: 'n2', name: 'Nasi Merah', price: 13, desc: 'Beras merah, nutty & kenyal' },
      { id: 'n3', name: 'Nasi Liwet 1 Porsi', price: 13, desc: 'Nasi santan, daun salam, serai & kaldu gurih' },
      { id: 'n4', name: 'Nasi Liwet', price: 35, desc: 'Nasi liwet porsi besar untuk berbagi', rec: true },
      { id: 'n5', name: 'Nasi Goreng Jawa', price: 50, desc: 'Bumbu kecap manis, potongan bakso sapi' },
      { id: 'n6', name: 'Nasi Goreng Khas Kamarasan', price: 75, desc: 'Potongan iga sapi, bumbu khas Kamarasan', rec: true },
      { id: 'n7', name: 'Nasi Goreng Ayam', price: 57, desc: 'Potongan ayam dengan bumbu khas Kamarasan' },
      { id: 'n8', name: 'Nasi Goreng Seafood', price: 65, desc: 'Campuran udang, cumi, kerang & bumbu khas' },
      { id: 'n9', name: 'Nasi Goreng Pete', price: 60, desc: 'Potongan bakso sapi, pete & bumbu khas' },
      { id: 'n10', name: 'Nasi Goreng Teri Cabe Ijo', price: 56, desc: 'Teri dan sambal hijau pedas', rec: true, spicy: true },
      { id: 'n11', name: 'Nasi Bakar Teri', price: 40, desc: 'Nasi bungkus daun pisang, bumbu & teri, dibakar harum' },
      { id: 'n12', name: 'Nasi Bakar Ayam Suwir', price: 38, desc: 'Nasi daun pisang, ayam suwir, bumbu khas & kemangi' },
      { id: 'n13', name: 'Nasi Bakar Cumi Asin', price: 38, desc: 'Nasi daun pisang, cumi asin, bumbu khas & kemangi', rec: true },
    ],
  },
  mie: {
    label: 'Mie', emoji: '🍜',
    items: [
      { id: 'm1', name: 'Mie Goreng Kamarasan', price: 39, desc: 'Mi telur ditumis bumbu khas, sayuran, telur & bakso' },
      { id: 'm2', name: 'Mie Kangkung', price: 34, desc: 'Mi kuah khas Jakarta, bumbu khas Kamarasan, manis gurih', rec: true },
      { id: 'm3', name: 'Mie Godok Jawa', price: 39, desc: 'Mi kuah khas Jawa, kuah kaldu rempah kaya' },
    ],
  },
  tumisan: {
    label: 'Tumisan', emoji: '🥬',
    items: [
      { id: 't1', name: 'Cah Toge', price: 35, desc: 'Toge ditumis bawang, cabai, saus tiram/kecap' },
      { id: 't2', name: 'Cumi Asin Sambal Ijo', price: 32.5, desc: 'Cumi asin, cabai hijau, bawang & rempah', rec: true, spicy: true },
      { id: 't3', name: 'Kangkung Cah Teri', price: 37, desc: 'Kangkung tumis teri, bawang, cabai & kecap manis' },
      { id: 't4', name: 'Kangkung Balacan', price: 31, desc: 'Kangkung tumis bumbu balacan, cabai & bawang' },
      { id: 't5', name: 'Kangkung Sauce Tiram', price: 29, desc: 'Kangkung tumis saus tiram, bawang putih & kecap' },
      { id: 't6', name: 'Daun Pucuk Labu', price: 38, desc: 'Daun muda labu dimasak bumbu & rempah pilihan', rec: true },
      { id: 't7', name: 'Gado-Gado', price: 46, desc: 'Sayuran rebus, bumbu kacang rasa khas Kamarasan' },
      { id: 't8', name: 'Karedok Kamarasan', price: 38, desc: 'Salad mentah terong, kacang, timun, tauge, bumbu kacang pedas', rec: true },
      { id: 't9', name: 'Oncom Leunca', price: 29, desc: 'Oncom ditumis leunca, bawang & cabai' },
    ],
  },
  sambal: {
    label: 'Sambal', emoji: '🌶️',
    items: [
      { id: 'sb1', name: 'Sambal Kamarasan', price: 12, desc: 'Tomat hijau, cabai rawit merah & hijau, pedas gurih', spicy: true, rec: true },
      { id: 'sb2', name: 'Sambal Terasi Pedas', price: 12, desc: 'Terasi, cabai, bawang, pedas gurih asin', spicy: true },
      { id: 'sb3', name: 'Sambal Ijo', price: 12, desc: 'Cabai hijau, bawang merah, tomat, segar & asam', spicy: true },
      { id: 'sb4', name: 'Sambal Matah', price: 12, desc: 'Khas Bali, irisan cabai, bawang, serai, jeruk', spicy: true },
      { id: 'sb5', name: 'Sambal Kecap', price: 12, desc: 'Kecap manis, cabai segar, bawang merah, jeruk limau', spicy: true },
    ],
  },
  lalapan: {
    label: 'Lalapan', emoji: '🥗',
    items: [
      { id: 'l1', name: 'Paket Lalapan', price: 20, desc: 'Selada, ketimun, tomat, terong, lenca, kol, kemangi', rec: true },
      { id: 'l2', name: 'Paket Lalapan Rebus', price: 25, desc: 'Labu siam, kacang panjang, pete', rec: true },
      { id: 'l3', name: 'Pete Bakar', price: 25, desc: 'Petai dibakar, aroma khas menambah cita rasa' },
      { id: 'l4', name: 'Pete Goreng', price: 20, desc: 'Petai digoreng, aroma khas' },
      { id: 'l5', name: 'Kol Goreng', price: 13, desc: 'Kol yang digoreng, populer di Indonesia' },
    ],
  },
  kopi: {
    label: 'Kopi', emoji: '☕',
    items: [
      { id: 'k1', name: 'Americano', price: 28, desc: 'Kopi hitam single shot espresso' },
      { id: 'k2', name: 'Longblack', price: 32, desc: 'Kopi hitam double shot espresso' },
      { id: 'k3', name: 'Avocado Coffee', price: 36, desc: 'Paduan creamy alpukat segar dan espresso', rec: true },
      { id: 'k4', name: 'Kopi Latte', price: 30, desc: 'Espresso dengan susu creamy dan lembut' },
      { id: 'k5', name: 'Kopi Caramel', price: 34, desc: 'Espresso dengan susu dan perasa caramel', rec: true },
      { id: 'k6', name: 'Cappuccino', price: 32, desc: 'Espresso dengan susu creamy dan lembut' },
      { id: 'k7', name: 'Moccacino', price: 35, desc: 'Espresso, cokelat & susu, manis creamy bold' },
      { id: 'k8', name: 'Kopi Kamarasan', price: 28, desc: 'Espresso dengan gula aren asli', rec: true },
      { id: 'k9', name: 'Affogato Coffee', price: 28, desc: 'Espresso panas berpadu es krim vanilla' },
      { id: 'k10', name: 'Piccolo', price: 28, desc: 'Espresso 100ml susu creamy dan lembut' },
      { id: 'k11', name: 'Single Espresso', price: 18, desc: 'Single shot espresso' },
      { id: 'k12', name: 'Double Espresso', price: 20, desc: 'Double shot espresso' },
      { id: 'k13', name: 'Kopi Tubruk', price: 28, desc: 'Biji kopi yang digiling kasar' },
      { id: 'k14', name: 'Kopi Vietnam', price: 24, desc: 'Kopi susu ala Vietnam' },
      { id: 'k15', name: 'V60', price: 32, desc: 'Seduh manual biji kopi pilihan' },
      { id: 'k16', name: 'Japanese Brew', price: 32, desc: 'Kopi seduh manual biji kopi pilihan' },
      { id: 'k17', name: 'Kopi Hazelnut', price: 34, desc: 'Espresso dengan susu dan perasa hazelnut' },
      { id: 'k18', name: 'Kopi Vanila', price: 34, desc: 'Espresso dengan susu dan perasa vanila' },
      { id: 'k19', name: 'Kopi Duren', price: 42, desc: 'Espresso dengan buah durian dan gula aren asli', rec: true },
      { id: 'k20', name: 'Kopi Klepon', price: 32, desc: 'Cita rasa klepon: gula aren, pandan & sentuhan kelapa' },
    ],
  },
  minuman: {
    label: 'Minuman', emoji: '🥤',
    items: [
      { id: 'mn1', name: 'Es Jeruk', price: 30, desc: 'Perasan jeruk asli, manis alami menyegarkan', rec: true },
      { id: 'mn2', name: 'Susu Strawberry', price: 28, desc: 'Susu segar dengan perasa strawberry' },
      { id: 'mn3', name: 'Susu Vanila', price: 28, desc: 'Susu segar dengan perasa vanila' },
      { id: 'mn4', name: 'Soda Gembira', price: 26, desc: 'Soda segar, susu kental manis & sirup cerah' },
      { id: 'mn5', name: 'Matcha Latte', price: 34, desc: 'Matcha earthy dengan susu lembut, creamy', rec: true },
      { id: 'mn6', name: 'Chocolate', price: 34, desc: 'Cokelat hangat/dingin, rich creamy dan manis' },
      { id: 'mn7', name: 'Es Durian', price: 42, desc: 'Susu segar gula aren asli dan durian manis', rec: true },
    ],
  },
  tradisional: {
    label: 'Tradisional', emoji: '🥥',
    items: [
      { id: 'tr1', name: 'Es Cendol Bandung', price: 38, desc: 'Tepung beras, gula aren asli & buah nangka' },
      { id: 'tr2', name: 'Es Cendol Duren', price: 44, desc: 'Cendol tepung beras, gula aren, nangka & durian', rec: true },
      { id: 'tr3', name: 'Es Cendol Kelapa', price: 38, desc: 'Cendol tepung beras, gula aren, nangka & kelapa' },
      { id: 'tr4', name: 'Es Teler', price: 38, desc: 'Alpukat, kelapa, nangka dan santan' },
      { id: 'tr5', name: 'Es Doger', price: 38, desc: 'Kelapa, tape, mutiara & ketan hitam' },
      { id: 'tr6', name: 'Es Campur Kamarasan', price: 42, desc: 'Cincau, kolang-kaling, tape, biji mutiara, nangka & alpukat', rec: true },
      { id: 'tr7', name: 'Es Cincau Hitam', price: 32, desc: 'Susu segar dan gula aren alami' },
      { id: 'tr8', name: 'Es Kelapa Batok', price: 35, desc: 'Kelapa muda dengan tambahan gula cair' },
      { id: 'tr9', name: 'Es Kelapa Gula Merah', price: 32, desc: 'Kelapa muda dengan gula aren asli' },
      { id: 'tr10', name: 'Es Duren', price: 42, desc: 'Gula aren asli dan durian yang manis' },
      { id: 'tr11', name: 'Es Kelapa Jeruk', price: 32, desc: 'Jeruk peras murni dengan kelapa serut lembut' },
      { id: 'tr12', name: 'Wedang Jahe', price: 28, desc: 'Minuman hangat tradisional rasa jahe aromatik' },
      { id: 'tr13', name: 'Wedang Susu', price: 28, desc: 'Susu hangat dengan rempah tradisional' },
      { id: 'tr14', name: 'Wedang Madu', price: 28, desc: 'Madu alami dan rempah menyehatkan & menghangatkan' },
    ],
  },
  teh: {
    label: 'Teh', emoji: '🫖',
    items: [
      { id: 'te1', name: 'Lemongrass Tea', price: 28, desc: 'Teh dengan perasa jahe dan serai', rec: true },
      { id: 'te2', name: 'Lemon Tea', price: 28, desc: 'Teh dengan lemon segar' },
      { id: 'te3', name: 'Honey Lemon Tea', price: 32, desc: 'Teh dengan lemon dan madu asli' },
      { id: 'te4', name: 'Lychee Tea', price: 35, desc: 'Teh dengan perasa leci dan buah leci segar', rec: true },
      { id: 'te5', name: 'Strawberry Tea', price: 28, desc: 'Teh dengan perasa strawberry dan buah segar' },
      { id: 'te6', name: 'Teh Manis', price: 15, desc: 'Teh dengan tambahan gula' },
      { id: 'te7', name: 'Teh Tawar', price: 12, desc: 'Teh tawar' },
      { id: 'te8', name: 'Teh Poci', price: 26, desc: 'Teh poci khas pedesaan, sajian untuk dua orang' },
    ],
  },
  jus: {
    label: 'Jus', emoji: '🧃',
    items: [
      { id: 'j1', name: 'Jus Alpukat', price: 36, desc: 'Jus alpukat dengan susu kental manis coklat' },
      { id: 'j2', name: 'Jus Sirsak', price: 36, desc: 'Jus buah sirsak segar' },
      { id: 'j3', name: 'Jus Mangga', price: 36, desc: 'Jus buah mangga segar', rec: true },
      { id: 'j4', name: 'Jus Strawberry', price: 36, desc: 'Jus buah strawberry segar' },
      { id: 'j5', name: 'Jus Nanas', price: 36, desc: 'Jus buah nanas segar' },
      { id: 'j6', name: 'Jus Buah Naga', price: 36, desc: 'Jus buah naga segar' },
      { id: 'j7', name: 'Jus Semangka', price: 36, desc: 'Jus buah semangka segar' },
      { id: 'j8', name: 'Jus Jambu', price: 36, desc: 'Jus buah jambu segar' },
      { id: 'j9', name: 'Mix Fruit Juice', price: 46, desc: '2 buah pilihan', rec: true },
      { id: 'j10', name: 'Jus Sayur', price: 42, desc: 'Ketimun, caisim, lemon, wortel, tomat' },
    ],
  },
  dessert: {
    label: 'Dessert', emoji: '🍰',
    items: [
      { id: 'd1', name: 'Eclair Chocolate', price: 18, desc: 'Bentuk panjang, cream chocolate' },
      { id: 'd2', name: 'Eclair Blueberry', price: 18, desc: 'Bentuk panjang, cream blueberry jam' },
      { id: 'd3', name: 'Cream Brûlée', price: 16.5, desc: 'Tekstur creamy dengan topping strawberry' },
      { id: 'd4', name: 'Chicago Cheese Cake', price: 30, desc: 'Cream strawberry & white chocolate topping', rec: true },
      { id: 'd5', name: 'Chocolate Cake', price: 30, desc: 'Moist dan lembut, cokelat premium rich' },
      { id: 'd6', name: 'Strawberry Cake Slice', price: 35, desc: 'Lembut moist, rasa strawberry asam dan manis', rec: true },
      { id: 'd7', name: 'Oreo Chocolatte Cake', price: 30, desc: 'Lembut moist, taburan oreo dan coklat' },
      { id: 'd8', name: 'Choco Dome', price: 20, desc: 'Lembut moist, lapisan dark chocolate' },
      { id: 'd9', name: 'Egg Tart', price: 8, desc: 'Kulit pastry renyah, custard telur manis dan creamy' },
      { id: 'd10', name: 'Opera Cake', price: 30, desc: 'Berlapis sponge almond, kopi & cokelat ganache' },
    ],
  },
  jajanan: {
    label: 'Jajanan Pasar', emoji: '🍩',
    items: [
      { id: 'jp1', name: 'Donat Tiramisu', price: 12, desc: 'Donat lembut, topping glaze tiramisu' },
      { id: 'jp2', name: 'Donat Choco', price: 12, desc: 'Donat lembut, topping glaze coklat manis' },
      { id: 'jp3', name: 'Donat Red Velvet', price: 12, desc: 'Donat lembut, topping glaze red velvet' },
      { id: 'jp4', name: 'Donat Cream Keju', price: 12, desc: 'Donat lembut, topping glaze keju gurih' },
      { id: 'jp5', name: 'Donat Almond Nutella', price: 15, desc: 'Donat lembut, nutella & almond' },
      { id: 'jp6', name: 'Donat Oreo', price: 12, desc: 'Donat lembut, topping oreo' },
      { id: 'jp7', name: 'Rollade Pandan', price: 8, desc: 'Rollade lembut rasa pandan' },
      { id: 'jp8', name: 'Rollade Vanilla', price: 8, desc: 'Rollade lembut rasa vanilla' },
      { id: 'jp9', name: 'Banana Cake', price: 12, desc: 'Cake pisang lembut' },
      { id: 'jp10', name: 'Cassava Cake', price: 15, desc: 'Cake singkong tradisional' },
    ],
  },
  tambahan: {
    label: 'Tambahan', emoji: '➕',
    items: [
      { id: 'tb1', name: 'Kerupuk Udang', price: 12, desc: 'Kerupuk udang renyah' },
      { id: 'tb2', name: 'Kerupuk Emping', price: 15, desc: 'Kerupuk emping renyah' },
      { id: 'tb3', name: 'Extra Espresso', price: 15, desc: 'Tambahan shot espresso' },
      { id: 'tb4', name: 'Es Batu', price: 4, desc: 'Tambahan es batu' },
      { id: 'tb5', name: 'Susu Kental Manis', price: 10, desc: 'Tambahan susu kental manis' },
      { id: 'tb6', name: 'Gula Aren', price: 10, desc: 'Tambahan gula aren' },
      { id: 'tb7', name: 'Ice Cream', price: 15, desc: 'Tambahan es krim' },
    ],
  },
};

export const TAB_GROUPS: TabGroup[] = [
  { key: 'makanan', label: 'Makanan', icon: '🍽', categories: ['pembuka', 'sarapan', 'ayam', 'bebek', 'sate', 'soto_sop', 'iga', 'ikan', 'seafood', 'nasi', 'mie', 'tumisan', 'sambal', 'lalapan'] },
  { key: 'kopi', label: 'Kopi', icon: '☕', categories: ['kopi'] },
  { key: 'minuman', label: 'Minuman', icon: '🥤', categories: ['minuman', 'tradisional', 'teh', 'jus'] },
  { key: 'penutup', label: 'Penutup', icon: '🍰', categories: ['dessert', 'jajanan'] },
  { key: 'tambahan', label: 'Tambahan', icon: '➕', categories: ['tambahan'] },
];

export const REWARDS = [
  { name: 'Gratis Donat', points: 50, emoji: '🍩' },
  { name: 'Gratis Muffin', points: 50, emoji: '🧁' },
  { name: 'Gratis Kopi (any)', points: 120, emoji: '☕' },
  { name: 'Gratis Es Tradisional', points: 150, emoji: '🥥' },
  { name: 'Rp 25K Discount', points: 200, emoji: '💰' },
  { name: 'Gratis Ayam/Bebek', points: 300, emoji: '🍗' },
];

// Helper: get all items as flat array
export function getAllItems(): MenuItem[] {
  return Object.values(MENU).flatMap(cat => cat.items);
}

// Helper: find item by id
export function findItemById(id: string): MenuItem | undefined {
  return getAllItems().find(item => item.id === id);
}
