import { toast } from "react-toastify";

/**
 * Pembungkus notifikasi terpusat di atas react-toastify.
 *
 * Kenapa dibungkus, bukan memanggil `toast` langsung di komponen:
 *   - satu tempat mengatur gaya/opsi default (autoClose, dsb) — kalau nanti
 *     ganti pustaka toast, cukup ubah file ini.
 *   - pesan error dari API kita sudah dinormalisasi jadi { message, errors[] }
 *     (lihat shared/api/client.js). notify.apiError() tahu cara menampilkannya
 *     tanpa tiap pemanggil mengulang logika yang sama.
 *
 * Dipakai di layer hook mutation (bukan di tiap tombol) supaya SEMUA aksi
 * create/update/delete otomatis memberi umpan balik yang konsisten.
 */
export const notify = {
  success(message) {
    return toast.success(message);
  },

  error(message) {
    return toast.error(message);
  },

  info(message) {
    return toast.info(message);
  },

  /**
   * Tampilkan error dari apiClient. `err` sudah berbentuk
   * { status, message, errors[] } hasil normalizeError. Kalau ada rincian
   * validasi (errors[]), gabungkan agar user tahu field mana yang salah.
   * fallback dipakai bila err tak terduga (mis. error non-API).
   */
  apiError(err, fallback = "Terjadi kesalahan. Coba lagi.") {
    const pesan = err?.message ?? fallback;
    const rincian = Array.isArray(err?.errors) ? err.errors : [];
    const teks = rincian.length > 0 ? `${pesan}: ${rincian.join(", ")}` : pesan;
    return toast.error(teks);
  },
};
