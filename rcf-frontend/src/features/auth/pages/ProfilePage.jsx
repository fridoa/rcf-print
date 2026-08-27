import { Link } from "react-router-dom";
import { ROUTES } from "@/shared/constants/routes";
import { ROLE_LABEL } from "@/shared/constants/roles";
import { EditProfileForm } from "../components/EditProfileForm";
import { useAuth } from "../hooks/useAuth";
import { useEditProfile } from "../hooks/useEditProfile";

/**
 * Halaman profil sendiri.
 *
 * Data awal diambil dari AuthContext (sudah terisi saat login / restore
 * sesi lewat /auth/me), jadi tidak ada request tambahan saat halaman
 * dibuka. Role & status akun ditampilkan read-only karena backend
 * sengaja tidak menerima field itu dari endpoint edit-profile.
 */
export function ProfilePage() {
  const { user } = useAuth();
  const { mutate, isPending, error, isSuccess } = useEditProfile();

  return (
    <section className="max-w-lg">
      <header className="mb-5">
        <h1 className="text-3xl font-bold text-slate-900">Profil Saya</h1>
        <p className="mt-1 text-sm text-slate-500">
          Ubah nama, username, atau email. Hanya field yang kamu ubah yang
          dikirim ke server.
        </p>
      </header>

      <dl className="mb-6 rounded-lg bg-white px-4 py-3 text-sm ring-1 ring-slate-200">
        <div className="flex justify-between py-1">
          <dt className="text-slate-500">Role</dt>
          <dd className="font-medium text-slate-800">
            {ROLE_LABEL[user?.role] ?? user?.role ?? "-"}
          </dd>
        </div>
        <div className="flex justify-between py-1">
          <dt className="text-slate-500">Status akun</dt>
          <dd className="font-medium text-slate-800">
            {user?.isActive === false ? "Tidak aktif" : "Aktif"}
          </dd>
        </div>
      </dl>

      <EditProfileForm
        user={user}
        onSubmit={mutate}
        isSubmitting={isPending}
        errorMessage={error?.message}
        errorDetails={error?.errors}
        successMessage={isSuccess ? "Profil berhasil diperbarui" : undefined}
      />

      <p className="mt-6 text-sm text-slate-500">
        Mau ganti password?{" "}
        <Link
          to={ROUTES.changePassword}
          className="font-medium text-brand-600 hover:underline"
        >
          Ubah password
        </Link>
      </p>
    </section>
  );
}
