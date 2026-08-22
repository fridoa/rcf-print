import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ROUTES } from "@/shared/constants/routes";
import { LoginForm } from "../components/LoginForm";
import { useAuth } from "../hooks/useAuth";
import { useLogin } from "../hooks/useLogin";

/**
 * Halaman login.
 *
 * Kalau user sudah login lalu membuka /login (mis. dari bookmark),
 * langsung dialihkan ke dashboard — bukan menampilkan form kosong.
 *
 * Setelah login sukses, user dikembalikan ke halaman yang tadi dia coba
 * buka (location.state.from yang diisi RequireAuth), default ke dashboard.
 * replace: true supaya tombol Back tidak membawa user kembali ke /login.
 */
export function LoginPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { mutate, isPending, error } = useLogin();

  const tujuan = location.state?.from ?? ROUTES.dashboard;

  if (isAuthenticated) {
    return <Navigate to={tujuan} replace />;
  }

  const handleSubmit = (values) => {
    mutate(values, {
      onSuccess: () => navigate(tujuan, { replace: true }),
    });
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <header className="mb-6">
          <h1 className="text-xl font-semibold text-slate-900">RCF Print</h1>
          <p className="mt-1 text-sm text-slate-500">
            Masuk untuk mengelola pesanan.
          </p>
        </header>

        <LoginForm
          onSubmit={handleSubmit}
          isSubmitting={isPending}
          errorMessage={error?.message}
          errorDetails={error?.errors}
        />
      </div>
    </main>
  );
}
