import { useMutation } from "@tanstack/react-query";
import { authApi } from "../api/auth.api";
import { notify } from "@/shared/lib/toast";

/**
 * Mutation ubah password sendiri (PATCH /auth/change-password).
 *
 * Backend tidak mengembalikan data, hanya message — jadi tidak ada
 * state auth yang perlu diperbarui di sini.
 *
 * Catatan: token lama TETAP berlaku setelah password diganti, karena
 * backend belum punya mekanisme pencabutan token (blacklist / tokenVersion).
 * Jadi user tidak dipaksa login ulang. Kalau nanti mau dipaksa, hook ini
 * tempat yang tepat untuk memanggil logout() di onSuccess.
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: (vars) => authApi.changePassword(vars),
    onSuccess: () => notify.success("Password berhasil diubah."),
    onError: (err) => notify.apiError(err),
  });
}
