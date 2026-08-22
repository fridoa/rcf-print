import { useMutation } from "@tanstack/react-query";
import { authApi } from "../api/auth.api";
import { useAuth } from "./useAuth";

/**
 * Mutation login.
 *
 * onSuccess menyimpan token + user ke context. Redirect sengaja TIDAK
 * dilakukan di sini: halaman login yang tahu ke mana user harus kembali
 * (state.from dari route guard), jadi navigasi tetap di komponen.
 */
export function useLogin() {
  const { login } = useAuth();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => login(data),
  });
}
