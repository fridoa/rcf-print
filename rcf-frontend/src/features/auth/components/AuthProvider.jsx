import { useCallback, useEffect, useMemo, useState } from "react";
import { setUnauthorizedHandler } from "@/shared/api/client";
import { tokenStorage } from "@/shared/lib/token";
import { authApi } from "../api/auth.api";
import { AuthContext } from "../context/AuthContext";

/**
 * Sumber tunggal state autentikasi.
 *
 * Status sengaja dibuat tiga nilai, bukan boolean isLoading:
 *   "checking"  -> token ada, sedang divalidasi ke /auth/me
 *   "authed"    -> user terisi
 *   "guest"     -> tidak ada token / token ditolak
 *
 * Tanpa status "checking", route guard akan sempat melihat user=null pada
 * render pertama dan menendang user yang sebenarnya sudah login ke /login
 * setiap kali halaman di-refresh.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(() =>
    tokenStorage.get() ? "checking" : "guest"
  );

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
    setStatus("guest");
  }, []);

  // Dipanggil interceptor axios saat ada respons 401 dari endpoint mana pun,
  // termasuk saat token kedaluwarsa di tengah pemakaian.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      setStatus("guest");
    });

    return () => setUnauthorizedHandler(null);
  }, []);

  // Restore sesi saat halaman dibuka/di-refresh.
  useEffect(() => {
    if (!tokenStorage.get()) return;

    let aktif = true;

    authApi
      .me()
      .then((data) => {
        if (!aktif) return;
        setUser(data);
        setStatus("authed");
      })
      .catch(() => {
        // Token tidak valid. Interceptor 401 sudah membersihkan token;
        // untuk error lain (mis. server mati) kita tetap turunkan ke guest
        // supaya UI tidak menggantung di layar "checking".
        if (!aktif) return;
        tokenStorage.clear();
        setUser(null);
        setStatus("guest");
      });

    return () => {
      aktif = false;
    };
  }, []);

  const login = useCallback(({ token, user: profil }) => {
    tokenStorage.set(token);
    setUser(profil);
    setStatus("authed");
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === "authed",
      isChecking: status === "checking",
      login,
      logout,
      setUser,
    }),
    [user, status, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
