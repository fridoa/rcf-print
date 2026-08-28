import { Button } from "@/shared/components/ui";

/**
 * Konfirmasi hapus user. Isi Modal, bukan modal sendiri, supaya halaman
 * yang memakainya tetap memegang state `open`. Pola sama dengan
 * DeleteCustomerConfirm.
 *
 * Nama user ikut disebut di pertanyaan supaya admin tidak menghapus baris
 * yang salah.
 */
export function DeleteUserConfirm({
  user,
  onConfirm,
  onCancel,
  isDeleting = false,
  errorMessage,
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600">
        Hapus user{" "}
        <strong className="font-semibold text-slate-900">{user?.name}</strong>
        {user?.username ? ` (${user.username})` : ""}? Tindakan ini tidak bisa
        dibatalkan.
      </p>

      {errorMessage && (
        <p role="alert" className="text-sm text-danger-600">
          {errorMessage}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isDeleting}
        >
          Batal
        </Button>

        <Button
          type="button"
          variant="danger"
          onClick={onConfirm}
          isLoading={isDeleting}
        >
          {isDeleting ? "Menghapus..." : "Hapus"}
        </Button>
      </div>
    </div>
  );
}
