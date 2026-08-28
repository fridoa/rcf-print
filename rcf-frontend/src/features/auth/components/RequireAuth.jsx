import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Spinner } from "@/shared/components/ui";
import { ROUTES } from "@/shared/constants/routes";
import { useAuth } from "../hooks/useAuth";

/**
 * Guard route yang butuh login.
 *
 * Selama status "checking" kita render spinner, BUKAN redirect — kalau
 * langsung redirect, refresh halaman akan selalu membuang user ke /login
 * padahal tokennya masih sah.
 *
 * state.from menyimpan tujuan asli supaya setelah login user kembali
 * ke halaman yang dia klik, bukan ke dashboard.
 */
export function RequireAuth() {
  const { isAuthenticated, isChecking } = useAuth();
  const location = useLocation();

  if (isChecking) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner label="Memeriksa sesi..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={ROUTES.login}
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <Outlet />;
}
