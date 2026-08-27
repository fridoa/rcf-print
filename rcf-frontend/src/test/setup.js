import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

/**
 * react-toastify di-mock global untuk SEMUA test.
 *
 * Alasan: hook mutation kini memanggil toast.success/error lewat notify.
 * Test tidak merender <ToastContainer>, jadi memanggil toast asli hanya
 * menambah noise/act-warning tanpa memberi nilai. Mock membuat pemanggilan
 * jadi no-op yang bisa di-assert bila suatu test memang ingin memverifikasi
 * notifikasi (import { toast } from "react-toastify" lalu cek mock).
 */
vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
  ToastContainer: () => null,
}));

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

/**
 * jsdom mengenal elemen <dialog> tapi TIDAK mengimplementasikan
 * showModal()/close() — tanpa shim ini, komponen Modal melempar
 * "showModal is not a function" dan seluruh test halaman pelanggan gagal
 * padahal kodenya benar.
 *
 * Shim ini juga menjaga properti `open` supaya assertion terhadap
 * kemunculan isi dialog tetap bermakna.
 */
if (typeof HTMLDialogElement !== "undefined") {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.open = true;
    };
  }

  if (!HTMLDialogElement.prototype.show) {
    HTMLDialogElement.prototype.show = function show() {
      this.open = true;
    };
  }

  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function close() {
      this.open = false;
      this.dispatchEvent(new Event("close"));
    };
  }
}
