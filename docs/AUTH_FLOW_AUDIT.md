# Auth Flow Discovery Audit

> **Purpose:** Document every aspect of authentication in the Kamarasan app to inform the Apple App Store rejection fix (Guideline 4.8 Login Services, Guideline 4 Design, Guideline 4.2.3(i) Minimum Functionality).
>
> **Date:** 2026-04-10
> **Author:** Copilot audit (no code changes made)

---

## Current Auth Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  WELCOME SCREEN (app/auth/welcome.tsx)                              │
│                                                                     │
│  [Masuk dengan WhatsApp]          [Lanjutkan sebagai Tamu]          │
│         │                                   │                       │
│         ▼                                   ▼                       │
│  sendWhatsAppOTP()                  AuthContext.setGuest()           │
│  → middleware POST                  → storageSet(GUEST_KEY, 'true') │
│    /api/auth/whatsapp/send-otp      → router.replace('/')           │
│  → ESB POST                                                        │
│    /customer/whatsapp/generate-otp                                  │
│         │                                                           │
│         ▼                                                           │
│  Store OTP + WhatsApp URL                                           │
│  in module-level variable                                           │
│  (pendingOtp)                                                       │
│         │                                                           │
│         ▼                                                           │
│  router.push('/auth/phone')                                         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  PHONE SCREEN (app/auth/phone.tsx)                                  │
│                                                                     │
│  On mount:                                                          │
│  1. Read pendingOtp from memory                                     │
│  2. Linking.openURL(otpData.url)                                    │
│     ─── THIS EXITS THE APP TO WHATSAPP ───                          │
│  3. After 2s delay, set status = 'waiting'                          │
│  4. Start polling loop:                                             │
│     verifyOTP(otp) every 3 seconds                                  │
│     → middleware POST /api/auth/whatsapp/verify                     │
│     → ESB POST /customer/whatsapp/get-status-otp                    │
│                                                                     │
│  Poll responses:                                                    │
│  - PENDING  → keep polling                                          │
│  - VERIFIED → extract phone + authkey → login() → home              │
│  - EXPIRED  → show error, stop polling                              │
│                                                                     │
│  Timeout: 5 minutes → stop polling, show error                      │
│                                                                     │
│  On VERIFIED:                                                       │
│  → AuthContext.login(phone, authkey, branch, verifiedName)          │
│  → router.replace('/')                                              │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  AUTH CONTEXT (context/AuthContext.tsx)                              │
│                                                                     │
│  login(phone, authkey, branch, verifiedName?):                      │
│  1. Call checkMembership(branch, phone)                             │
│     → middleware POST /api/membership/check                         │
│     → ESB POST /qsv1/membership/check-member-status                │
│  2a. If REGISTERED: populate name, memberCode, points, tier         │
│  2b. If NOT_REGISTERED or error: create basic user (name=phone)     │
│  3. Store user in AsyncStorage (without authkey)                    │
│  4. Store authkey in SecureStore                                    │
│  5. Clear guest flag                                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Files Involved

| File | Role |
|------|------|
| `context/AuthContext.tsx` | Auth state provider: user object, login(), logout(), setGuest(), updateName(). Persists to AsyncStorage + SecureStore. |
| `app/auth/welcome.tsx` | Welcome/login screen. Two buttons: "Masuk dengan WhatsApp" and "Lanjutkan sebagai Tamu". Calls sendWhatsAppOTP(). |
| `app/auth/phone.tsx` | WhatsApp OTP waiting screen. Opens WhatsApp via Linking.openURL(). Polls verifyOTP() every 3s for up to 5 minutes. |
| `app/auth/verify.tsx` | Dead redirect screen — immediately redirects to `/auth/welcome`. Vestigial. |
| `app/auth/callback.tsx` | Deep link handler for `kamarasan://auth/callback`. Redirects to home after 1s. OTP verification is handled by polling in phone.tsx, not by this callback. |
| `app/_layout.tsx` | Root layout. Wraps app in AuthProvider. Contains auth gate: redirects to `/auth/welcome` if `!user && !isGuest`. Registers push token when user logs in. |
| `services/api.ts` | API client functions: `sendWhatsAppOTP()`, `verifyOTP()`, `checkMembership()`, `getUserOrders()`. |
| `utils/cache.ts` | AsyncStorage utilities. Keys: `cache:auth_user` (user profile without authkey), `cache:is_guest` (guest flag). |
| `server/index.ts` | Express middleware. Auth routes: `/api/auth/whatsapp/send-otp`, `/api/auth/whatsapp/verify`, `/api/membership/check`, `/api/user/auth`, `/api/user/orders`, `/api/user/addresses`. |
| `app/cart.tsx` | Checkout flow. Requires `user` to be non-null. Uses `user.authkey` for order submission. Shows login prompt if user is null. |
| `app/barcode.tsx` | Member barcode modal. Shows QR with memberCode. Prompts login if `!user`. |
| `app/(tabs)/profile.tsx` | Profile screen. Shows user data, logout button. Fetches order history using `user.authkey`. |
| `app/(tabs)/order.tsx` | Order tracking. Uses `user.authkey` to fetch history. |
| `app/(tabs)/index.tsx` | Home screen. Uses `user` for name, points, tier display. Has `updateName` for post-login name prompt. |
| `app/order/callback.tsx` | Deep link handler for `kamarasan://order/callback` (DANA payment return). Not auth-related but registered in same routing. |

---

## ESB Endpoints

### Auth Endpoints

| # | Method | Middleware Path | ESB Path | ESB Base URL | Purpose |
|---|--------|----------------|----------|--------------|---------|
| 1 | POST | `/api/auth/whatsapp/send-otp` | `/customer/whatsapp/generate-otp` | `ESB_AUTH_BASE` (always production: `https://eso-api.esb.co.id`) | Generate OTP, get WhatsApp message URL |
| 2 | POST | `/api/auth/whatsapp/verify` | `/customer/whatsapp/get-status-otp` | `ESB_AUTH_BASE` | Poll OTP verification status |
| 3 | POST | `/api/membership/check` | `/qsv1/membership/check-member-status` | `ESB_AUTH_BASE` | Check if phone is a registered member |
| 4 | POST | `/api/user/auth` | `/v1/user/auth` | `ESB_AUTH_BASE` | Generic user auth (exists but unused in app) |
| 5 | POST | `/api/user/orders` | `/v1/user/order` | `ESB_AUTH_BASE` | Fetch order history (requires userToken) |
| 6 | GET | `/api/user/addresses` | `/v1/user/address` | `ESB_AUTH_BASE` | Fetch saved addresses (requires userToken) |

### Endpoint 1: Generate WhatsApp OTP

**Middleware:** `POST /api/auth/whatsapp/send-otp`
**ESB:** `POST https://eso-api.esb.co.id/customer/whatsapp/generate-otp`

Request headers (set by middleware):
```
Content-Type: application/json
Authorization: Bearer {ESB_STATIC_TOKEN}
Data-Company: {ESB_COMPANY_CODE}
Data-Branch: {branch}  (optional)
```

Request body (hardcoded by middleware):
```json
{
  "requestText": "Hai! Saya ingin login ke Kamarasan dengan kode verifikasi:",
  "responseText": "Verifikasi berhasil! Klik link di bawah ini untuk melanjutkan pesanan kamu 🤩\n\n{{redirectUrl}}",
  "redirectUrl": "kamarasan://auth/callback"
}
```

Response (success):
```json
{
  "data": {
    "otp": "ABC123XY",
    "otpMessageUrl": "https://wa.me/628xxxxx?text=..."
  }
}
```

- `otp`: Alphanumeric code used to poll verification status. This is NOT shown to the user — it's a session identifier.
- `otpMessageUrl`: A `https://wa.me/` URL that, when opened, pre-fills a WhatsApp message to ESB's WhatsApp Business number with the verification code.

### Endpoint 2: Verify OTP Status

**Middleware:** `POST /api/auth/whatsapp/verify`
**ESB:** `POST https://eso-api.esb.co.id/customer/whatsapp/get-status-otp`

Request headers (set by middleware):
```
Content-Type: application/json
Authorization: Bearer {ESB_STATIC_TOKEN}
Data-Company: {ESB_COMPANY_CODE}
```

Request body:
```json
{
  "otp": "ABC123XY",
  "appID": "esoqs"
}
```

Response (pending — user hasn't sent WhatsApp message yet):
```json
{
  "data": {
    "status": "PENDING"
  }
}
```

Response (verified — user sent the WhatsApp message):
```json
{
  "data": {
    "status": "VERIFIED",
    "verifiedPhoneNumber": "3018149421",
    "authkey": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

Response (expired — OTP timed out server-side):
```json
{
  "data": {
    "status": "EXPIRED"
  }
}
```

**Key observations:**
- ESB does NOT return a customer name in the OTP response (confirmed by live testing — `verifiedName` extraction finds nothing).
- `verifiedPhoneNumber` comes back WITHOUT country code prefix (e.g., `"3018149421"` not `"623018149421"`). The app normalizes this to `62`-prefixed format.
- `authkey` is a JWT-like token used as Bearer auth for user-scoped ESB endpoints.
- `appID: "esoqs"` is hardcoded in the middleware. This identifies the ESB app context.

### Endpoint 3: Check Membership

**Middleware:** `POST /api/membership/check`
**ESB:** `POST https://eso-api.esb.co.id/qsv1/membership/check-member-status`

Request headers:
```
Content-Type: application/json
Authorization: Bearer {ESB_STATIC_TOKEN}
Data-Branch: {branch}
```
Note: NO `Data-Company` header (per ESB docs).

Request body:
```json
{
  "phoneNumber": "628123456789",
  "countryCode": "+62"
}
```

Response (registered member):
```json
{
  "status": "REGISTERED",
  "memberName": "Ryan Rochmanofenna",
  "memberCode": "MBR001234",
  "totalPoint": 250
}
```

Response (not registered):
```json
{
  "status": "NOT_REGISTERED"
}
```

**Key observation:** This endpoint identifies members by phone number. It is the ONLY way the app resolves a phone into a member profile.

---

## WhatsApp Login Flow (step-by-step)

### Step 1: User taps "Masuk dengan WhatsApp"
**File:** `app/auth/welcome.tsx:27-41`
- `handleWhatsApp()` is called
- Calls `sendWhatsAppOTP(currentBranchCode)` → `services/api.ts:324`
- This hits middleware `POST /api/auth/whatsapp/send-otp` → `server/index.ts:386`
- Middleware calls ESB `POST /customer/whatsapp/generate-otp` with hardcoded request/response text templates
- ESB generates an OTP session and returns `{ data: { otp, otpMessageUrl } }`

### Step 2: OTP stored in memory, navigate to phone screen
**File:** `app/auth/welcome.tsx:33-35`
- `setPendingOtp({ otp, url: otpMessageUrl })` — stored in module-level variable (NOT in URL params, NOT in AsyncStorage)
- `router.push('/auth/phone')`

### Step 3: Phone screen opens WhatsApp
**File:** `app/auth/phone.tsx:53-62`
- On mount, reads `getPendingOtp()` and calls `clearPendingOtp()`
- Calls `Linking.openURL(otpData.url)` — **this exits the app and opens WhatsApp**
- The URL is a `https://wa.me/` deep link that opens WhatsApp with a pre-filled message to ESB's WhatsApp Business number
- The message contains the verification code text (defined by `requestText` in step 1)

### Step 4: User sends WhatsApp message
- User is now IN WhatsApp, looking at a pre-filled message
- User taps send
- ESB's WhatsApp Business API receives the message
- ESB verifies the OTP code and marks the session as VERIFIED
- ESB replies to the user via WhatsApp with the `responseText` (which contains a `kamarasan://auth/callback` deep link)

### Step 5: User returns to app
- Two paths back:
  1. User taps the `kamarasan://auth/callback` link in WhatsApp → opens `app/auth/callback.tsx` → redirects to home after 1s
  2. User manually switches back to the Kamarasan app → the polling loop catches the VERIFIED status

### Step 6: Polling catches VERIFIED status
**File:** `app/auth/phone.tsx:65-116`
- While user is in WhatsApp, `phone.tsx` polls `verifyOTP(otp)` every 3 seconds
- Calls middleware `POST /api/auth/whatsapp/verify` → `server/index.ts:418`
- Middleware calls ESB `POST /customer/whatsapp/get-status-otp` with `{ otp, appID: 'esoqs' }`
- When ESB returns `status: "VERIFIED"`:
  - Extracts `verifiedPhoneNumber`, `authkey`, and attempts to extract `customerName` (always empty in practice)
  - Normalizes phone to `62`-prefixed format
  - Calls `login(phone, authkey, currentBranchCode, verifiedName)`

### Step 7: AuthContext.login() resolves the user
**File:** `context/AuthContext.tsx:72-113`
1. Calls `checkMembership(branch, phone)` → ESB `POST /qsv1/membership/check-member-status`
2. **If REGISTERED:** Creates User with `memberName`, `memberCode`, `totalPoint`, calculated tier
3. **If NOT_REGISTERED or error:** Creates basic User with `name: verifiedName || phone` (currently always the phone number since ESB doesn't return a name)
4. Stores user in AsyncStorage at `cache:auth_user` with `authkey: ''` (authkey scrubbed)
5. Stores authkey in SecureStore at key `'auth_token'`
6. Removes guest flag

### Step 8: Navigation to home
**File:** `app/auth/phone.tsx:89`
- `router.replace('/')` — navigates to home tab
- `app/_layout.tsx:42-46` — auth gate sees `user` is now non-null, allows access

---

## Session Management

### Token Lifecycle
- **authkey** is a JWT-like string returned by ESB on OTP verification
- **No known expiry time** — ESB docs don't specify TTL, and the app has no refresh mechanism
- **No refresh token** — there is no token refresh endpoint. When the authkey expires, API calls that use it (order history, addresses) will fail with 401
- **No proactive expiry handling** — if a 401 comes back during an API call, the app does NOT catch it as an auth expiry. It surfaces as a generic error.

### Persistence
| Data | Storage | Key | Contains authkey? |
|------|---------|-----|-------------------|
| User profile | AsyncStorage | `cache:auth_user` | **No** — authkey stripped to `''` before caching |
| Auth token | SecureStore (Keychain/Keystore) | `auth_token` | **Yes** — sole location of authkey |
| Guest flag | AsyncStorage (raw string) | `cache:is_guest` | N/A |

### Restore on App Launch
**File:** `context/AuthContext.tsx:50-70`
1. Reads `cache:auth_user` from AsyncStorage, `auth_token` from SecureStore, `cache:is_guest` from AsyncStorage — all in parallel
2. If cached user AND token both exist: merges token back into user object (`{ ...cachedUser, authkey: token }`)
3. If guest flag is `'true'`: sets `isGuest = true`
4. Sets `isLoading = false` to release the auth gate

### Logout
**File:** `context/AuthContext.tsx:115-125`
Clears all four storage locations in parallel:
1. `cacheClear(AUTH_USER_KEY)` — removes user from AsyncStorage
2. `SecureStore.deleteItemAsync('auth_token')` — removes authkey from SecureStore
3. `storageRemove(GUEST_KEY)` — removes guest flag
4. `cacheClear(CART_KEY)` — clears cart

Sets `user = null`, `isGuest = false`.

### Auth Gate Behavior
**File:** `app/_layout.tsx:42-46`
- If `isLoading`: render nothing (splash screen still visible)
- If `!user && !isGuest`: redirect to `/auth/welcome`
- If `user` OR `isGuest`: allow access to app

**Result:** Guests can browse the full app. Login is enforced at checkout (`app/cart.tsx:252-259`) and at barcode screen (`app/barcode.tsx:46`).

---

## WhatsApp-Specific Mechanics

### Who sends the WhatsApp message?
**ESB** manages the WhatsApp Business API. The app sends a `generate-otp` request to ESB, and ESB returns a `https://wa.me/` URL. The user opens WhatsApp via this URL, which pre-fills a message to ESB's WhatsApp Business number. ESB receives the message via WhatsApp Business API webhook and verifies the OTP.

### What does the WhatsApp message contain?
A text message with the verification code, formatted by the `requestText` template:
```
Hai! Saya ingin login ke Kamarasan dengan kode verifikasi: [OTP_CODE]
```

After ESB verifies, it replies with the `responseText` template:
```
Verifikasi berhasil! Klik link di bawah ini untuk melanjutkan pesanan kamu 🤩

kamarasan://auth/callback
```

### How does the app open WhatsApp?
**`Linking.openURL(otpData.url)`** — file `app/auth/phone.tsx:55`

This uses React Native's `Linking` API which calls the OS URL handler. The URL is `https://wa.me/628xxx?text=...`, which:
- On iOS: Opens WhatsApp app directly (if installed) or Safari (if not)
- On Android: Opens WhatsApp app directly (if installed) or default browser (if not)

**This is the Apple rejection trigger** — the app exits to WhatsApp or a web browser.

### Deep link return scheme
- Scheme: `kamarasan://` (registered in `app.json:9`)
- Auth callback: `kamarasan://auth/callback` → `app/auth/callback.tsx`
- But: the callback screen just redirects home after 1s. The actual verification is handled by the polling loop in `phone.tsx`, not by the deep link.

### Polling timeout
5 minutes (`5 * 60 * 1000 ms`) — file `app/auth/phone.tsx:106-110`. After timeout, polling stops and error message "Waktu verifikasi habis" is shown.

---

## ESB Alternative Login Support

### What ESB branch settings reveal about auth
From `server/sample-branch-settings.json`:
```json
{
  "feature": {
    "esbOrderLogin": true,
    "whatsappLogin": true,
    "whatsappLoginLoop": true
  }
}
```

The TypeScript type (`services/api.ts:127-131`) only models:
```typescript
feature: {
  whatsappLogin: boolean;
  voucherUsage: boolean;
  pickup: { pickupType: { pickupNow: boolean; pickupLater: boolean } };
};
```

### Does ESB support email-based login?
**No evidence found.** No email login endpoints, no email fields in auth requests, no email-related feature flags in branch settings.

### Does ESB support social login (Apple, Google, Facebook)?
**No evidence found.** No OAuth endpoints, no social login feature flags, no OIDC configuration.

### Does ESB have OAuth/OIDC endpoints?
**No.** Auth is entirely WhatsApp OTP based. The only auth endpoints are:
1. `/customer/whatsapp/generate-otp`
2. `/customer/whatsapp/get-status-otp`
3. `/v1/user/auth` (exists but purpose unclear — not used by the app)

### What fields are REQUIRED to create a member in ESB?
Based on the `checkMembership` endpoint, ESB identifies members by **phone number + country code**. There is no "create member" endpoint visible in the codebase or ESB API docs. Members appear to be created through:
1. WhatsApp OTP verification (which inherently provides a phone number)
2. Direct registration through ESB's own systems (POS, web portal)

**CRITICAL CONSTRAINT:** ESB's membership system is phone-number-centric. There is no observed mechanism to create or look up a member by email address or Apple ID.

### The `/v1/user/auth` endpoint
**File:** `server/index.ts:511-530`
This endpoint exists in the middleware but is **never called by the app**. It forwards raw POST body to `ESB_AUTH_BASE/v1/user/auth` with only `Data-Company` header (no Bearer token). Its purpose is unclear — it may be a legacy endpoint or intended for future use. The request/response shape is unknown.

---

## Key Constraints for Apple Fix

### What we CAN'T change
1. **ESB's auth system is WhatsApp-only.** There are no email, Apple, or Google login endpoints.
2. **ESB membership is phone-number-centric.** `checkMembership` requires a phone number. All user-scoped ESB operations (orders, addresses) use the `authkey` from WhatsApp OTP verification.
3. **ESB issues the authkey.** We cannot mint our own tokens that ESB will accept.

### What we CAN change
1. **Add Sign in with Apple as a parallel auth path** — but Apple users will NOT have an ESB authkey. They can browse and interact with the app but cannot place orders until we bridge them to ESB.
2. **Bridge strategy:** After Apple Sign In, prompt for phone number → run the WhatsApp OTP flow → link the Apple identity to the ESB authkey. This satisfies both Apple (native login exists) and ESB (phone-based auth still happens).
3. **Fix WhatsApp to stay in-app** — replace `Linking.openURL()` with an in-app WebView or `expo-web-browser`'s `openAuthSessionAsync()` which presents a Safari/Chrome overlay that returns to the app.
4. **Make login truly optional** — the app already supports guest browsing. Login is only enforced at checkout and barcode. This is the correct behavior for Apple's Guideline 4.2.3(i).

### Apple-specific requirements to address
1. **Guideline 4.8:** Must offer Sign in with Apple as an equivalent option alongside WhatsApp
2. **Guideline 4 (Design):** Login must not exit the app to a browser or third-party app. Use in-app web view for WhatsApp link.
3. **Guideline 4.2.3(i):** Users must be able to use the app without installing WhatsApp. Sign in with Apple + guest mode satisfies this.
4. **Account deletion:** Apple requires apps that support account creation to also support account deletion. Need to add a "Delete Account" flow.

### The phone number bridge problem
For Sign in with Apple users who don't share their email:
- Apple provides: `userIdentifier` (stable), optionally `email`, `fullName`
- ESB requires: `phoneNumber` to check membership and issue authkey
- **Solution:** After Apple Sign In, show a "Complete Your Profile" screen asking for phone number. Run WhatsApp OTP with that phone. Store the Apple ID → phone mapping locally. On future launches, restore session from SecureStore without re-doing OTP.

### What the app currently enforces login for
| Feature | Requires login? | Where enforced |
|---------|----------------|----------------|
| Browse menu | No | — |
| Search items | No | — |
| View item details | No | — |
| Add to cart | No | — |
| Explore tab | No | — |
| Home tab | No | — |
| Place order (checkout) | **Yes** | `app/cart.tsx:252-259` — Alert with login redirect |
| View member barcode | **Yes** | `app/barcode.tsx:46` — shows login prompt UI |
| View order history | Partially | `app/(tabs)/order.tsx:579` — fetches only if `user.authkey` exists |
| Profile (name, points) | Shows defaults | Falls back to "Tamu", 0 points, Perunggu tier |
| Rewards/vouchers | **Yes** | Requires memberCode |
| Reservations | No | — |

This is already correct for Apple's requirement — the app is fully browsable without logging in.
