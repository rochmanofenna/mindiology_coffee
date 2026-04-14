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
    // Scrub sensitive fields from any event before send.
    // Covers request headers AND breadcrumb data — Sentry's HTTP auto-instrumentation
    // captures outbound fetch headers as breadcrumbs, which would include the ESB
    // Bearer token unless stripped here.
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers['authorization'];
        delete event.request.headers['Authorization'];
        delete event.request.headers['x-user-token'];
        delete event.request.headers['data-company'];
      }
      if (event.breadcrumbs) {
        for (const b of event.breadcrumbs) {
          if (!b.data) continue;
          for (const key of Object.keys(b.data)) {
            if (/authorization|x-user-token|data-company/i.test(key)) {
              delete b.data[key];
            }
          }
        }
      }
      return event;
    },
  });
}
