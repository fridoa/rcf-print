import { Link, NavLink, Outlet } from "react-router-dom";
import { Button } from "@/shared/components/ui";
import { ROLE_LABEL } from "@/shared/constants/roles";
import { ROUTES } from "@/shared/constants/routes";
import { cn } from "@/shared/lib/cn";
import { useAuth } from "@/features/auth";

/**
 * Kerangka halaman setelah login: header + navigasi + area konten.
 *
 * Navigasi hanya memuat modul yang halamannya sudah ada, supaya tidak ada
 * link yang menuju 404. Pesanan & rekap ditambahkan saat modulnya jadi.
 */
const NAV = [
  { to: ROUTES.dashboard, label: "Dashboard" },
  { to: ROUTES.customers, label: "Pelanggan" },
];

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

        <nav aria-label="Navigasi utama" className="mx-auto max-w-5xl px-4">
          <ul className="flex gap-1">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end
                  className={({ isActive }) =>
                    cn(
                      "inline-block border-b-2 px-3 py-2 text-sm font-medium",
                      isActive
                        ? "border-brand-600 text-brand-700"
                        : "border-transparent text-slate-500 hover:text-slate-800"
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
