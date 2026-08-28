import { useMutation } from "@tanstack/react-query";
import { authApi } from "../api/auth.api";

/**
 * Mutation lupa password langkah 2: set password baru lewat token dari
 * link email. Toast sukses tidak di sini — halaman reset yang
 * menampilkan statusnya lalu me-redirect ke login.
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: (vars) => authApi.resetPassword(vars),
  });
}
