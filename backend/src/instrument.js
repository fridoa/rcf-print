/**
 * Sentry SDK — harus di-import PALING AWAL sebelum module lain.
 *
 * File ini menginisialisasi error monitoring + tracing (performance).
 * Import file ini di baris pertama server.js:
 *   import "./src/instrument.js";
 */
import * as Sentry from "@sentry/node";
import { env, isProduction, isStaging } from "./config/env.js";

Sentry.init({
  dsn: env.SENTRY_DSN,

  // Kirim data hanya di production & staging.
  // Di development/autotest, Sentry tetap tidak kirim jika DSN kosong.
  enabled: Boolean(env.SENTRY_DSN) && (isProduction || isStaging),

  environment: env.APP_ENV,

  // ── Tracing (Performance Monitoring) ──
  // Sample rate 20% di production (hemat kuota), 100% di staging (debug).
  tracesSampleRate: isProduction ? 0.2 : 1.0,

  // Jangan kirim data sensitif: body/cookie/header auth
  beforeSend(event) {
    if (event.request) {
      delete event.request.cookies;
      delete event.request.data; // body
      if (event.request.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
    }
    return event;
  },
});
