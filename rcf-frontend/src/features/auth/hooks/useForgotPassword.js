import { useMutation } from "@tanstack/react-query";
import { authApi } from "../api/auth.api";

/**
 * Mutation lupa password langkah 1: minta email reset.
 *
 * Tidak ada toast onSuccess di sini — pesan "cek email" yang harus tampil
 * adalah info halaman (bukan notifikasi sekali lewat), halaman yang
 * mengelolanya. Error juga inline (429/validasi), tidak di-toast, supaya
 * tidak dobel dengan form.
 */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (vars) => authApi.forgotPassword(vars),
  });
}
