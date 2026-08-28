import { useMutation } from "@tanstack/react-query";
import { authApi } from "../api/auth.api";
import { useAuth } from "./useAuth";
import { notify } from "@/shared/lib/toast";

/**
 * Mutation login.
 *
 * onSuccess menyimpan token + user ke context. Redirect sengaja TIDAK
 * dilakukan di sini: halaman login yang tahu ke mana user harus kembali
 * (state.from dari route guard), jadi navigasi tetap di komponen.
 *
 * Toast sukses menyapa user; error login TIDAK di-toast di sini karena
 * LoginPage sudah menampilkannya inline di form (menghindari pesan dobel).
 */
export function useLogin() {
  const { login } = useAuth();

  return useMutation({
    mutationFn: (vars) => authApi.login(vars),
    onSuccess: (data) => {
      login(data);
      notify.success(`Selamat datang, ${data?.user?.name ?? "kembali"}!`);
    },
  });
}
