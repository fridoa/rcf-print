import { Link, Outlet } from "react-router-dom";
import { Button } from "@/shared/components/ui";
import { ROLE_LABEL } from "@/shared/constants/roles";
import { ROUTES } from "@/shared/constants/routes";
import { useAuth } from "@/features/auth";

/**
 * Kerangka halaman setelah login: header + area konten.
 *
 * Sengaja masih minimal — navigasi per modul ditambahkan saat
 * halaman modulnya ada, supaya tidak ada link yang menuju 404.
 */
export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to={ROUTES.dashboard} className="font-semibold text-slate-900">
            RCF Print
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to={ROUTES.profile}
              className="text-sm text-slate-600 hover:underline"
            >
              {user?.name}
              {user?.role && (
                <span className="ml-1 text-slate-400">
                  ({ROLE_LABEL[user.role] ?? user.role})
                </span>
              )}
            </Link>

            <Button variant="secondary" size="sm" onClick={logout}>
              Keluar
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
