import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import "./index.css";
import App from "./App.jsx";

// ── Sentry: Error Monitoring + Tracing ──
// Hanya aktif jika VITE_SENTRY_DSN diset (production/staging di Vercel).
// Di development lokal tanpa env var ini, Sentry tidak aktif.
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || "",
  enabled: Boolean(import.meta.env.VITE_SENTRY_DSN),
  environment: import.meta.env.MODE, // "development" | "production"

  integrations: [Sentry.browserTracingIntegration()],

  // Tracing — 20% di production agar hemat kuota
  tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,

  // Hubungkan trace frontend → backend (distributed tracing).
  // Sentry header dikirim hanya ke domain API kita, bukan ke third-party.
  tracePropagationTargets: [
    "localhost",
    /^https:\/\/.*rcfprint\.com/,
    /^https:\/\/.*vercel\.app/,
  ],
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
