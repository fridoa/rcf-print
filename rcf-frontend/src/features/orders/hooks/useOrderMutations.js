import { useMutation, useQueryClient } from "@tanstack/react-query";
import { orderApi } from "../api/order.api";
import { orderKeys } from "./useOrders";
import { notify } from "@/shared/lib/toast";

/**
 * Mutation modul order.
 *
 * Semuanya meng-invalidate orderKeys.all, bukan satu kunci list tertentu:
 * satu perubahan status memindahkan order antar-layar (mis. dari antrian
 * desain ke antrian cetak), jadi semua daftar berpotensi berubah.
 * Menargetkan satu kunci akan menyisakan order basi di layar lain.
 *
 * Tidak ada optimistic update: server adalah sumber kebenaran (nomor,
 * timestamp selesai, dsb) dan status berpindah layar, menebaknya di klien
 * bikin baris berkedip di tempat yang salah.
 *
 * Tiap mutation menampilkan toast sukses/gagal lewat notify. Pesan sukses
 * dibedakan per aksi supaya user tahu persis apa yang terjadi.
 */
function useInvalidatingMutation(mutationFn, pesanSukses) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      if (pesanSukses) notify.success(pesanSukses);
    },
    onError: (err) => notify.apiError(err),
  });
}

/** Buat order baru (ADMIN). */
export function useCreateOrder() {
  return useInvalidatingMutation(orderApi.create, "Order baru berhasil dibuat.");
}

/**
 * Majukan status satu langkah.
 * Dipakai semua layar kerja. Semua transisi kini cukup { id } (+ catatan
 * opsional); file_count/total_qty sudah ditetapkan saat order dibuat.
 */
export function useMajukanStatus() {
  return useInvalidatingMutation(
    orderApi.majukanStatus,
    "Status order diperbarui."
  );
}

/** Selesaikan order + catat pembayaran (ADMIN). */
export function useSelesaikanOrder() {
  return useInvalidatingMutation(
    orderApi.selesaikan,
    "Order diselesaikan & pembayaran tercatat."
  );
}

/** Koreksi status manual (ADMIN). */
export function useKoreksiStatus() {
  return useInvalidatingMutation(orderApi.koreksi, "Status berhasil dikoreksi.");
}
