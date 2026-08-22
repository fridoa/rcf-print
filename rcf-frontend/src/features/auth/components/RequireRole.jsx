import { Navigate, Outlet } from "react-router-dom";
import { ROUTES } from "@/shared/constants/routes";
import { useAuth } from "../hooks/useAuth";

/**
 * Guard berbasis role. Dipakai di dalam RequireAuth, jadi di sini user
 * sudah pasti ada.
 *
 * Role yang tidak diizinkan dialihkan ke dashboard, bukan ke /login —
 * user sudah login, masalahnya izin, dan menendang ke login akan
 * terasa seperti sesi habis.
 *
 * Catatan review: ini hanya lapisan UX. Otorisasi sebenarnya tetap di
 * backend (middleware authorize), karena guard di client bisa dilewati.
 */
export function RequireRole({ allow = [] }) {
  const { user } = useAuth();

  const diizinkan = allow.length === 0 || allow.includes(user?.role);

  if (!diizinkan) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }

  return <Outlet />;
}
