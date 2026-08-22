import axios from "axios";
import { tokenStorage } from "@/shared/lib/token";

/**
 * Instance axios tunggal untuk seluruh aplikasi.
 *
 * baseURL memakai VITE_API_URL kalau ada, kalau tidak jatuh ke "/api/v1"
 * yang di dev diteruskan lewat proxy Vite ke localhost:3000.
 */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api/v1",
  headers: { "Content-Type": "application/json" },
  timeout: 20000,
});

/** Sisipkan token ke setiap request kalau user sudah login. */
apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Callback yang dipanggil saat server menjawab 401.
 * AuthProvider yang mengisinya, supaya modul api tidak perlu tahu
 * soal React maupun router.
 */
let onUnauthorized = null;

export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;

    // Token kedaluwarsa / tidak valid → paksa logout sekali di satu tempat
    if (status === 401) {
      tokenStorage.clear();
      onUnauthorized?.();
    }

    return Promise.reject(normalizeError(error));
  }
);

/**
 * Samakan bentuk error dari backend, axios, dan jaringan menjadi satu
 * bentuk yang bisa dipakai komponen tanpa mengecek 3 kemungkinan.
 *
 * Backend membalas: { success: false, message, errors?: string[] }
 */
export function normalizeError(error) {
  const status = error.response?.status ?? 0;
  const body = error.response?.data;

  if (body?.message) {
    return {
      status,
      message: body.message,
      errors: Array.isArray(body.errors) ? body.errors : [],
    };
  }

  if (error.code === "ECONNABORTED") {
    return { status, message: "Permintaan timeout. Coba lagi.", errors: [] };
  }

  if (!error.response) {
    return {
      status,
      message: "Tidak dapat menghubungi server. Periksa koneksi.",
      errors: [],
    };
  }

  return {
    status,
    message: error.message || "Terjadi kesalahan tak terduga",
    errors: [],
  };
}
