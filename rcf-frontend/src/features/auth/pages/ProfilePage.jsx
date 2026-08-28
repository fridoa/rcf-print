import { useState } from "react";
import { ChevronDown, KeyRound, Mail, ShieldCheck, UserRound } from "lucide-react";
import { ROUTES } from "@/shared/constants/routes";
import { ROLE_LABEL } from "@/shared/constants/roles";
import { Avatar, Button, Collapse } from "@/shared/components/ui";
import { EditProfileForm } from "../components/EditProfileForm";
import { ChangePasswordForm } from "../components/ChangePasswordForm";
import { useAuth } from "../hooks/useAuth";
import { useEditProfile } from "../hooks/useEditProfile";
import { useChangePassword } from "../hooks/useChangePassword";

/**
 * Form ubah password INLINE di dalam halaman profil — tidak lagi halaman
 * terpisah. Tombol di kartu Keamanan membuka panel (animasi grid 0fr->1fr,
 * tanpa package) lalu halaman menggulir smooth ke panel.
 *
 * Alasan inline (bukan route terpisah):
 * - Konteks tetap: user tidak pindah halaman untuk urusan kecil, dan bisa
 *   lihat data profilnya di samping.
 * - Satu state mutation (useChangePassword) dipakai di sini, tidak ada lagi
 *   halaman ganti-password yang duplikat state-nya.
 *
 * Ketika panel terbuka lalu sukses: form di-reset (key berubah) dan panel
 * TETAP terbuka menampilkan Alert sukses. Setelah sukses form kosong lagi,
 * jadi mengubah lagi tidak perlu membuka ulang.
 */
export function ProfilePage() {
  const { user } = useAuth();
  const [panelTerbuka, setPanelTerbuka] = useState(false);
  const [formKey, setFormKey] = useState(0);

  // Dua mutation terpisah, nama dibedakan eksplisit supaya tidak ada yang
  // saling menimpa (bug: form profil pernah memanggil changePassword).
  const editProfil = useEditProfile();
  const gantiPassword = useChangePassword();

  const togglePanel = () => {
    const akanTerbuka = !panelTerbuka;
    setPanelTerbuka(akanTerbuka);

    if (!akanTerbuka) return;

    // Tunggu panel dirender dulu, baru gulir ke posisinya. rAF cukup karena
    // scroll-mt-4 pada kartu menyisakan jarak dari tepi atas viewport.
    requestAnimationFrame(() => {
      document
        .getElementById("panel-ganti-password")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleChangePassword = (values) => {
    gantiPassword.mutate(values, {
      onSuccess: () => setFormKey((n) => n + 1),
    });
  };

  const nonaktif = user?.isActive === false;

  return (
    <section className="flex flex-col gap-5">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Profil Saya</h1>
        <p className="mt-1 text-sm text-slate-500">
          Kelola data akunmu. Role dan status akun hanya bisa diubah admin.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-12">
        {/* Kartu identitas — ringkasan siapa yang sedang login. */}
        <aside className="lg:col-span-4">
          <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
            <div className="flex items-center gap-4">
              <Avatar name={user?.name} size="lg" />
              <div className="min-w-0">
                <p className="break-words text-lg font-semibold text-slate-900">
                  {user?.name ?? "-"}
                </p>
                <p className="text-sm text-slate-500">@{user?.username ?? "-"}</p>
              </div>
            </div>

            <dl className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm">
              <div className="flex items-center gap-3">
                <ShieldCheck className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
                <dt className="text-slate-500">Role</dt>
                <dd className="ml-auto font-medium text-slate-800">
                  {ROLE_LABEL[user?.role] ?? user?.role ?? "-"}
                </dd>
              </div>

              <div className="flex items-center gap-3">
                <UserRound className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
                <dt className="text-slate-500">Status akun</dt>
                <dd className="ml-auto">
                  <span
                    className={
                      nonaktif
                        ? "rounded-full bg-danger-50 px-2 py-0.5 text-xs font-semibold text-danger-600"
                        : "rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700"
                    }
                  >
                    {nonaktif ? "Tidak aktif" : "Aktif"}
                  </span>
                </dd>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
                <dt className="text-slate-500">Email</dt>
                <dd className="ml-auto min-w-0 truncate font-medium text-slate-800" title={user?.email ?? undefined}>
                  {user?.email ?? "-"}
                </dd>
              </div>
            </dl>
          </div>
        </aside>

        {/* Kartu form + kartu keamanan */}
        <div className="flex flex-col gap-5 lg:col-span-8">
          <div className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
            <h2 className="text-base font-semibold text-slate-900">Ubah Data Akun</h2>
            <p className="mt-1 mb-4 text-sm text-slate-500">
              Hanya field yang kamu ubah yang dikirim ke server.
            </p>

            <EditProfileForm
              user={user}
              onSubmit={editProfil.mutate}
              isSubmitting={editProfil.isPending}
              errorMessage={editProfil.error?.message}
              errorDetails={editProfil.error?.errors}
              successMessage={
                editProfil.isSuccess ? "Profil berhasil diperbarui" : undefined
              }
            />
          </div>

          <div
            id="panel-ganti-password"
            className="scroll-mt-4 rounded-xl bg-white p-5 ring-1 ring-slate-200"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <KeyRound className="mt-0.5 size-5 shrink-0 text-slate-400" aria-hidden="true" />
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Keamanan</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Ganti password secara berkala. Password lama tetap diminta
                    sebagai verifikasi.
                  </p>
                </div>
              </div>

              <Button
                variant="purple"
                size="sm"
                onClick={togglePanel}
                aria-expanded={panelTerbuka}
                aria-controls="kolaps-ganti-password"
              >
                {panelTerbuka ? "Tutup" : "Ubah Password"}
                <ChevronDown
                  aria-hidden="true"
                  className={
                    panelTerbuka
                      ? "size-4 rotate-180 transition-transform"
                      : "size-4 transition-transform"
                  }
                />
              </Button>
            </div>

            <Collapse
              id="kolaps-ganti-password"
              open={panelTerbuka}
              className="mt-4"
            >
              <ChangePasswordForm
                key={formKey}
                onSubmit={handleChangePassword}
                isSubmitting={gantiPassword.isPending}
                errorMessage={gantiPassword.error?.message}
                errorDetails={gantiPassword.error?.errors}
                successMessage={
                  gantiPassword.isSuccess ? "Password berhasil diubah" : undefined
                }
              />
            </Collapse>
          </div>
        </div>
      </div>
    </section>
  );
}
