import { useMutation } from "@tanstack/react-query";
import { authApi } from "../api/auth.api";
import { useAuth } from "./useAuth";
import { notify } from "@/shared/lib/toast";

/**
 * Mutation edit profil sendiri (PATCH /auth/edit-profile).
 *
 * Backend membalas dokumen user terbaru, jadi onSuccess langsung menimpa
 * user di context. Tanpa ini, nama di header masih nama lama sampai
 * halaman di-refresh — bug yang paling sering lolos di fitur ini.
 *
 * Tidak ada invalidateQueries karena profil tidak disimpan di cache
 * react-query; sumber kebenarannya AuthContext (diisi saat login/restore).
 */
export function useEditProfile() {
  const { setUser } = useAuth();

  return useMutation({
    mutationFn: authApi.editProfile,
    onSuccess: (user) => {
      setUser(user);
      notify.success("Profil berhasil diperbarui.");
    },
    onError: (err) => notify.apiError(err),
  });
}
