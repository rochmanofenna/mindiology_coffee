# ESB Order & Payment Status Reference

**Source:** Empirical — `GET /qsv1/order/MBLAMCEJUCVTF` + `GET /qsv1/payment/validate/MBLAMCEJUCVTF` against production ESB on 2026-04-09.

**Order snapshot used:** A real TestFlight order where the user abandoned the DANA payment flow. ESB's state for this order:

- Order-level: `status: "New"` (payment never arrived at POS, kitchen never saw it)
- Payment-level: `salesPayment.paymentStatus: "closed"` (payment flow terminated)
- Payment validate: `status: "expired"` (DANA window timed out)

---

## 1. Order Detail Endpoint (`GET /qsv1/order/:orderId`)

**Top-level fields relevant to tracking:**

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `orderID` | string | `"MBLAMCEJUCVTF"` | Primary key |
| **`status`** | **string** | **`"New"`** | **Order lifecycle state (capitalized)** |
| `statusID` | number \| null | `null` | Numeric ID alongside string status — unused in this snapshot |
| `orderType` | string | `"takeAway"` | dineIn \| takeAway \| delivery |
| `orderTypeName` | string | `"pickup"` | Human-friendly type label |
| `queueNum` | string \| null | `null` | Queue number — null until payment confirmed |
| `tableID` / `tableName` | number / string | `0` / `""` | Dine-in only |
| `grandTotal` | number | `19800` | In Rupiah |
| `subtotal` | number | `18000` | Before tax |
| `vatTotal` | number | `1800` | PB1 tax |
| `roundingTotal` | number | `0` | ESB rounding adjustment |
| `cancelCount` | number | `0` | Number of times order was cancelled |
| `refundStatus` | string \| null | `null` | Refund state — null if no refund |
| `branchCode` / `branchName` | string | `"MCE"` / `"MINDIOLOGY COFFEE EMERALD"` | |
| `fullName` / `phoneNumber` | string | `"Ryan"` / `"623018149421"` | Customer info |
| `memberID` | string \| null | `null` | Loyalty member ID if registered |
| `transactionDate` | ISO string | `"2026-04-09T16:11:43+07:00"` | Order creation time (+07:00 Jakarta) |
| `editedDate` | ISO string | `"2026-04-09 16:11:43"` | Last update time |
| `qrData` | string | base64-ish | Encrypted QR for Pay at Cashier |

**Nested: `salesPayment` object**

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| `paymentMethodID` | string | `"danaesb"` | Note: production uses `danaesb`, not `dana` |
| `paymentOrderID` | string | `"MBLAMCEJUCVTF"` | Same as orderID |
| `paymentTransactionID` | string | `"MBLAIGNQ9AL415W97EP"` | Gateway transaction ID (Xendit/DANA) |
| `paymentTotal` | number | `19800` | |
| `paymentDate` | string \| null | `null` | null if payment never completed |
| **`paymentStatus`** | **string** | **`"closed"`** | **lowercase** |

**Nested: `delivery` object** (only meaningful for delivery orders)

| Field | Type | Example |
|-------|------|---------|
| `deliveryCourier` | string | `"internal"` |
| `deliveryCourierID` | number | `0` |
| `driverPhone` | string \| null | `null` |

**Nested: `salesMenus` array** — line items with per-item `statusID` and `statusName` fields (for partial fulfillment tracking; unused in our v1 scope).

---

## 2. Payment Validate Endpoint (`GET /qsv1/payment/validate/:orderId`)

**Full response (tiny):**

```json
{
  "companyCode": "MBLA",
  "companyAlias": "MBLA",
  "branchCode": "MCE",
  "status": "expired",
  "flagPushToPOS": false,
  "errorMessage": ""
}
```

| Field | Type | Observed values | Notes |
|-------|------|----------------|-------|
| **`status`** | **string** | **`"expired"`** | **lowercase, terminal-ish** |
| `flagPushToPOS` | boolean | `false` | `true` when order was pushed to kitchen |
| `errorMessage` | string | `""` | Empty on success, populated on error |

**Inferred payment validate states (educated guesses — logged to Sentry if encountered):**

- `"expired"` ✅ CONFIRMED — DANA window timed out, user abandoned
- `"success"` — likely — payment confirmed by gateway
- `"pending"` — likely — payment in progress
- `"failed"` — likely — gateway declined
- `"cancelled"` — possible — user cancelled in DANA app

---

## 3. Status Mapping — ESB → Our 6-State Client Model

Our app's internal status union (after Phase 2):

```typescript
type OrderStatus = 'waiting_payment' | 'received' | 'processing' | 'ready' | 'completed' | 'cancelled';
```

### ESB order-level `status` field → app status

| ESB value | Confidence | Our mapping | Reasoning |
|-----------|------------|-------------|-----------|
| `"New"` | ✅ CONFIRMED | `waiting_payment` **or** `received` | Ambiguous on its own — resolve by cross-referencing `salesPayment.paymentStatus` |
| `"Accepted"` | Guessed | `received` | Payment confirmed, kitchen acknowledged |
| `"Processing"` / `"InProgress"` / `"Preparing"` | Guessed | `processing` | Food being prepared |
| `"Ready"` | Guessed | `ready` | Ready for pickup/pickup |
| `"Completed"` / `"Done"` | Guessed | `completed` | Order fulfilled |
| `"Cancelled"` / `"Void"` / `"Voided"` | Guessed | `cancelled` | Order voided |

**CRITICAL RULE for `"New"` disambiguation:**

- If `salesPayment.paymentStatus === "closed"` **AND** payment validate returned `"expired"` → **`cancelled`** (payment abandoned)
- If `salesPayment.paymentStatus === "closed"` AND `paymentDate !== null` → **`received`** (paid, waiting for kitchen ack)
- If `salesPayment.paymentStatus === "open"` OR `paymentDate === null` AND payment validate returned `"pending"` or not yet called → **`waiting_payment`**
- Default fallback for `"New"` alone → **`waiting_payment`** (safest — user can still pay)

### ESB `salesPayment.paymentStatus` field

| ESB value | Confidence | Meaning |
|-----------|------------|---------|
| `"closed"` | ✅ CONFIRMED | Payment flow terminated (success OR failure — check other fields) |
| `"open"` | Guessed | Payment in progress |
| `"pending"` | Possible | Awaiting gateway callback |

### ESB payment validate `status` field

| ESB value | Confidence | Our mapping contribution |
|-----------|------------|--------------------------|
| `"expired"` | ✅ CONFIRMED | Payment abandoned — order should become `cancelled` |
| `"success"` | Guessed | Payment confirmed — order advances past `waiting_payment` |
| `"pending"` | Guessed | Still waiting — stay in `waiting_payment` |
| `"failed"` | Guessed | Gateway declined — `cancelled` |

---

## 4. Extraction Strategy

The app's `extractStatus()` function will:

1. **Normalize input**: `String(raw).toLowerCase().trim()` before lookup
2. **Primary lookup**: check against `ESB_STATUS_MAP` (known mappings)
3. **Fallback handling for unknown values**: return `null` AND log to Sentry with `level: 'error'` and the raw value
4. **Cross-reference rule for `'new'`**: if called with full order object context, check `salesPayment.paymentStatus` and `paymentDate` to disambiguate
5. **Payment-validate integration**: if payment validate returns `'expired'` / `'failed'`, override order status to `cancelled`

Implementation lives in `context/OrderContext.tsx`.

---

## 5. Open Questions (not blocking v1, log via Sentry)

1. What does ESB return when payment succeeds and the order has been pushed to POS? (We've never observed this state.)
2. Does the `status` field progress `New → Accepted → InProgress → Ready → Completed` in exactly those words, or does ESB use different labels?
3. Is there a "cancelled by outlet" vs "cancelled by customer" distinction? (`cancelCount` > 0 might be a clue.)
4. When `refundStatus` becomes non-null, what are its values?
5. Does the history endpoint (`POST /v1/user/order`) return the same top-level `status` field, or a nested/renamed variant?

**Resolution plan:** Any `extractStatus()` call that encounters an unmapped value will Sentry-capture it with the full raw response (first 500 chars). Within a week of production usage, we'll have the complete set and can update this doc.

---

## 6. Field naming cheat sheet (for the middleware proxy)

When writing status extraction or transformation, these are the actual field names ESB uses — NO variants:

- `orderID` (not `order_id`, `orderId`, or `id`)
- `status` (top-level — **not** `orderStatus`, `order_status`, or `statusCode`)
- `salesPayment.paymentStatus`
- `salesPayment.paymentDate` / `paymentMethodID` / `paymentTransactionID`
- `cancelCount`
- `refundStatus`
- `transactionDate` (not `createdAt`, `created_at`)
- `editedDate` (not `updatedAt`)

The fallbacks in `mapToOrder()` in `OrderContext.tsx` that try `order_id`, `order_status`, etc. are defensive but ESB does NOT actually use them. Keep the fallbacks for history endpoint variance, but the primary path should use the exact names above.
