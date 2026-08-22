import { useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "@/shared/constants/routes";
import { ChangePasswordForm } from "../components/ChangePasswordForm";
import { useChangePassword } from "../hooks/useChangePassword";

/**
 * Halaman ubah password sendiri.
 *
 * Setelah sukses, form dipasang ulang lewat perubahan `key` supaya ketiga
 * input password benar-benar kosong lagi — password yang masih tertinggal
 * di DOM setelah submit sukses tidak ada gunanya dan memperbesar risiko
 * kalau layar ditinggal terbuka.
 */
export function ChangePasswordPage() {
  const [formKey, setFormKey] = useState(0);
  const { mutate, isPending, error, isSuccess } = useChangePassword();

  const handleSubmit = (values) => {
    mutate(values, {
      onSuccess: () => setFormKey((n) => n + 1),
    });
  };

  return (
    <section className="max-w-lg">
      <header className="mb-5">
        <h1 className="text-lg font-semibold text-slate-900">Ubah Password</h1>
        <p className="mt-1 text-sm text-slate-500">
          Password lama wajib diisi walaupun kamu sudah login, sebagai
          verifikasi bahwa ini benar kamu.
        </p>
      </header>

      <ChangePasswordForm
        key={formKey}
        onSubmit={handleSubmit}
        isSubmitting={isPending}
        errorMessage={error?.message}
        errorDetails={error?.errors}
        successMessage={isSuccess ? "Password berhasil diubah" : undefined}
      />

      <p className="mt-6 text-sm text-slate-500">
        <Link
          to={ROUTES.profile}
          className="font-medium text-brand-600 hover:underline"
        >
          Kembali ke profil
        </Link>
      </p>
    </section>
  );
}
