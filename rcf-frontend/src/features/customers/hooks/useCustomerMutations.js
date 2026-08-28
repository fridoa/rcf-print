import { useMutation, useQueryClient } from "@tanstack/react-query";
import { customerApi } from "../api/customer.api";
import { customerKeys } from "./useCustomers";
import { notify } from "@/shared/lib/toast";

/**
 * Tiga mutation modul pelanggan.
 *
 * Semuanya meng-invalidate customerKeys.all, bukan satu kunci list
 * tertentu: setelah tambah/ubah/hapus, hasil pencarian dan nomor halaman
 * mana pun bisa berubah, jadi menargetkan satu kunci akan menyisakan
 * tabel basi di kondisi filter lain.
 *
 * Tidak ada optimistic update. Untuk data pelanggan, respons server
 * adalah sumber kebenaran (nomor dinormalisasi di backend), dan menebak
 * hasilnya di klien justru bikin nomor sempat tampil beda.
 *
 * Tiap mutation memberi toast sukses/gagal lewat notify supaya umpan balik
 * seragam dengan modul lain.
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars) => customerApi.create(vars),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      notify.success("Pelanggan baru ditambahkan.");
    },
    onError: (err) => notify.apiError(err),
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars) => customerApi.update(vars),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      notify.success("Data pelanggan diperbarui.");
    },
    onError: (err) => notify.apiError(err),
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars) => customerApi.remove(vars),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      notify.success("Pelanggan dihapus.");
    },
    onError: (err) => notify.apiError(err),
  });
}
