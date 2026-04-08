// server/instrument.ts — Sentry initialization
// MUST be imported FIRST in index.ts, before any other module, so Sentry's
// auto-instrumentation can hook into Express, http, fetch, etc.
import 'dotenv/config';
import * as Sentry from '@sentry/node';

const SENTRY_DSN = process.env.SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.ESB_ENV || 'production',
    // Don't auto-collect IPs, headers, or request bodies — middleware proxies
    // bearer tokens, customer phone numbers, and member codes.
    sendDefaultPii: false,
    tracesSampleRate: 0.1,
    // Scrub sensitive fields from any event before send
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['Authorization'];
        delete event.request.headers['x-user-token'];
        delete event.request.headers['data-company'];
      }
      return event;
    },
  });
}
