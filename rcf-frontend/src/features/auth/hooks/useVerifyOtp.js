import { useMutation } from "@tanstack/react-query";
import { authApi } from "../api/auth.api";

/**
 * Mutation verifikasi OTP. Respons membawa resetToken baru (OTP tukar
 * token) — halaman yang menyimpannya lalu menampilkan form password baru.
 */
export function useVerifyOtp() {
  return useMutation({
    mutationFn: (vars) => authApi.verifyOtp(vars),
  });
}
