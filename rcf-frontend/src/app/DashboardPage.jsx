import { useAuth } from "@/features/auth";

/** Placeholder dashboard — bukti alur login berhasil sampai halaman internal. */
export function DashboardPage() {
  const { user } = useAuth();

  return (
    <section>
      <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-600">
        Selamat datang, {user?.name ?? "pengguna"}.
      </p>
    </section>
  );
}
