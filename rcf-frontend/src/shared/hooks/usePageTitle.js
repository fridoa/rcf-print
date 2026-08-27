import { useEffect } from "react";

/** Nama aplikasi — dipakai sebagai prefix semua judul tab. */
export const APP_NAME = "RCF Print";

/**
 * Set document.title secara dinamis.
 *
 * Pola judul: "RCF Print - <halaman>". Kalau `page` kosong (mis. halaman
 * tanpa nama khusus), judul jadi "RCF Print" saja.
 *
 * Judul dikembalikan ke APP_NAME saat komponen unmount supaya tidak ada
 * judul "nyangkut" dari halaman sebelumnya bila halaman berikutnya lupa
 * memasang judul.
 */
export function usePageTitle(page) {
  useEffect(() => {
    document.title = page ? `${APP_NAME} - ${page}` : APP_NAME;
    return () => {
      document.title = APP_NAME;
    };
  }, [page]);
}
