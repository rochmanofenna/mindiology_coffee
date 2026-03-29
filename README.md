# Kamarasan — Soulfood Nusantara Mobile App

Mobile ordering app for **Kamarasan Soulfood Nusantara** and **Mindiology Coffee**, built with Expo (React Native).

## Features
- Full menu (150+ items) with search and categorized browsing
- Order-ahead with cart management
- Rewards/loyalty system with tier progression
- Store locations for all Mindiology/Kamarasan outlets
- Indonesian language UI with IDR pricing (tax + service charge)

## Project Structure

```
kamarasan-app/
├── app/
│   ├── _layout.tsx              # Root layout (CartProvider, navigation)
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Tab bar layout
│   │   ├── index.tsx            # Home screen
│   │   ├── menu.tsx             # Menu browsing + search
│   │   ├── rewards.tsx          # Rewards & loyalty
│   │   ├── cart.tsx             # Cart + checkout + confirmation
│   │   └── profile.tsx          # Profile + store locations
│   └── item/
│       └── [id].tsx             # Item detail modal
├── constants/
│   ├── theme.ts                 # Colors, fonts, spacing, price formatters
│   └── menu.ts                  # Full menu data, types, helpers
├── context/
│   └── CartContext.tsx           # Global cart state
├── app.json                     # Expo config
├── eas.json                     # EAS Build config
├── package.json
├── babel.config.js
└── tsconfig.json
```

## Quick Start

### 1. Install dependencies
```bash
cd kamarasan-app
npm install
```

### 2. Run in development
```bash
# Start Expo dev server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android

# Run on physical device: scan QR code with Expo Go app
```

### 3. Run on your phone
- Install **Expo Go** from App Store / Play Store
- Run `npx expo start`
- Scan the QR code displayed in terminal

## Deploy to App Stores

### Prerequisites
- **iOS**: Apple Developer account ($99/year) → https://developer.apple.com
- **Android**: Google Play Console ($25 one-time) → https://play.google.com/console
- **EAS CLI**: `npm install -g eas-cli`

### Step 1: Login to Expo
```bash
eas login
```

### Step 2: Configure eas.json
Edit `eas.json` and replace the placeholder values:
- `appleId`: Your Apple ID email
- `ascAppId`: Your App Store Connect app ID
- `appleTeamId`: Your Apple Developer team ID
- `serviceAccountKeyPath`: Path to Google Play service account JSON

### Step 3: Build for stores
```bash
# Build for iOS (creates .ipa)
eas build --platform ios --profile production

# Build for Android (creates .aab)
eas build --platform android --profile production
```

### Step 4: Submit to stores
```bash
# Submit to App Store
eas submit --platform ios --profile production

# Submit to Google Play
eas submit --platform android --profile production
```

### Step 5: TestFlight / Internal Testing
- **iOS**: Build goes to TestFlight automatically. Add testers in App Store Connect.
- **Android**: Build goes to Internal Testing track. Add testers in Play Console.

## Next Steps for Production

### Backend (Supabase recommended)
```
Tables needed:
- users (auth, profile)
- orders (order_id, user_id, items, status, total, created_at)
- rewards (user_id, points, tier, history)
- menu_items (id, name, price, category, available, etc.)
```

### Payments (Stripe)
- Add `@stripe/stripe-react-native` for payment processing
- Create Stripe account and configure webhooks

### Push Notifications
- `expo-notifications` for order status updates
- "Your order is ready for pickup!" flow

### Admin Dashboard
- Web app (React/Next.js) for kitchen/counter staff
- Real-time order queue with status management
- Daily sales reporting

## Design System
- **Colors**: Deep green (#1B5E3B), gold (#C9A84C), cream (#FDF6EC), hibiscus (#C43A4B)
- **Typography**: Fraunces (display) + DM Sans (body)
- **Radius**: 8/14/18/22px scale
- **Shadows**: Green-tinted soft shadows

## Menu Data
All 150+ items from the Kamarasan Sept 2025 PDF are in `constants/menu.ts`, organized into 20 categories across 5 tab groups (Makanan, Kopi, Minuman, Penutup, Tambahan).
