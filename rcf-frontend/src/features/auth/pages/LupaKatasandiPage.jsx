import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES } from "@/shared/constants/routes";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { LupaPasswordForm } from "../components/LupaPasswordForm";
import { OtpForm } from "../components/OtpForm";
import { ResetPasswordForm } from "../components/ResetPasswordForm";
import { useForgotPassword } from "../hooks/useForgotPassword";
import { useVerifyOtp } from "../hooks/useVerifyOtp";
import { useResetPassword } from "../hooks/useResetPassword";
import { useAuth } from "../hooks/useAuth";
import { Alert, Button } from "@/shared/components/ui";
import logoUrl from "@/assets/images/logo.jpg";

/**
 * Halaman lupa katasandi — tiga langkah dalam satu path:
 *
 *   1. Minta email reset (form email).
 *   2. Input OTP dari email. Dua jalan masuk ke langkah ini: tautan email
 *      tidak dibuka sama sekali (user ketik manual), atau tautan dibuka
 *      tapi ?token= tidak ada.
 *   3. Password baru. Token reset datang dari dua sumber:
 *      ?token= (langsung dari tautan email — melewati langkah 2), atau
 *      hasil tukar OTP di langkah 2 (tersimpan di state halaman).
 *
 * Alur OTP tetap satu klik lebih panjang, tapi bekerja untuk user yang
 * membaca email di HP sambil membuka aplikasi di perangkat lain —
 * menyalin tautan panjang lintas perangkat tidak realistis.
 */
export function LupaKatasandiPage() {
  const [params] = useSearchParams();
  const urlToken = params.get("token") ?? "";

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const forgot = useForgotPassword();
  const verify = useVerifyOtp();
  const reset = useResetPassword();

  // Token hasil tukar OTP — tidak ditaruh di URL supaya tidak mengendap di
  // riwayat browser; cukup hidup selama halaman ini terbuka.
  // Hanya hidup selama halaman ini terbuka — sengaja tidak ditaruh
  // di URL supaya token tidak mengendap di riwayat browser.
  const [otpToken, setOtpToken] = useState("");

  usePageTitle("Lupa Kata Sandi");

  // Redirect ke login 3 detik setelah reset sukses.
  useEffect(() => {
    if (!reset.isSuccess) return;
    const t = setTimeout(() => navigate(ROUTES.login, { replace: true }), 3000);
    return () => clearTimeout(t);
  }, [reset.isSuccess, navigate]);

  if (isAuthenticated) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }

  const tokenAktif = otpToken || urlToken;

  // === Langkah 3: password baru ===
  if (tokenAktif) {
    return (
      <Shell
        title="Password Baru"
        footer={
          <Link to={ROUTES.login} className="font-medium text-brand-600 hover:underline">
            Kembali ke login
          </Link>
        }
      >
        {reset.isSuccess ? (
          <Alert
            tone="success"
            title="Password berhasil direset. Mengalihkan ke halaman login..."
          />
        ) : (
          <ResetPasswordForm
            onSubmit={(values) =>
              reset.mutate({ token: tokenAktif, newPassword: values.newPassword })
            }
            isSubmitting={reset.isPending}
            errorMessage={reset.error?.message}
            errorDetails={reset.error?.errors}
          />
        )}
      </Shell>
    );
  }

  // === Langkah 2: input OTP ===
  if (forgot.isSuccess) {
    return (
      <Shell
        title="Masukkan Kode OTP"
        description="Kami mengirim kode 6 digit ke email Anda. Kode berlaku 10 menit."
        footer={
          <button
            type="button"
            onClick={() => forgot.reset()}
            className="text-sm font-medium text-brand-600 hover:underline"
          >
            Kembali — kirim ulang / ganti email
          </button>
        }
      >
        <OtpForm
          onSubmit={(values) =>
            verify.mutate(
              { email: forgot.variables?.email, otp: values.otp },
              { onSuccess: (data) => setOtpToken(data.resetToken) }
            )
          }
          isSubmitting={verify.isPending}
          errorMessage={verify.error?.message}
          errorDetails={verify.error?.errors}
        />
      </Shell>
    );
  }

  // === Langkah 1: minta email reset ===
  return (
    <Shell
      title="Lupa Kata Sandi?"
      description="Masukkan email akun Anda — kami kirim instruksi reset password."
      footer={
        <Link to={ROUTES.login} className="font-medium text-brand-600 hover:underline">
          Kembali ke login
        </Link>
      }
    >
      <LupaPasswordForm
        onSubmit={(values) => forgot.mutate(values)}
        isSubmitting={forgot.isPending}
        errorMessage={forgot.error?.message}
      />
    </Shell>
  );
}

/** Kerangka kartu yang sama dengan login. */
function Shell({ title, description, footer, children }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <header className="mb-6">
          <div className="mb-3 flex justify-center">
            <img
              src={logoUrl}
              alt="Logo RCF Print"
              className="size-24 shrink-0 rounded-2xl object-cover"
            />
          </div>
          <h1 className="text-center text-xl font-semibold text-slate-900">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-center text-sm text-slate-500">{description}</p>
          )}
        </header>
        <div className="flex flex-col gap-4">{children}</div>
        {footer && (
          <p className="mt-6 text-center text-sm text-slate-500">{footer}</p>
        )}
      </div>
    </main>
  );
}
