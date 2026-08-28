import { useMutation, useQueryClient } from "@tanstack/react-query";
import { designApi } from "../api/design.api";
import { designKeys } from "./useDesigns";
import { notify } from "@/shared/lib/toast";
/**
 * Mutation modul design.
 *
 * Keduanya meng-invalidate galeri pelanggan yang bersangkutan supaya thumbnail
 * baru langsung muncul / yang dihapus langsung hilang. customerId dilewatkan
 * eksplisit karena kunci cache galeri per-pelanggan.
 *
 * Umpan balik lewat notify: upload/hapus adalah aksi eksplisit user, toast
 * membuat hasilnya jelas (termasuk saat dedup: file yang identik tidak
 * diunggah ulang).
 */

/**
 * Upload desain ke galeri seorang pelanggan.
 *
 * mutationFn menerima { file, customer_id, label }. Setelah sukses (baik upload
 * baru maupun dedup), galeri pelanggan itu di-refresh.
 */
export function useUploadDesign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars) => designApi.upload(vars),
    onSuccess: (_data, variables) => {
      // Invalidate SEMUA halaman galeri pelanggan itu (prefix match), bukan
      // hanya satu halaman — kunci cache kini menyertakan page/limit.
      queryClient.invalidateQueries({
        queryKey: ["designs", "list", variables.customer_id],
      });
      notify.success("Desain berhasil diunggah.");
    },
    onError: (err) => notify.apiError(err),
  });
}

/**
 * Hapus desain. Karena penghapusan bisa memengaruhi galeri pelanggan mana pun
 * (komponen pemanggil tidak selalu tahu customer_id-nya), invalidate seluruh
 * cabang designs.all — lebih aman daripada menebak kunci pelanggan.
 */
export function useDeleteDesign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars) => designApi.remove(vars),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: designKeys.all });
      notify.success("Desain dihapus.");
    },
    onError: (err) => notify.apiError(err),
  });
}
