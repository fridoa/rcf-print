import { useMutation } from "@tanstack/react-query";
import { authApi } from "../api/auth.api";
import { notify } from "@/shared/lib/toast";

/**
 * Mutation lupa password langkah 3: set password baru lewat token.
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: (vars) => authApi.resetPassword(vars),
    onSuccess: () => {
      notify.success("Password berhasil direset! Mengalihkan ke halaman login...");
    },
    onError: (err) => {
      notify.apiError(err, "Gagal mengubah password.");
    },
  });
}
