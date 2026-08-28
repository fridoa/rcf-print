/**
 * Penyimpanan token JWT.
 *
 * Sengaja dibungkus dalam satu modul supaya kalau nanti pindah dari
 * localStorage ke cookie httpOnly, yang berubah hanya file ini —
 * bukan setiap tempat yang menyentuh token.
 *
 * Catatan keamanan: localStorage bisa dibaca oleh script mana pun di
 * origin ini, jadi rentan XSS. Untuk produksi, cookie httpOnly yang
 * di-set backend lebih aman. Ini keputusan yang perlu ditinjau ulang
 * sebelum go-live.
 */
const TOKEN_KEY = "rcf.token";

export const tokenStorage = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      // localStorage bisa gagal di mode privat / storage penuh
      return null;
    }
  },

  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* diamkan: gagal simpan bukan alasan aplikasi crash */
    }
  },

  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* diamkan */
    }
  },
};
