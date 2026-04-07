# Kamarasan Feature Completion + Security Hardening Plan

**Goal:** Complete all remaining feature gaps, then harden security across middleware and app.

**Scope:** 8 feature tasks, then 10 security tasks. Features first per user request.

---

## Phase 1: Feature Completion

### Step 1: Validate Payment in Order Polling Loop
**Priority:** Critical — ESB sequence diagrams require this  
**Files:** `context/OrderContext.tsx`, `services/api.ts`

**Current state:** OrderContext polls `getOrder()` every 30s to check status. ESB's sequence diagram shows you must call **Validate Payment API** after DANA redirect to confirm payment landed before the order progresses.

**Changes:**
- In `OrderContext.startPolling()`, call `validatePayment(orderId, branchCode)` first, then `getOrder()` to get status
- Only call validatePayment while status is `'received'` (payment pending) — once confirmed, switch to getOrder-only polling
- Import `validatePayment` from `services/api`

**Estimated complexity:** Small (10-15 lines changed)

---

### Step 2: Dine-In Table Number Input
**Priority:** High — ESB expects `tableName` field for dine-in orders  
**Files:** `app/cart.tsx`

**Current state:** `tableName: null` is always sent. ESB needs actual table number for dine-in mode.

**Changes:**
- Add `tableNumber` state (`useState<string>('')`)
- When `orderMode === 'dineIn'`, show a TextInput below the mode selector for table number
- Style it as a compact input row matching the existing `branchRow` design
- Pass `tableName: orderMode === 'dineIn' ? tableNumber || null : null` in orderPayload
- Disable checkout if dineIn selected and no table number entered

**Estimated complexity:** Small (20-30 lines)

---

### Step 3: Pay at Cashier Flow
**Priority:** High — ESB supports this; currently disabled  
**Files:** `app/cart.tsx`, `constants/payments.ts`, `services/api.ts`, `server/index.ts`

**Current state:** `atCashier` is listed as `false` in ESB config. The constants file only has online payment methods. ESB has an **Encrypt QR Data** API (`/qsv1/order/encrypt-qr-data`) that generates a QR code for the cashier to scan.

**Changes:**
- `constants/payments.ts`: Add `{ id: 'cashier', name: 'Bayar di Kasir', available: true, icon: 'cash-outline' }` to PAYMENT_METHODS
- `services/api.ts`: Add `encryptQrData(branch, orderId)` function calling `/api/order/encrypt-qr-data`
- `server/index.ts`: Add `POST /api/order/encrypt-qr-data` route proxying to ESB `/qsv1/order/encrypt-qr-data`
- `app/cart.tsx`: After saveOrder succeeds with `paymentMethod === 'cashier'`:
  - Call `encryptQrData` to get QR data
  - Instead of opening payment URL, show the QR in the OrderConfirmation screen (or an alert with the encrypted data for MVP)
  - The QR string can be rendered via a simple `Text` for now (QR image rendering is a nice-to-have)

**Estimated complexity:** Medium (40-50 lines across 4 files)

---

### Step 4: Dynamic Payment Methods from ESB Branch Settings
**Priority:** Medium — currently hardcoded  
**Files:** `app/cart.tsx`, `context/BranchContext.tsx`

**Current state:** Payment methods are imported from `constants/payments.ts` (hardcoded). ESB's `/qsv1/setting/branch` returns `payment.online[]` and `payment.atCashier` per branch.

**Changes:**
- `context/BranchContext.tsx`: Already fetches branch settings. Expose `branchSettings?.payment` via context (or derive available payments from it)
- Add a `paymentMethods` field to the branch context value, computed from `settings.payment.online` + `settings.payment.atCashier`
- `app/cart.tsx`: Replace `PAYMENT_METHODS` import with `paymentMethods` from `useBranch()`. Fall back to hardcoded PAYMENT_METHODS if branch settings haven't loaded yet

**Estimated complexity:** Medium (25-35 lines)

---

### Step 5: Post-Login Name Prompt
**Priority:** Medium — fullName currently shows phone number  
**Files:** `context/AuthContext.tsx`, new inline modal in `app/_layout.tsx` or `app/(tabs)/index.tsx`

**Current state:** ESB WhatsApp OTP returns phone number but not customer name. `fullName` in orders shows the phone as the name. Memory note confirms: "Needs either a post-login name prompt or a separate profile endpoint call."

**Changes:**
- `context/AuthContext.tsx`: Add `updateName(name: string)` method that updates user.name and persists to cache
- In the home screen `app/(tabs)/index.tsx` or in `_layout.tsx`: After login, if `user.name === user.phone` (i.e. name was never set), show a simple modal/overlay asking "Siapa nama kamu?" with a TextInput and a confirm button
- On confirm, call `updateName(name)` to persist
- This only shows once — once name differs from phone, it never shows again

**Estimated complexity:** Medium (40-50 lines)

---

### Step 6: Profile Order Count from Real Data
**Priority:** Low — cosmetic  
**Files:** `app/(tabs)/profile.tsx`

**Current state:** Profile shows `'\u2014'` (em-dash) for order count. OrderContext has `fetchHistory` which returns real order data.

**Changes:**
- Import `useOrder` from `context/OrderContext`
- Import `useAuth` for the auth token
- On mount (or on focus), call `fetchHistory(user.authkey)` if not already loaded
- Display `orderHistory.length` (or `activeOrders.length + orderHistory.length`) instead of `'\u2014'`
- Handle loading state (show a small spinner or keep the dash until loaded)

**Estimated complexity:** Small (10-15 lines)

---

### Step 7: Menu API with memberCode Parameter
**Priority:** Low — enables member-specific pricing  
**Files:** `services/api.ts`, `server/index.ts`, `context/BranchContext.tsx`

**Current state:** `getMenu()` doesn't pass `memberCode`. ESB can return member-specific pricing/promos if memberCode is included.

**Changes:**
- `services/api.ts`: Add optional `memberCode` param to `getMenu(branch, visitPurpose, memberCode?)`
- `server/index.ts`: Pass `memberCode` as query param to ESB menu endpoint if provided
- `context/BranchContext.tsx`: In `fetchMenu()`, pass `user?.memberCode` to `getMenu()` if user is logged in (requires accessing AuthContext — may need to restructure providers or pass memberCode as param)

**Estimated complexity:** Small (10-15 lines) — but provider ordering might add complexity

---

### Step 8: Delivery Radius Check Wiring
**Priority:** Low — delivery mode is currently hidden  
**Files:** `app/cart.tsx`, `services/api.ts`

**Current state:** Delivery mode is commented out in ORDER_MODES. The `checkDeliveryDistance` and `getCourierCost` functions exist in api.ts. Server routes exist.

**Changes:**
- Uncomment delivery in ORDER_MODES
- When `orderMode === 'delivery'`, show delivery address input (TextInput for address + use device location for lat/lng)
- Before checkout, call `checkDeliveryDistance(branch, lat, lng)` — if out of range, show error
- Call `getCourierCost(branch, { lat, lng, address })` to get delivery fee, add to total
- Pass delivery address/lat/lng in orderPayload
- This is the biggest feature — could be deferred to a later sprint

**Estimated complexity:** Large (80+ lines) — **recommend deferring to Phase 3**

---

## Phase 2: Security Hardening

### Step 9: Input Validation on URL-Interpolated Params
**Files:** `server/index.ts`

All route params that get interpolated into ESB URL paths (`lat`, `lng`, `orderId`, `menuId`, `memberCode`, `visitPurpose`, `date`) are unsanitized. An attacker could inject path traversal or extra path segments.

**Changes:**
- Add a `sanitize(param, pattern)` helper that validates against allowed patterns
- `orderId`: alphanumeric + dash, max 30 chars
- `lat/lng`: float regex `-?\d+\.?\d*`
- `menuId`: alphanumeric
- `visitPurpose`: digits only
- `branch`: alphanumeric, max 10 chars
- `date`: ISO date regex `\d{4}-\d{2}-\d{2}`
- `memberCode`: alphanumeric
- Return 400 with generic message on validation failure

---

### Step 10: Rate Limiting
**Files:** `server/index.ts`, `package.json`

**Changes:**
- Install `express-rate-limit`
- Global: 100 req/min per IP
- OTP endpoints (`/api/auth/whatsapp/*`): 5 req/min per IP
- Order endpoint (`/api/order`): 10 req/min per IP
- Membership check: 10 req/min per IP

---

### Step 11: CORS Whitelist
**Files:** `server/index.ts`

**Current:** `app.use(cors())` — open to all origins.

**Changes:**
- In production: whitelist `https://kamarasan.app` and the Expo dev server
- In dev: allow all (or localhost patterns)

---

### Step 12: Error Response Sanitization
**Files:** `server/index.ts`

**Current:** Every catch block does `res.status(err.status || 500).json(err)` — this forwards full ESB error payloads (potentially including internal URLs, stack traces, API keys) to the client.

**Changes:**
- Create a `safeError(err)` helper that returns `{ error: true, message: <sanitized> }`
- Never forward raw ESB response on error
- Log full error server-side, return generic message to client

---

### Step 13: Webhook Signature Verification
**Files:** `server/index.ts`

**Current:** `/webhooks/esb/order` and `/webhooks/esb/pickup` accept any POST request with no auth.

**Changes:**
- Check for ESB webhook signature header (if ESB provides one)
- Or: verify source IP range
- Or: at minimum, check for a shared secret in headers

---

### Step 14: Helmet.js Security Headers
**Files:** `server/index.ts`, `package.json`

**Changes:**
- Install `helmet`
- `app.use(helmet())` — adds X-Frame-Options, X-Content-Type-Options, etc.

---

### Step 15: Remove authkey from AsyncStorage Cache
**Files:** `context/AuthContext.tsx`

**Current:** `cacheSet(AUTH_USER_KEY, newUser)` stores the entire User object including `authkey` in AsyncStorage (unencrypted). The authkey is also in SecureStore.

**Changes:**
- When caching user, omit `authkey`: `cacheSet(AUTH_USER_KEY, { ...newUser, authkey: '' })`
- On restore, read authkey from SecureStore separately and merge
- This prevents authkey leakage if device storage is compromised

---

### Step 16: Remove Token Query String Fallback
**Files:** `server/index.ts`

**Current:** `/api/user/addresses` reads token from `req.headers['x-user-token'] || req.query.userToken` — query strings are logged in server access logs and browser history.

**Changes:**
- Remove `req.query.userToken` fallback
- Only accept token via header

---

### Step 17: Body Size Limits
**Files:** `server/index.ts`

**Changes:**
- `app.use(express.json({ limit: '1mb' }))` — prevent large payload DoS

---

### Step 18: Deep Link Callback Handlers
**Files:** `app.json`, `app/_layout.tsx`

**Current:** `returnUrl: 'kamarasan://order/callback'` is sent to ESB but there's no route handler for this deep link. When DANA redirects back to the app, nothing happens.

**Changes:**
- Add `app/order/callback.tsx` — parses the deep link params (orderId, status), navigates to order tracking
- Add `app/auth/callback.tsx` — parses auth callback deep link from WhatsApp OTP redirect
- Register both in expo-router's file-based routing (just creating the files is enough)

---

## Execution Order

1. **Steps 1-2** (validate payment + table number) — critical, independent, can be parallelized
2. **Steps 3-4** (pay at cashier + dynamic payments) — medium priority, depend on each other somewhat
3. **Steps 5-6** (name prompt + order count) — medium/low, independent
4. **Step 7** (memberCode in menu) — low, simple
5. **Step 8** (delivery) — recommend **deferring** — it's a mini-feature on its own
6. **Steps 9-18** (security) — do as a batch after all features land

## Review Checkpoints

- After Steps 1-2: verify order flow still works with validatePayment + table number
- After Steps 3-4: test pay-at-cashier flow and verify dynamic payment methods load
- After Steps 5-7: test name prompt shows only when needed, profile updates
- After Steps 9-18: run a manual security test pass
