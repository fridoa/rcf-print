import { useMutation, useQueryClient } from "@tanstack/react-query";
import { customerApi } from "../api/customer.api";
import { customerKeys } from "./useCustomers";

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
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: customerApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerKeys.all }),
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: customerApi.update,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerKeys.all }),
  });
}

export function useDeleteCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: customerApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerKeys.all }),
  });
}
