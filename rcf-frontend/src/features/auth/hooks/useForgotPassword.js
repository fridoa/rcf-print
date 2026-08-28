import { useMutation } from "@tanstack/react-query";
import { authApi } from "../api/auth.api";
import { notify } from "@/shared/lib/toast";

/**
 * Mutation lupa password langkah 1: minta email reset.
 */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (vars) => authApi.forgotPassword(vars),
    onSuccess: (data) => {
      notify.success(data?.message || "Instruksi reset password telah dikirim.");
    },
    onError: (err) => {
      notify.apiError(err, "Gagal mengirim instruksi reset password.");
    },
  });
}
