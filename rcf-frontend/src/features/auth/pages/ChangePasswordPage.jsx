import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { ROUTES } from "@/shared/constants/routes";
import { ChangePasswordForm } from "../components/ChangePasswordForm";
import { useChangePassword } from "../hooks/useChangePassword";

/**
 * Halaman ubah password sendiri.
 *
 * Setelah sukses, form dipasang ulang lewat perubahan `key` supaya ketiga
 * input password benar-benar kosong lagi. Sejak field dibungkus
 * <Controller>, nilainya ada di state form (bukan hanya di DOM), dan
 * remount adalah cara paling pasti membuangnya — `reset()` dari dalam
 * komponen menyisakan riwayat state form yang tidak perlu.
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
    <section className="flex max-w-lg flex-col gap-5">
      <div>
        {/* Breadcrumb kecil: halaman ini anak dari /profil, jadi jalan
            pulangnya ada di atas — bukan cuma link di paling bawah. */}
        <Link
          to={ROUTES.profile}
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-brand-600"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Profil Saya
        </Link>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">Ubah Password</h1>
        <p className="mt-1 text-sm text-slate-500">
          Password lama wajib diisi walaupun kamu sudah login, sebagai
          verifikasi bahwa ini benar kamu.
        </p>
      </div>

      <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
        <ChangePasswordForm
          key={formKey}
          onSubmit={handleSubmit}
          isSubmitting={isPending}
          errorMessage={error?.message}
          errorDetails={error?.errors}
          successMessage={isSuccess ? "Password berhasil diubah" : undefined}
        />
      </div>
    </section>
  );
}
