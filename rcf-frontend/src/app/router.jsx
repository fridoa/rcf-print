import { Route, Routes } from "react-router-dom";
import {
  ChangePasswordPage,
  LoginPage,
  ProfilePage,
  RequireAuth,
} from "@/features/auth";
import { CustomerListPage } from "@/features/customers";
import { ROUTES } from "@/shared/constants/routes";
import { AppLayout } from "./AppLayout";
import { DashboardPage } from "./DashboardPage";
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
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
