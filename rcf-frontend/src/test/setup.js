import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

/**
 * Setup global untuk semua test (dipakai lewat vite.config.js -> test.setupFiles).
 *
 * cleanup() dipanggil manual karena Vitest globals dinyalakan tapi
 * auto-cleanup RTL hanya jalan kalau environment mendeteksi afterEach —
 * dipasang eksplisit supaya tidak bergantung pada urutan import.
 */
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.clearAllMocks();
});

// jsdom belum punya matchMedia; beberapa komponen UI/Tailwind bisa memanggilnya.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
