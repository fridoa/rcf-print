import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  PenTool,
  Printer,
  Scissors,
  Package,
  Users,
  BarChart3,
  UserCog,
  Menu,
} from "lucide-react";
import { ROLES } from "@/shared/constants/roles";
import { ROUTES } from "@/shared/constants/routes";
import { ConfirmDialog } from "@/shared/components/ui";
import { Sidebar } from "@/shared/components/layout/Sidebar";
import { cn } from "@/shared/lib/cn";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { useAuth } from "@/features/auth";

/**
 * Kerangka halaman setelah login: sidebar navigasi + area konten.
 *
 * Navigasi hanya memuat modul yang halamannya sudah ada, supaya tidak ada
 * link yang menuju 404.
 *
 * Item punya `group` (judul seksi di sidebar) dan `icon` (lucide). Sebagian
 * punya `roles`: hanya tampil untuk role tsb. Layar order dipisah per peran
 * (Opsi B): tiap operator melihat menu ke layar kerjanya sendiri, admin
 * melihat semua. Menyembunyikan menu per role murni UX — route dijaga
 * RequireRole (untuk /pesanan) dan endpoint dijaga backend.
 */
const NAV = [
  { to: ROUTES.dashboard, label: "Dashboard", icon: LayoutDashboard, group: "Utama" },

  {
    to: ROUTES.orders,
    label: "Order Aktif",
    icon: ClipboardList,
    group: "Order",
    roles: [ROLES.ADMIN],
  },
  {
    to: ROUTES.desain,
    label: "Desain",
    icon: PenTool,
    group: "Order",
    roles: [ROLES.ADMIN, ROLES.DESIGNER],
  },
  {
    to: ROUTES.cetak,
    label: "Cetak",
    icon: Printer,
    group: "Order",
    roles: [ROLES.ADMIN, ROLES.PRODUKSI],
  },
  {
    to: ROUTES.polyflex,
    label: "Polyflex",
    icon: Scissors,
    group: "Order",
    roles: [ROLES.ADMIN, ROLES.PRODUKSI],
  },
  {
    to: ROUTES.packing,
    label: "Packing",
    icon: Package,
    group: "Order",
    roles: [ROLES.ADMIN, ROLES.PACKING],
  },

  { to: ROUTES.customers, label: "Pelanggan", icon: Users, group: "Lainnya" },
  {
    to: ROUTES.rekap,
    label: "Rekap",
    icon: BarChart3,
    group: "Lainnya",
    roles: [ROLES.ADMIN],
  },
  {
    to: ROUTES.users,
    label: "Pengguna",
    icon: UserCog,
    group: "Lainnya",
    roles: [ROLES.ADMIN],
  },
];

/**
 * Judul tab per route. Dipisah dari NAV karena beberapa halaman punya route
 * tapi tidak muncul di menu (profil, ganti password), sehingga labelnya tidak
 * ada di NAV. Judul akhir jadi "RCF Print - <judul>" (lihat usePageTitle).
 */
const TITLE_PER_ROUTE = {
  [ROUTES.dashboard]: "Dashboard",
  [ROUTES.orders]: "Order Aktif",
  [ROUTES.desain]: "Desain",
  [ROUTES.cetak]: "Cetak",
  [ROUTES.polyflex]: "Polyflex",
  [ROUTES.packing]: "Packing",
  [ROUTES.customers]: "Pelanggan",
  [ROUTES.rekap]: "Rekap",
  [ROUTES.users]: "Pengguna",
  [ROUTES.profile]: "Profil",
  [ROUTES.changePassword]: "Ubah Password",
};

export function AppLayout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  // Judul dinamis mengikuti route aktif. Halaman tak terdaftar → "RCF Print".
  usePageTitle(TITLE_PER_ROUTE[pathname]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Konfirmasi logout dulu supaya tidak sengaja keluar (pekerjaan yang belum
  // tersimpan di form bisa hilang). Handler onLogout di sidebar hanya membuka
  // dialog; logout sebenarnya jalan setelah dikonfirmasi.
  const [konfirmasiLogout, setKonfirmasiLogout] = useState(false);

  const mintaLogout = () => {
    setDrawerOpen(false); // tutup drawer mobile supaya dialog tidak ketutupan
    setKonfirmasiLogout(true);
  };

  // Esc menutup drawer (pola yang sama dengan Modal), dan selama drawer
  // terbuka body dikunci supaya halaman di belakang tidak ikut tergulir.
  useEffect(() => {
    if (!drawerOpen) return undefined;

    const onKeyDown = (e) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);

    const overflowAwal = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflowAwal;
    };
  }, [drawerOpen]);

  const navItems = NAV.filter(
    (item) => !item.roles || item.roles.includes(user?.role)
  );

  return (
    <div className="min-h-dvh bg-canvas">
      {/* Sidebar tetap di kiri untuk layar besar (lg+). */}
      <div className="fixed inset-y-0 left-0 z-30 hidden lg:block">
        <Sidebar items={navItems} user={user} onLogout={mintaLogout} />
      </div>

      {/* Drawer mobile tetap mounted agar animasi tutup sempat selesai. */}
      <div
        className={cn(
          "fixed inset-0 z-40 transition-opacity duration-300 ease-out lg:hidden motion-reduce:transition-none",
          drawerOpen
            ? "opacity-100"
            : "pointer-events-none opacity-0"
        )}
        aria-hidden={!drawerOpen}
        inert={!drawerOpen ? "" : undefined}
      >
        <button
          type="button"
          aria-label="Tutup menu"
          className="absolute inset-0 bg-slate-900/40"
          onClick={() => setDrawerOpen(false)}
        />
        <div
          className={cn(
            "absolute inset-y-0 left-0 shadow-xl transition-transform duration-300 ease-out motion-reduce:transition-none",
            drawerOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <Sidebar
            items={navItems}
            user={user}
            onLogout={mintaLogout}
            onNavigate={() => setDrawerOpen(false)}
          />
        </div>
      </div>

      {/* Kolom konten: diberi margin kiri selebar sidebar di layar besar. */}
      <div className="lg:pl-60">
        {/* Top bar hanya untuk mobile: tombol buka menu. */}
        <header className="flex items-center border-b border-hairline bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            aria-label="Buka menu"
            onClick={() => setDrawerOpen(true)}
            className="grid size-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
          >
            <Menu className="size-5" aria-hidden="true" />
          </button>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>

      <ConfirmDialog
        open={konfirmasiLogout}
        title="Keluar dari akun?"
        description="Anda akan keluar dan kembali ke halaman login. Pastikan pekerjaan yang belum tersimpan sudah disimpan."
        confirmLabel="Keluar"
        cancelLabel="Batal"
        tone="danger"
        onConfirm={() => {
          setKonfirmasiLogout(false);
          logout();
        }}
        onCancel={() => setKonfirmasiLogout(false)}
      />
    </div>
  );
}
