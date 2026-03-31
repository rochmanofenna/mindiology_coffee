// ─── server/index.ts ─── Kamarasan × ESB Middleware ───
// Real endpoints from ESB OpenAPI spec v3.0.3
// Deploy: Railway ($5/mo) or Vercel Edge Functions (free)

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// ─── ESB Config (from OpenAPI spec) ───
const ESB_BASE = process.env.ESB_ENV === 'staging'
  ? 'https://stg7.esb.co.id/api-ezo/web'   // Staging
  : 'https://eso-api.esb.co.id';             // Production
// Auth endpoints use production URL (staging doesn't support /customer/ path)
const ESB_AUTH_BASE = 'https://eso-api.esb.co.id';
const ESB_TOKEN      = process.env.ESB_STATIC_TOKEN;
const COMPANY_CODE   = process.env.ESB_COMPANY_CODE;
const DEFAULT_BRANCH = process.env.ESB_DEFAULT_BRANCH || 'MDOUT';

if (!ESB_TOKEN) throw new Error('Missing ESB_STATIC_TOKEN env var');
if (!COMPANY_CODE) throw new Error('Missing ESB_COMPANY_CODE env var');

// ─── ESB fetch helper ───
const esb = async (
  path: string,
  opts: { method?: string; body?: any; branch?: string; userToken?: string } = {}
) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${opts.userToken || ESB_TOKEN}`,
    'Data-Company': COMPANY_CODE,
  };
  if (opts.branch) headers['Data-Branch'] = opts.branch;

  const res = await fetch(`${ESB_BASE}${path}`, {
    method: opts.method || 'GET',
    headers,
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
  });

  const data = await res.json();
  if (!res.ok) throw { status: res.status, ...data };
  return data;
};

// ═══════════════════════════════════════
// 1. BRANCHES
// ═══════════════════════════════════════

// GET /api/branches?lat=-6.28&lng=106.71
app.get('/api/branches', async (req, res) => {
  try {
    const { lat = '-6.28', lng = '106.71' } = req.query;
    const data = await esb(`/qsv1/branch/${lat}/${lng}`);
    res.json(data);
  } catch (err: any) {
    console.error(`[branches] Error:`, err.message || err);
    res.status(err.status || 500).json(err);
  }
});

// GET /api/branch/settings?branch=MIND1
app.get('/api/branch/settings', async (req, res) => {
  try {
    const data = await esb('/qsv1/setting/branch', {
      branch: req.query.branch as string,
    });
    // data includes: tax config, payment methods,
    // business hours, feature flags, orderModes
    res.json(data);
  } catch (err: any) {
    console.error(`[branch-settings] Error:`, err.message || err);
    res.status(err.status || 500).json(err);
  }
});

// ═══════════════════════════════════════
// 2. MENU
// ═══════════════════════════════════════

// GET /api/menu?branch=MIND1&visitPurpose=65
app.get('/api/menu', async (req, res) => {
  try {
    const { branch, visitPurpose } = req.query;
    const data = await esb(
      `/qsv1/menu/${visitPurpose}`,
      { branch: branch as string }
    );
    res.json(data);
  } catch (err: any) {
    console.error(`[menu] Error:`, err.message || err);
    res.status(err.status || 500).json(err);
  }
});

// GET /api/menu/detail?branch=MIND1&visitPurpose=65&menuId=MNU001
app.get('/api/menu/detail', async (req, res) => {
  try {
    const { branch, visitPurpose, menuId } = req.query;
    const data = await esb(
      `/qsv1/menu/detail/${visitPurpose}/${menuId}`,
      { branch: branch as string }
    );
    res.json(data);
  } catch (err: any) {
    console.error(`[menu-detail] Error:`, err.message || err);
    res.status(err.status || 500).json(err);
  }
});

// ═══════════════════════════════════════
// 3. ORDER FLOW
// ═══════════════════════════════════════

// POST /api/order/check-items
// Call BEFORE calculate-total to verify POS is online
app.post('/api/order/check-items', async (req, res) => {
  try {
    const { branch, ...body } = req.body;
    // ESB expects { salesMenus: [...], visitPurposeID: "63" }
    const data = await esb('/qsv1/order/check-items', {
      method: 'POST',
      branch,
      body,
    });
    res.json(data);
  } catch (err: any) {
    // 400 = "Failed to connect to outlet"
    console.error(`[check-items] Error:`, err.message || err);
    res.status(err.status || 500).json(err);
  }
});

// POST /api/order/calculate
app.post('/api/order/calculate', async (req, res) => {
  try {
    const { branch, ...orderData } = req.body;
    const data = await esb('/qsv1/order/calculate-total', {
      method: 'POST',
      branch,
      body: orderData,
    });
    res.json(data);
  } catch (err: any) {
    console.error(`[calculate] Error:`, err.message || err);
    res.status(err.status || 500).json(err);
  }
});

// POST /api/order
app.post('/api/order', async (req, res) => {
  try {
    const { branch, ...orderData } = req.body;
    console.log(`[order] Submitting to ESB:`, JSON.stringify(orderData, null, 2));
    const data = await esb('/qsv1/order', {
      method: 'POST',
      branch,
      body: orderData, // userToken stays in body — ESB expects it there, not as Bearer auth
    });
    console.log(`[order] ESB response:`, JSON.stringify(data, null, 2));
    res.json(data);
  } catch (err: any) {
    console.error(`[order] ESB error:`, JSON.stringify(err, null, 2));
    res.status(err.status || 500).json(err);
  }
});

// GET /api/order/:orderId?branch=MIND1
app.get('/api/order/:orderId', async (req, res) => {
  try {
    const data = await esb(
      `/qsv1/order/${req.params.orderId}`,
      { branch: req.query.branch as string }
    );
    res.json(data);
  } catch (err: any) {
    console.error(`[order-track] Error:`, err.message || err);
    res.status(err.status || 500).json(err);
  }
});

// GET /api/payment/validate/:orderId?branch=MIND1
app.get('/api/payment/validate/:orderId', async (req, res) => {
  try {
    const data = await esb(
      `/qsv1/payment/validate/${req.params.orderId}`,
      { branch: req.query.branch as string }
    );
    res.json(data);
  } catch (err: any) {
    console.error(`[payment-validate] Error:`, err.message || err);
    res.status(err.status || 500).json(err);
  }
});

// ═══════════════════════════════════════
// 4. LOYALTY / VOUCHERS
// ═══════════════════════════════════════

// GET /api/vouchers?branch=MIND1&memberCode=xxx
app.get('/api/vouchers', async (req, res) => {
  try {
    const { branch, memberCode } = req.query;
    const data = await esb(
      `/qsv1/membership/voucher-list?memberCode=${memberCode}`,
      { branch: branch as string }
    );
    res.json(data);
  } catch (err: any) {
    console.error(`[vouchers] Error:`, err.message || err);
    res.status(err.status || 500).json(err);
  }
});

// POST /api/membership/check
app.post('/api/membership/check', async (req, res) => {
  try {
    const { branch, phoneNumber, countryCode } = req.body;
    // ESB docs: only Data-Branch required, no Data-Company
    // Use production URL (staging returns "Invalid authentication credentials")
    const esbRes = await fetch(`${ESB_AUTH_BASE}/qsv1/membership/check-member-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ESB_TOKEN}`,
        'Data-Branch': branch || DEFAULT_BRANCH,
      },
      body: JSON.stringify({ phoneNumber, countryCode: countryCode || '+62' }),
    });
    const data = await esbRes.json();
    if (!esbRes.ok) throw { status: esbRes.status, ...data };
    // Returns: { status: "REGISTERED" } or { status: "NOT_REGISTERED" }
    res.json(data);
  } catch (err: any) {
    console.error(`[membership] Error:`, err.message || err);
    res.status(err.status || 500).json(err);
  }
});

// ═══════════════════════════════════════
// 5. PROMOTIONS
// ═══════════════════════════════════════

// POST /api/promotions — list available promotions for a visit purpose
app.post('/api/promotions', async (req, res) => {
  try {
    const { branch, visitPurposeID, scheduledAt } = req.body;
    const data = await esb('/qsv1/promotion', {
      method: 'POST',
      branch,
      body: { visitPurposeID, ...(scheduledAt ? { scheduledAt } : {}) },
    });
    res.json(data);
  } catch (err: any) {
    console.error(`[promotions] Error:`, err.message || err);
    res.status(err.status || 500).json(err);
  }
});

// POST /api/promotions/validate-payment
app.post('/api/promotions/validate-payment', async (req, res) => {
  try {
    const { branch, ...body } = req.body;
    const data = await esb('/qsv1/promotion/validate-payment', {
      method: 'POST',
      branch,
      body,
    });
    res.json(data);
  } catch (err: any) {
    console.error(`[promotions-validate] Error:`, err.message || err);
    res.status(err.status || 500).json(err);
  }
});

// ═══════════════════════════════════════
// 6. WEBHOOKS (ESB → your server)
// ═══════════════════════════════════════

// ESB sends order updates here every 60s for 30 min
app.post('/webhooks/esb/order', async (req, res) => {
  const { orderID, status } = req.body;
  // TODO: Send push notification to customer via Expo
  // TODO: Update order status in your DB
  console.log(`Order ${orderID}: ${status}`);

  // Return pushOrderStatus: "true" to stop retries
  res.json({ pushOrderStatus: "true" });
});

// ESB sends when order is ready for pickup
app.post('/webhooks/esb/pickup', async (req, res) => {
  const { orderID } = req.body;
  // TODO: Send "Your order is ready!" push notification
  console.log(`Order ${orderID} ready for pickup!`);
  res.json({ received: true });
});

// ═══════════════════════════════════════
// 7. USER AUTH (WhatsApp OTP)
// ═══════════════════════════════════════

// POST /api/auth/whatsapp/send-otp
app.post('/api/auth/whatsapp/send-otp', async (req, res) => {
  try {
    const { branch } = req.body;
    console.log(`[auth] Generating WhatsApp OTP (branch: ${branch})`);
    // Use production URL for auth (staging doesn't support /customer/ endpoints)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ESB_TOKEN}`,
      'Data-Company': COMPANY_CODE,
    };
    if (branch) headers['Data-Branch'] = branch;

    const esbRes = await fetch(`${ESB_AUTH_BASE}/customer/whatsapp/generate-otp`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        requestText: "Hai! Saya ingin login ke Kamarasan dengan kode verifikasi:",
        responseText: "Verifikasi berhasil! Klik link di bawah ini untuk melanjutkan pesanan kamu 🤩\n\n{{redirectUrl}}",
        redirectUrl: "kamarasan://auth/callback",
      }),
    });
    const data = await esbRes.json();
    if (!esbRes.ok) throw { status: esbRes.status, ...data };
    res.json(data);
  } catch (err: any) {
    console.error(`[auth-otp] Error:`, err.message || err);
    res.status(err.status || 500).json(err);
  }
});

// POST /api/auth/whatsapp/verify
app.post('/api/auth/whatsapp/verify', async (req, res) => {
  try {
    const { otp } = req.body;
    console.log(`[auth] Verifying OTP: ***`);
    // Use production URL for auth endpoints
    const esbRes = await fetch(`${ESB_AUTH_BASE}/customer/whatsapp/get-status-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ESB_TOKEN}`,
        'Data-Company': COMPANY_CODE,
      },
      body: JSON.stringify({ otp, appID: 'esoqs' }),
    });
    const data = await esbRes.json();
    if (!esbRes.ok) throw { status: esbRes.status, ...data };
    // VERIFIED → { status: "VERIFIED", verifiedPhoneNumber, authkey }
    // PENDING  → { status: "PENDING" }
    // EXPIRED  → { status: "EXPIRED" }
    res.json(data);
  } catch (err: any) {
    console.error(`[auth-verify] Error:`, err.message || err);
    res.status(err.status || 500).json(err);
  }
});

// ═══════════════════════════════════════
// 8. DELIVERY
// ═══════════════════════════════════════

// GET /api/delivery/distance?branch=MIND1&lat=-6.28&lng=106.71
app.get('/api/delivery/distance', async (req, res) => {
  try {
    const { branch, lat, lng } = req.query;
    const data = await esb(
      `/qsv1/map/distance/${lat}/${lng}`,
      { branch: branch as string }
    );
    res.json(data);
  } catch (err: any) {
    console.error(`[delivery-distance] Error:`, err.message || err);
    res.status(err.status || 500).json(err);
  }
});

// POST /api/delivery/courier-cost
app.post('/api/delivery/courier-cost', async (req, res) => {
  try {
    const { branch, ...body } = req.body;
    const data = await esb('/qsv1/map/delivery-courier', {
      method: 'POST',
      branch,
      body,
    });
    res.json(data);
  } catch (err: any) {
    console.error(`[courier-cost] Error:`, err.message || err);
    res.status(err.status || 500).json(err);
  }
});

// ═══════════════════════════════════════
// 9. RESERVATIONS
// ═══════════════════════════════════════

// GET /api/reservations/times?branch=MIND1&date=2026-03-10
app.get('/api/reservations/times', async (req, res) => {
  try {
    const { branch, date } = req.query;
    const data = await esb(
      `/qsv1/reservation/time?reservationDate=${date}`,
      { branch: branch as string }
    );
    res.json(data);
  } catch (err: any) {
    console.error(`[reservations-times] Error:`, err.message || err);
    res.status(err.status || 500).json(err);
  }
});

// POST /api/reservations
app.post('/api/reservations', async (req, res) => {
  try {
    const { branch, ...body } = req.body;
    const data = await esb('/qsv1/reservation/transaction', {
      method: 'POST',
      branch,
      body,
    });
    res.json(data);
  } catch (err: any) {
    console.error(`[reservations-create] Error:`, err.message || err);
    res.status(err.status || 500).json(err);
  }
});

// ═══════════════════════════════════════
// 10. USER SESSION
// ═══════════════════════════════════════

// POST /api/user/auth
app.post('/api/user/auth', async (req, res) => {
  try {
    // /v1/ endpoints use production URL
    const esbRes = await fetch(`${ESB_AUTH_BASE}/v1/user/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Data-Company': COMPANY_CODE,
      },
      body: JSON.stringify(req.body),
    });
    const data = await esbRes.json();
    if (!esbRes.ok) throw { status: esbRes.status, ...data };
    res.json(data);
  } catch (err: any) {
    console.error(`[user-auth] Error:`, err.message || err);
    res.status(err.status || 500).json(err);
  }
});

// POST /api/user/orders (paginated history)
app.post('/api/user/orders', async (req, res) => {
  try {
    const { userToken, page } = req.body;
    // /v1/ endpoints use production URL + userToken as Bearer auth
    const esbRes = await fetch(`${ESB_AUTH_BASE}/v1/user/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`,
        'Data-Company': COMPANY_CODE,
      },
      ...(page ? { body: JSON.stringify({ page: String(page) }) } : {}),
    });
    const data = await esbRes.json();
    if (!esbRes.ok) throw { status: esbRes.status, ...data };
    res.json(data);
  } catch (err: any) {
    console.error(`[user-orders] Error:`, err.message || err);
    res.status(err.status || 500).json(err);
  }
});

// GET /api/user/addresses
app.get('/api/user/addresses', async (req, res) => {
  try {
    const userToken = req.headers['x-user-token'] as string || req.query.userToken as string;
    // /v1/ endpoints use production URL + userToken as Bearer auth
    const esbRes = await fetch(`${ESB_AUTH_BASE}/v1/user/address`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Data-Company': COMPANY_CODE,
      },
    });
    const data = await esbRes.json();
    if (!esbRes.ok) throw { status: esbRes.status, ...data };
    res.json(data);
  } catch (err: any) {
    console.error(`[user-addresses] Error:`, err.message || err);
    res.status(err.status || 500).json(err);
  }
});

// ═══════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Kamarasan API on :${PORT} (${process.env.ESB_ENV})`));
