import { apiClient } from "@/shared/api/client";

/**
 * Pembungkus endpoint modul auth di backend (backend/src/modules/auth).
 *
 * apiClient sudah mengembalikan response.data (lihat interceptor), jadi
 * yang diterima di sini adalah body { success, message, data }.
 * Fungsi-fungsi ini mengupas satu lapis lagi supaya komponen hanya
 * berurusan dengan datanya.
 */
export const authApi = {
  /** POST /auth/login -> { token, user } */
  async login({ identifier, password }) {
    const body = await apiClient.post("/auth/login", { identifier, password });
    return body.data;
  },

  /** GET /auth/me -> user */
  async me() {
    const body = await apiClient.get("/auth/me");
    return body.data;
  },

  /** PATCH /auth/edit-profile -> user (partial: kirim hanya field yang berubah) */
  async editProfile(payload) {
    const body = await apiClient.patch("/auth/edit-profile", payload);
    return body.data;
  },

  /** PATCH /auth/change-password -> tidak mengembalikan data */
  async changePassword(payload) {
    const body = await apiClient.patch("/auth/change-password", payload);
    return body.message;
  },

  /**
   * POST /auth/forgot-password -> selalu sukses generik (anti enumeration).
   * Kalau email terdaftar, server mengirim email berisi OTP + link reset.
   */
  async forgotPassword({ email }) {
    const body = await apiClient.post("/auth/forgot-password", { email });
    return body.message;
  },

  /**
   * POST /auth/verify-otp -> { resetToken }.
   * OTP valid = tukar token: server terbitkan token reset baru (token di
   * link email lama hangus), FE lanjut ke form password baru dengannya.
   */
  async verifyOtp({ email, otp }) {
    const body = await apiClient.post("/auth/verify-otp", { email, otp });
    return body.data;
  },

  /** POST /auth/reset-password { token, newPassword } -> password berubah */
  async resetPassword(payload) {
    const body = await apiClient.post("/auth/reset-password", payload);
    return body.message;
  },
};
