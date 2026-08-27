import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userApi } from "../api/user.api";
import { userKeys } from "./useUsers";
import { notify } from "@/shared/lib/toast";

/**
 * Mutation modul user.
 *
 * Semuanya meng-invalidate userKeys.all, bukan satu kunci list tertentu:
 * setelah tambah/ubah/hapus, hasil pencarian dan filter mana pun bisa
 * berubah, jadi menargetkan satu kunci akan menyisakan tabel basi di
 * kondisi filter lain. Pola ini sama dengan modul customer.
 *
 * Tidak ada optimistic update: respons server adalah sumber kebenaran
 * (mis. username/email dinormalisasi lowercase di backend).
 *
 * Tiap mutation memberi toast sukses/gagal lewat notify.
 */
export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      notify.success("Pengguna baru ditambahkan.");
    },
    onError: (err) => notify.apiError(err),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      notify.success("Data pengguna diperbarui.");
    },
    onError: (err) => notify.apiError(err),
  });
}

/**
 * Reset password tidak mengubah daftar user, jadi tidak perlu invalidate
 * apa pun — cukup laporkan sukses/gagalnya ke pemanggil + toast.
 */
export function useResetUserPassword() {
  return useMutation({
    mutationFn: userApi.resetPassword,
    onSuccess: () => notify.success("Password pengguna direset."),
    onError: (err) => notify.apiError(err),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
      notify.success("Pengguna dihapus.");
    },
    onError: (err) => notify.apiError(err),
  });
}
