# Remaining Features + Production Prep — Design Spec

**Date:** 2026-04-03  
**Priority order:** Delivery → Production prep → Profile/Order History → QR code → Push notifications (if time)

---

## 1. Delivery Mode with Google Places Autocomplete

**Approach:** Client-side `react-native-google-places-autocomplete` with bundle ID-restricted API key.

### Flow
1. User selects "Delivery" mode in cart
2. Google Places autocomplete input appears
3. User selects address → lat/lng extracted from place details
4. App calls `checkDeliveryDistance(branch, lat, lng)`
5. **If out of range:** Show alert "Maaf, lokasi kamu di luar jangkauan delivery" with option to switch to Take Away
6. **If in range:** Call `getCourierCost(branch, { lat, lng, address })` → delivery fee shown in price breakdown
7. Order payload includes: `deliveryAddress`, `deliveryAddressInfo`, `latitude`, `longitude`, `deliveryCourierID`

### Files
- `app/cart.tsx` — uncomment delivery mode, add address input, distance check, courier cost in total
- `package.json` — add `react-native-google-places-autocomplete`
- `constants/config.ts` — add `GOOGLE_PLACES_API_KEY`

### Edge cases
- No GPS permission → still works via typed address (Places API returns lat/lng)
- Out of range → clear error + suggest Take Away
- Network error on distance check → generic error, don't block

---

## 2. Production Deployment Prep

### Environment switching
- `constants/config.ts` gets `ENV` config: `staging` vs `production`
- **Staging:** company=SAE, defaultBranch=MDOUT, ESB=stg7.esb.co.id
- **Production:** company=MBLA, defaultBranch=MOOUT1, ESB=eso-api.esb.co.id
- Server `.env.production` template with production values
- Server `.env.staging` kept as-is

### Deployment config
- `server/Dockerfile` for Railway deployment
- `server/railway.toml` configuration
- `eas.json` for EAS Build (iOS + Android profiles)
- Production checklist document

### Files
- `constants/config.ts` — env-aware config
- `constants/stores.ts` — production branch codes
- `server/.env.production` — template
- `server/Dockerfile` + `server/railway.toml`
- `eas.json`

---

## 3. Profile Stubs + Functional Order History

### Riwayat Pesanan (Order History) — make functional
- `app/(tabs)/order.tsx` — audit and wire to real ESB order data via OrderContext
- Show active orders at top, history below
- Each order card: orderId, date, total, status badge, item count

### Placeholder screens (minimal)
- Metode Pembayaran, Lokasi Tersimpan, Notifikasi, Ajak Teman, Bantuan
- Simple screen with title + "Segera hadir" message + back button

---

## 4. QR Code Rendering

- Install `react-native-qrcode-svg` + `react-native-svg`
- Replace Alert in cart.tsx cashier flow with QR display on confirmation screen
- Pass QR data to OrderConfirmation component

---

## 5. Push Notifications (lowest priority)

- `expo-notifications` for token registration
- Server stores device tokens (in-memory for MVP, DB later)
- Webhook routes send push via Expo Push API
- Only if time permits

---

## 6. Fix Pre-existing TS Warnings

- `index.tsx:371` — ViewStyle typing fix
- `menu.tsx:24` — duplicate key fix
