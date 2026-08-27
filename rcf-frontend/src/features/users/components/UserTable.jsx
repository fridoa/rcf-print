import { Button, Spinner } from "@/shared/components/ui";
import { ROLE_LABEL } from "@/shared/constants/roles";

/**
 * Tabel user.
 *
 * Presentational: tidak tahu soal react-query maupun modal. Aksi dilempar
 * ke atas lewat callback supaya komponen ini tetap bisa diuji sendiri.
 *
 * currentUserId dipakai untuk menandai baris "Anda" dan menonaktifkan
 * tombol yang tidak boleh dikenakan ke diri sendiri (hapus, reset password
 * milik sendiri lewat sini). Ini hanya UX — backend tetap pengaman
 * sebenarnya (guard diri-sendiri & admin-terakhir).
 */
export function UserTable({
  users = [],
  isLoading = false,
  isFetching = false,
  currentUserId,
  onEdit,
  onResetPassword,
  onDelete,
}) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner label="Memuat data user..." />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-500">
        Belum ada user yang cocok.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg bg-white ring-1 ring-slate-200">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Daftar user RCF Print</caption>

        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              Nama
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Username
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Email
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Role
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Status
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              Aksi
            </th>
          </tr>
        </thead>

        <tbody
          className="divide-y divide-slate-100"
          aria-busy={isFetching || undefined}
        >
          {users.map((user) => {
            const iniSaya = String(user._id) === String(currentUserId);

            return (
              <tr key={user._id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-800">
                  {user.name}
                  {iniSaya && (
                    <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-normal text-slate-500">
                      Anda
                    </span>
                  )}
                </td>

                <td className="px-4 py-3 text-slate-600">{user.username}</td>
                <td className="px-4 py-3 text-slate-600">{user.email}</td>
                <td className="px-4 py-3 text-slate-600">
                  {ROLE_LABEL[user.role] ?? user.role}
                </td>

                <td className="px-4 py-3">
                  <span
                    className={
                      user.isActive
                        ? "inline-flex rounded-full bg-success-50 px-2 py-0.5 text-xs font-medium text-success-500"
                        : "inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500"
                    }
                  >
                    {user.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onEdit?.(user)}
                      aria-label={`Ubah ${user.name}`}
                    >
                      Ubah
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onResetPassword?.(user)}
                      aria-label={`Reset password ${user.name}`}
                    >
                      Reset Password
                    </Button>

                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => onDelete?.(user)}
                      // Menghapus diri sendiri ditolak backend; matikan di UI
                      // supaya admin tidak menabrak error yang bisa dicegah.
                      disabled={iniSaya}
                      aria-label={`Hapus ${user.name}`}
                    >
                      Hapus
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
