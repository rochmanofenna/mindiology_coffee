// ─── server/index.ts ─── Kamarasan × ESB Middleware ───
// Real endpoints from ESB OpenAPI spec v3.0.3
// Deploy: Railway ($5/mo) or Vercel Edge Functions (free)

// IMPORTANT: instrument.ts must be the FIRST import so Sentry can hook
// into Express, http, and fetch before they're loaded.
import './instrument';
import * as Sentry from '@sentry/node';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const app = express();

// ─── Security: CORS whitelist ───
const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production'
  ? ['https://kamarasan.app', 'https://www.kamarasan.app']
  : undefined; // allow all in dev
app.use(cors(ALLOWED_ORIGINS ? { origin: ALLOWED_ORIGINS } : undefined));
app.use(helmet());
app.use(express.json({ limit: '1mb' }));

// ─── Security: Rate limiting ───
const globalLimiter = rateLimit({ windowMs: 60_000, max: 100, standardHeaders: true, legacyHeaders: false });
const otpLimiter = rateLimit({ windowMs: 60_000, max: 5, message: { error: true, message: 'Terlalu banyak permintaan OTP. Coba lagi nanti.' } });
const orderLimiter = rateLimit({ windowMs: 60_000, max: 10, message: { error: true, message: 'Terlalu banyak permintaan. Coba lagi nanti.' } });
app.use('/api/', globalLimiter);
app.use('/api/auth/whatsapp/', otpLimiter);
app.use('/api/order', orderLimiter);
app.use('/api/membership/', orderLimiter);

// ─── Security: Input validation helpers ───
const PATTERNS = {
  branch: /^[A-Za-z0-9]{1,10}$/,
  orderId: /^[A-Za-z0-9\-]{1,40}$/,
  menuId: /^[A-Za-z0-9\-]{1,30}$/,
  visitPurpose: /^\d{1,5}$/,
  latLng: /^-?\d{1,3}(\.\d{1,10})?$/,
  date: /^\d{4}-\d{2}-\d{2}$/,
  memberCode: /^[A-Za-z0-9]{0,30}$/,
  otp: /^[A-Za-z0-9]{1,20}$/,
};

function validate(value: any, pattern: RegExp, name: string): string {
  const str = String(value || '');
  if (!pattern.test(str)) throw { status: 400, message: `Invalid ${name}` };
  return str;
}

/** Sanitize error for client — never leak raw ESB responses */
function safeError(err: any): { status: number; body: { error: true; message: string } } {
  // Detect fetch timeout (AbortSignal.timeout fires TimeoutError; manual abort fires AbortError)
  if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
    Sentry.captureException(err);
    return { status: 504, body: { error: true, message: 'ESB tidak merespons. Silakan coba lagi.' } };
  }
  const status = typeof err?.status === 'number' && err.status >= 400 ? err.status : 500;
  const message = typeof err?.message === 'string' && err.message.length < 200
    ? err.message
    : 'Terjadi kesalahan. Silakan coba lagi.';
  // Report server-side errors (5xx) to Sentry. Client errors (4xx) are
  // expected (validation, auth, branch not found, etc.) and would only spam.
  if (status >= 500) {
    Sentry.captureException(err);
  }
  return { status, body: { error: true, message } };
}

// ─── ESB Config (from OpenAPI spec) ───
const ESB_TIMEOUT = 30_000; // 30s — prevents indefinite hangs if ESB is slow/down

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
    signal: AbortSignal.timeout(ESB_TIMEOUT),
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
    const lat = validate(req.query.lat || '-6.28', PATTERNS.latLng, 'lat');
    const lng = validate(req.query.lng || '106.71', PATTERNS.latLng, 'lng');
    const data = await esb(`/qsv1/branch/${lat}/${lng}`);
    res.json(data);
  } catch (err: any) {
    console.error(`[branches] Error:`, err.message || err);
    const { status, body } = safeError(err);
    res.status(status).json(body);
  }
});

// GET /api/branch/settings?branch=MIND1
app.get('/api/branch/settings', async (req, res) => {
  try {
    const branch = validate(req.query.branch, PATTERNS.branch, 'branch');
    const data = await esb('/qsv1/setting/branch', { branch });
    res.json(data);
  } catch (err: any) {
    console.error(`[branch-settings] Error:`, err.message || err);
    const { status, body } = safeError(err);
    res.status(status).json(body);
  }
});

// ═══════════════════════════════════════
// 2. MENU
// ═══════════════════════════════════════

// GET /api/menu?branch=MIND1&visitPurpose=65
app.get('/api/menu', async (req, res) => {
  try {
    const branch = validate(req.query.branch, PATTERNS.branch, 'branch');
    const visitPurpose = validate(req.query.visitPurpose, PATTERNS.visitPurpose, 'visitPurpose');
    const memberCode = req.query.memberCode ? validate(req.query.memberCode, PATTERNS.memberCode, 'memberCode') : '';
    const path = memberCode
      ? `/qsv1/menu/${visitPurpose}?memberCode=${memberCode}`
      : `/qsv1/menu/${visitPurpose}`;
    const data = await esb(path, { branch });
    res.json(data);
  } catch (err: any) {
    console.error(`[menu] Error:`, err.message || err);
    const { status, body } = safeError(err);
    res.status(status).json(body);
  }
});

// GET /api/menu/detail?branch=MIND1&visitPurpose=65&menuId=MNU001
app.get('/api/menu/detail', async (req, res) => {
  try {
    const branch = validate(req.query.branch, PATTERNS.branch, 'branch');
    const visitPurpose = validate(req.query.visitPurpose, PATTERNS.visitPurpose, 'visitPurpose');
    const menuId = validate(req.query.menuId, PATTERNS.menuId, 'menuId');
    const data = await esb(`/qsv1/menu/detail/${visitPurpose}/${menuId}`, { branch });
    res.json(data);
  } catch (err: any) {
    console.error(`[menu-detail] Error:`, err.message || err);
    const { status, body } = safeError(err);
    res.status(status).json(body);
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
    validate(branch, PATTERNS.branch, 'branch');
    const data = await esb('/qsv1/order/check-items', { method: 'POST', branch, body });
    res.json(data);
  } catch (err: any) {
    console.error(`[check-items] Error:`, err.message || err);
    const { status, body } = safeError(err);
    res.status(status).json(body);
  }
});

// POST /api/order/calculate
app.post('/api/order/calculate', async (req, res) => {
  try {
    const { branch, ...orderData } = req.body;
    validate(branch, PATTERNS.branch, 'branch');
    const data = await esb('/qsv1/order/calculate-total', { method: 'POST', branch, body: orderData });
    res.json(data);
  } catch (err: any) {
    console.error(`[calculate] Error:`, err.message || err);
    const { status, body } = safeError(err);
    res.status(status).json(body);
  }
});

// POST /api/order
app.post('/api/order', async (req, res) => {
  try {
    const { branch, ...orderData } = req.body;
    validate(branch, PATTERNS.branch, 'branch');
    console.log(`[order] Submitting to ESB for branch ${branch}`);
    const data = await esb('/qsv1/order', { method: 'POST', branch, body: orderData });
    console.log(`[order] ESB response: orderID=${data?.orderID || data?.data?.orderID || 'unknown'}`);
    res.json(data);
  } catch (err: any) {
    console.error(`[order] ESB error:`, err.message || err);
    const { status, body } = safeError(err);
    res.status(status).json(body);
  }
});

// GET /api/order/:orderId?branch=MIND1
app.get('/api/order/:orderId', async (req, res) => {
  try {
    const orderId = validate(req.params.orderId, PATTERNS.orderId, 'orderId');
    const branch = validate(req.query.branch, PATTERNS.branch, 'branch');
    const data = await esb(`/qsv1/order/${orderId}`, { branch });
    res.json(data);
  } catch (err: any) {
    console.error(`[order-track] Error:`, err.message || err);
    const { status, body } = safeError(err);
    res.status(status).json(body);
  }
});

// GET /api/payment/validate/:orderId?branch=MIND1
app.get('/api/payment/validate/:orderId', async (req, res) => {
  try {
    const orderId = validate(req.params.orderId, PATTERNS.orderId, 'orderId');
    const branch = validate(req.query.branch, PATTERNS.branch, 'branch');
    const data = await esb(`/qsv1/payment/validate/${orderId}`, { branch });
    res.json(data);
  } catch (err: any) {
    console.error(`[payment-validate] Error:`, err.message || err);
    const { status, body } = safeError(err);
    res.status(status).json(body);
  }
});

// ═══════════════════════════════════════
// 4. LOYALTY / VOUCHERS
// ═══════════════════════════════════════

// GET /api/vouchers?branch=MIND1&memberCode=xxx
app.get('/api/vouchers', async (req, res) => {
  try {
    const branch = validate(req.query.branch, PATTERNS.branch, 'branch');
    const memberCode = validate(req.query.memberCode, PATTERNS.memberCode, 'memberCode');
    const data = await esb(`/qsv1/membership/voucher-list?memberCode=${memberCode}`, { branch });
    res.json(data);
  } catch (err: any) {
    console.error(`[vouchers] Error:`, err.message || err);
    const { status, body } = safeError(err);
    res.status(status).json(body);
  }
});

// POST /api/membership/lookup
// ESB exposes member data via POST /qsv1/membership with { key: phoneNumber }.
// Returns { memberID, email, phoneNumber, fullName }. Used after check-member-status
// confirms REGISTERED to populate the user's actual name.
app.post('/api/membership/lookup', async (req, res) => {
  try {
    const { branch, key } = req.body;
    if (!key) throw { status: 400, message: 'Missing key' };
    const data = await esb('/qsv1/membership', {
      method: 'POST',
      branch: branch || DEFAULT_BRANCH,
      body: { key },
    });
    res.json(data);
  } catch (err: any) {
    console.error(`[membership-lookup] Error:`, err.message || err);
    const { status, body } = safeError(err);
    res.status(status).json(body);
  }
});

// POST /api/membership/check
app.post('/api/membership/check', async (req, res) => {
  try {
    const { branch, phoneNumber, countryCode } = req.body;
    validate(branch || DEFAULT_BRANCH, PATTERNS.branch, 'branch');
    const esbRes = await fetch(`${ESB_AUTH_BASE}/qsv1/membership/check-member-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ESB_TOKEN}`,
        'Data-Branch': branch || DEFAULT_BRANCH,
      },
      signal: AbortSignal.timeout(ESB_TIMEOUT),
      body: JSON.stringify({ phoneNumber, countryCode: countryCode || '+62' }),
    });
    const data = await esbRes.json();
    if (!esbRes.ok) throw { status: esbRes.status, ...data };
    res.json(data);
  } catch (err: any) {
    console.error(`[membership] Error:`, err.message || err);
    const { status, body } = safeError(err);
    res.status(status).json(body);
  }
});

// ═══════════════════════════════════════
// 5. PROMOTIONS
// ═══════════════════════════════════════

// POST /api/promotions — list available promotions for a visit purpose
app.post('/api/promotions', async (req, res) => {
  try {
    const { branch, visitPurposeID, scheduledAt } = req.body;
    validate(branch, PATTERNS.branch, 'branch');
    const data = await esb('/qsv1/promotion', {
      method: 'POST',
      branch,
      body: { visitPurposeID, ...(scheduledAt ? { scheduledAt } : {}) },
    });
    res.json(data);
  } catch (err: any) {
    console.error(`[promotions] Error:`, err.message || err);
    const { status, body } = safeError(err);
    res.status(status).json(body);
  }
});

// POST /api/promotions/validate-payment
app.post('/api/promotions/validate-payment', async (req, res) => {
  try {
    const { branch, ...body } = req.body;
    validate(branch, PATTERNS.branch, 'branch');
    const data = await esb('/qsv1/promotion/validate-payment', { method: 'POST', branch, body });
    res.json(data);
  } catch (err: any) {
    console.error(`[promotions-validate] Error:`, err.message || err);
    const { status, body } = safeError(err);
    res.status(status).json(body);
  }
});

// ═══════════════════════════════════════
// 6. WEBHOOKS (ESB → your server)
// ═══════════════════════════════════════

// ─── Webhook auth: verify shared secret ───
// ESB (per Nando, 2026-04) no longer documents webhooks — these handlers are
// effectively dead code. Keeping the routes + secret verification in place so
// we can re-enable later if ESB adds webhooks back. For now, warn if the
// secret is unset in prod rather than refusing to start.
const WEBHOOK_SECRET = process.env.ESB_WEBHOOK_SECRET?.trim();
if (process.env.ESB_ENV === 'production' && !WEBHOOK_SECRET) {
  console.warn('[webhook] ESB_WEBHOOK_SECRET not set — webhook endpoints are unauthenticated (currently unused by ESB)');
}
function verifyWebhook(req: express.Request): boolean {
  if (!WEBHOOK_SECRET) return true;
  const provided = req.headers['x-webhook-secret'] || req.headers['x-esb-signature'];
  return provided === WEBHOOK_SECRET;
}

// ESB sends order updates here every 60s for 30 min
app.post('/webhooks/esb/order', async (req, res) => {
  if (!verifyWebhook(req)) { res.status(401).json({ error: true, message: 'Unauthorized' }); return; }
  const { orderID, status, phoneNumber } = req.body;
  console.log(`Order ${orderID}: ${status}`);

  // Send push notification if we have the customer's token
  if (phoneNumber && status) {
    const statusLabels: Record<string, string> = {
      processing: 'Pesanan sedang diproses',
      ready: 'Pesanan siap diambil!',
      completed: 'Pesanan selesai',
      cancelled: 'Pesanan dibatalkan',
    };
    const label = statusLabels[status];
    if (label) sendPushToPhone(phoneNumber, 'Kamarasan', `${label} (${orderID})`);
  }

  res.json({ pushOrderStatus: "true" });
});

// ESB sends when order is ready for pickup
app.post('/webhooks/esb/pickup', async (req, res) => {
  if (!verifyWebhook(req)) { res.status(401).json({ error: true, message: 'Unauthorized' }); return; }
  const { orderID, phoneNumber } = req.body;
  console.log(`Order ${orderID} ready for pickup!`);
  if (phoneNumber) sendPushToPhone(phoneNumber, 'Kamarasan', `Pesanan ${orderID} siap diambil!`);
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
      signal: AbortSignal.timeout(ESB_TIMEOUT),
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
    const { status, body } = safeError(err);
    res.status(status).json(body);
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
      signal: AbortSignal.timeout(ESB_TIMEOUT),
      body: JSON.stringify({ otp, appID: 'esoqs' }),
    });
    const data = await esbRes.json();
    if (!esbRes.ok) throw { status: esbRes.status, ...data };
    res.json(data);
  } catch (err: any) {
    console.error(`[auth-verify] Error:`, err.message || err);
    const { status, body } = safeError(err);
    res.status(status).json(body);
  }
});

// ═══════════════════════════════════════
// 8. DELIVERY
// ═══════════════════════════════════════

// GET /api/delivery/distance?branch=MIND1&lat=-6.28&lng=106.71
app.get('/api/delivery/distance', async (req, res) => {
  try {
    const branch = validate(req.query.branch, PATTERNS.branch, 'branch');
    const lat = validate(req.query.lat, PATTERNS.latLng, 'lat');
    const lng = validate(req.query.lng, PATTERNS.latLng, 'lng');
    const data = await esb(`/qsv1/map/distance/${lat}/${lng}`, { branch });
    res.json(data);
  } catch (err: any) {
    console.error(`[delivery-distance] Error:`, err.message || err);
    const { status, body } = safeError(err);
    res.status(status).json(body);
  }
});

// POST /api/delivery/courier-cost
app.post('/api/delivery/courier-cost', async (req, res) => {
  try {
    const { branch, ...body } = req.body;
    validate(branch, PATTERNS.branch, 'branch');
    const data = await esb('/qsv1/map/delivery-courier', { method: 'POST', branch, body });
    res.json(data);
  } catch (err: any) {
    console.error(`[courier-cost] Error:`, err.message || err);
    const { status, body } = safeError(err);
    res.status(status).json(body);
  }
});

// ═══════════════════════════════════════
// 9. RESERVATIONS
// ═══════════════════════════════════════

// GET /api/reservations/times?branch=MIND1&date=2026-03-10
app.get('/api/reservations/times', async (req, res) => {
  try {
    const branch = validate(req.query.branch, PATTERNS.branch, 'branch');
    const date = validate(req.query.date, PATTERNS.date, 'date');
    const data = await esb(`/qsv1/reservation/time?reservationDate=${date}`, { branch });
    res.json(data);
  } catch (err: any) {
    console.error(`[reservations-times] Error:`, err.message || err);
    const { status, body } = safeError(err);
    res.status(status).json(body);
  }
});

// POST /api/reservations
app.post('/api/reservations', async (req, res) => {
  try {
    const { branch, ...body } = req.body;
    validate(branch, PATTERNS.branch, 'branch');
    const data = await esb('/qsv1/reservation/transaction', { method: 'POST', branch, body });
    res.json(data);
  } catch (err: any) {
    console.error(`[reservations-create] Error:`, err.message || err);
    const { status, body } = safeError(err);
    res.status(status).json(body);
  }
});

// ═══════════════════════════════════════
// 10. USER SESSION
// ═══════════════════════════════════════

// POST /api/user/auth
app.post('/api/user/auth', async (req, res) => {
  try {
    const esbRes = await fetch(`${ESB_AUTH_BASE}/v1/user/auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Data-Company': COMPANY_CODE,
      },
      signal: AbortSignal.timeout(ESB_TIMEOUT),
      body: JSON.stringify(req.body),
    });
    const data = await esbRes.json();
    if (!esbRes.ok) throw { status: esbRes.status, ...data };
    res.json(data);
  } catch (err: any) {
    console.error(`[user-auth] Error:`, err.message || err);
    const { status, body } = safeError(err);
    res.status(status).json(body);
  }
});

// POST /api/user/orders (paginated history)
app.post('/api/user/orders', async (req, res) => {
  try {
    const { userToken, page } = req.body;
    if (!userToken) throw { status: 401, message: 'Missing userToken' };
    const esbRes = await fetch(`${ESB_AUTH_BASE}/v1/user/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`,
        'Data-Company': COMPANY_CODE,
      },
      signal: AbortSignal.timeout(ESB_TIMEOUT),
      ...(page ? { body: JSON.stringify({ page: String(page) }) } : {}),
    });
    const data = await esbRes.json();
    if (!esbRes.ok) throw { status: esbRes.status, ...data };
    res.json(data);
  } catch (err: any) {
    console.error(`[user-orders] Error:`, err.message || err);
    const { status, body } = safeError(err);
    res.status(status).json(body);
  }
});

// GET /api/user/addresses
app.get('/api/user/addresses', async (req, res) => {
  try {
    const userToken = req.headers['x-user-token'] as string;
    if (!userToken) throw { status: 401, message: 'Missing x-user-token header' };
    const esbRes = await fetch(`${ESB_AUTH_BASE}/v1/user/address`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Data-Company': COMPANY_CODE,
      },
      signal: AbortSignal.timeout(ESB_TIMEOUT),
    });
    const data = await esbRes.json();
    if (!esbRes.ok) throw { status: esbRes.status, ...data };
    res.json(data);
  } catch (err: any) {
    console.error(`[user-addresses] Error:`, err.message || err);
    const { status, body } = safeError(err);
    res.status(status).json(body);
  }
});

// ═══════════════════════════════════════
// 11. PUSH NOTIFICATIONS
// ═══════════════════════════════════════

// In-memory token store (replace with DB in production)
const pushTokens = new Map<string, string>(); // phone → expoPushToken

// POST /api/push/register — register device push token
app.post('/api/push/register', (req, res) => {
  const { phone, token } = req.body;
  if (!phone || !token) { res.status(400).json({ error: true, message: 'Missing phone or token' }); return; }
  pushTokens.set(phone, token);
  console.log(`[push] Registered token for ${phone}`);
  res.json({ success: true });
});

/** Send Expo push notification to a specific phone */
async function sendPushToPhone(phone: string, title: string, body: string) {
  const token = pushTokens.get(phone);
  if (!token) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: token, title, body, sound: 'default', channelId: 'orders' }),
    });
  } catch (err) {
    console.error(`[push] Failed to send to ${phone}:`, err);
  }
}

// ═══════════════════════════════════════
// HEALTH CHECK
// ═══════════════════════════════════════

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Verification endpoint — only available in non-production for testing Sentry wiring.
// Hit GET /api/debug-sentry to confirm error reporting reaches the dashboard.
if (process.env.ESB_ENV !== 'production') {
  app.get('/api/debug-sentry', (_req, _res) => {
    throw new Error('Sentry verification: this is an intentional test error');
  });
}

// Sentry error handler — MUST be after all routes, before any other error middleware.
Sentry.setupExpressErrorHandler(app);

// Fallthrough error handler — sanitizes errors for the client.
// 4-arg signature is required so Express recognizes this as an error handler.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = typeof err?.status === 'number' && err.status >= 400 ? err.status : 500;
  res.status(status).json({ error: true, message: 'Terjadi kesalahan. Silakan coba lagi.' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Kamarasan API on :${PORT} (${process.env.ESB_ENV})`));
