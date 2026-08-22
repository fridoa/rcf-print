import { Link } from "react-router-dom";
import { ROUTES } from "@/shared/constants/routes";

export function NotFoundPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-sm font-medium text-slate-500">404</p>
      <h1 className="text-xl font-semibold text-slate-900">
        Halaman tidak ditemukan
      </h1>
      <Link
        to={ROUTES.dashboard}
        className="text-sm font-medium text-brand-600 underline"
      >
        Kembali ke dashboard
      </Link>
    </main>
  );
}
