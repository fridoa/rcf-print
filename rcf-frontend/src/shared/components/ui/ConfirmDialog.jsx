import { Modal } from "./Modal";
import { Button } from "./Button";

/**
 * Dialog konfirmasi aksi — pembungkus tipis di atas Modal.
 *
 * Dipakai untuk aksi sekali-klik yang berisiko "kepencet" (mis. memajukan
 * status order produksi). Menahan aksi sampai admin menekan tombol konfirmasi,
 * bukan langsung mengeksekusi saat tombol baris ditekan.
 *
 * @param {boolean}  open
 * @param {string}   title
 * @param {string}   description   penjelasan singkat konsekuensi aksi
 * @param {string}   confirmLabel  teks tombol konfirmasi (default "Ya, lanjut")
 * @param {string}   cancelLabel   teks tombol batal (default "Batal")
 * @param {"primary"|"danger"} tone  gaya tombol konfirmasi
 * @param {boolean}  isLoading     tombol konfirmasi loading + terkunci
 * @param {string}   errorMessage  pesan error dari mutasi (dialog tetap terbuka)
 * @param {() => void} onConfirm
 * @param {() => void} onCancel
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Ya, lanjut",
  cancelLabel = "Batal",
  tone = "primary",
  isLoading = false,
  errorMessage,
  onConfirm,
  onCancel,
  children,
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title} description={description}>
      <div className="flex flex-col gap-4">
        {children}

        {errorMessage && (
          <p role="alert" className="text-sm text-danger-600">
            {errorMessage}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button variant={tone} onClick={onConfirm} isLoading={isLoading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
