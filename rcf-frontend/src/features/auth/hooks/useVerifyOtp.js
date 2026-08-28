import { useMutation } from "@tanstack/react-query";
import { authApi } from "../api/auth.api";
import { notify } from "@/shared/lib/toast";

/**
 * Mutation verifikasi OTP. Respons membawa resetToken baru (OTP tukar
 * token) — halaman yang menyimpannya lalu menampilkan form password baru.
 */
export function useVerifyOtp() {
  return useMutation({
    mutationFn: (vars) => authApi.verifyOtp(vars),
    onSuccess: () => {
      notify.success("Kode OTP valid! Silakan masukkan password baru.");
    },
    onError: (err) => {
      notify.apiError(err, "Kode OTP salah atau telah kedaluwarsa.");
    },
  });
}
