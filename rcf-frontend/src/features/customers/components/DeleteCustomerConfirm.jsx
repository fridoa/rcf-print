import { Button } from "@/shared/components/ui";

/**
 * Konfirmasi hapus. Isi Modal, bukan modal sendiri, supaya halaman yang
 * memakainya tetap memegang state `open`.
 *
 * Nama pelanggan ikut disebut di pertanyaan — konfirmasi "Yakin hapus?"
 * tanpa objeknya adalah cara paling umum orang menghapus baris yang salah.
 */
export function DeleteCustomerConfirm({
  customer,
  onConfirm,
  onCancel,
  isDeleting = false,
  errorMessage,
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-600">
        Hapus pelanggan{" "}
        <strong className="font-semibold text-slate-900">
          {customer?.name}
        </strong>
        ? Tindakan ini tidak bisa dibatalkan.
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
