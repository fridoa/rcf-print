import { Route, Routes } from "react-router-dom";
import {
  ChangePasswordPage,
  LoginPage,
  ProfilePage,
  RequireAuth,
  RequireRole,
} from "@/features/auth";
import { CustomerListPage } from "@/features/customers";
import { UserListPage } from "@/features/users";
import {
  PesananPage,
  DesainPage,
  CetakPage,
  PolyflexPage,
  PackingPage,
} from "@/features/orders";
import { RekapPage } from "@/features/rekap";
import { DashboardPage } from "@/features/dashboard";
import { ROUTES } from "@/shared/constants/routes";
import { ROLES } from "@/shared/constants/roles";
import { AppLayout } from "./AppLayout";
import { NotFoundPage } from "./NotFoundPage";

/**
 * Peta route aplikasi.
 *
 * Semua path diambil dari ROUTES supaya tidak ada string path yang
 * ditulis dua kali (di router dan di <Link>).
 *
 * RequireAuth membungkus seluruh halaman internal lewat nested route,
 * jadi menambah halaman baru cukup menaruhnya di dalam blok itu —
 * tidak ada risiko lupa memasang guard.
 *
 * Halaman pelanggan TIDAK dibungkus RequireRole: semua role boleh membaca
 * daftar pelanggan (mengikuti route backend), dan tombol tambah/ubah/hapus
 * yang disembunyikan per role, bukan halamannya.
 *
 * Modul lain (pesanan, rekap) akan didaftarkan di sini sebagai <Route>
 * tambahan di dalam AppLayout ketika halamannya jadi.
 */
export function AppRouter() {
  return (
    <Routes>
      <Route path={ROUTES.login} element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path={ROUTES.dashboard} element={<DashboardPage />} />
          <Route path={ROUTES.profile} element={<ProfilePage />} />
          <Route
            path={ROUTES.changePassword}
            element={<ChangePasswordPage />}
          />
          <Route path={ROUTES.customers} element={<CustomerListPage />} />

          {/*
            Layar order per-peran (Opsi B). Semua role boleh MEMBACA daftar
            order (route backend GET terbuka), jadi halaman antrian tidak
            dibungkus RequireRole — tombol aksinya yang dijaga backend per
            status/role. Halaman Pesanan (buat + selesaikan) khusus ADMIN,
            jadi itu yang dibungkus RequireRole.
          */}
          <Route path={ROUTES.desain} element={<DesainPage />} />
          <Route path={ROUTES.cetak} element={<CetakPage />} />
          <Route path={ROUTES.polyflex} element={<PolyflexPage />} />
          <Route path={ROUTES.packing} element={<PackingPage />} />

          {/*
            Manajemen user hanya untuk ADMIN. RequireRole membungkus lewat
            nested route — sama pola dengan RequireAuth di atasnya, jadi
            role non-admin yang mengetik URL-nya langsung dialihkan ke
            dashboard, bukan melihat halaman kosong.
          */}
          <Route element={<RequireRole allow={[ROLES.ADMIN]} />}>
            <Route path={ROUTES.orders} element={<PesananPage />} />
            <Route path={ROUTES.rekap} element={<RekapPage />} />
            <Route path={ROUTES.users} element={<UserListPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
