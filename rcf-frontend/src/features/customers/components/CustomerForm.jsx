import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Alert, Button, TextField } from "@/shared/components/ui";
import { customerSchema } from "../schemas/customer.schema";

/**
 * Form pelanggan, dipakai untuk tambah maupun ubah.
 *
 * Mode ditentukan oleh ada/tidaknya prop `customer`:
 *   tidak ada  -> tambah, semua field dikirim
 *   ada        -> ubah, HANYA field yang berubah yang dikirim (PATCH partial)
 *
 * Alasan satu komponen untuk dua mode: field, aturan validasi, dan pesan
 * errornya identik. Memisah jadi dua komponen berarti dua tempat yang
 * harus diubah setiap kali kolom pelanggan bertambah.
 */
export function CustomerForm({
  customer,
  onSubmit,
  onCancel,
  isSubmitting = false,
  errorMessage,
  errorDetails = [],
}) {
  const mode = customer ? "ubah" : "tambah";

  const {
    register,
    handleSubmit,
    formState: { errors, dirtyFields, isDirty },
  } = useForm({
    resolver: yupResolver(customerSchema),
    defaultValues: {
      name: customer?.name ?? "",
      whatsapp: customer?.whatsapp ?? "",
      note: customer?.note ?? "",
    },
  });

  const kirim = (values) => {
    if (mode === "tambah") {
      onSubmit(values);
      return;
    }

    const diff = Object.fromEntries(
      Object.keys(dirtyFields).map((field) => [field, values[field]])
    );

    if (Object.keys(diff).length === 0) return;

    onSubmit(diff);
  };

  return (
    <form
      noValidate
      onSubmit={handleSubmit(kirim)}
      className="flex flex-col gap-4"
    >
      {errorMessage && (
        <Alert tone="error" title={errorMessage} messages={errorDetails} />
      )}

      <TextField
        label="Nama Pelanggan"
        autoFocus
        autoComplete="off"
        placeholder="Budi Santoso"
        error={errors.name?.message}
        {...register("name")}
      />

      <TextField
        label="Nomor WhatsApp"
        inputMode="tel"
        autoComplete="off"
        placeholder="081234567890"
        hint="Boleh ditulis 0812..., 62812..., atau +62 812..."
        error={errors.whatsapp?.message}
        {...register("whatsapp")}
      />

      <TextField
        label="Catatan (opsional)"
        autoComplete="off"
        placeholder="Langganan kaos komunitas"
        error={errors.note?.message}
        {...register("note")}
      />

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Batal
        </Button>

        <Button
          type="submit"
          isLoading={isSubmitting}
          disabled={mode === "ubah" && !isDirty}
        >
          {isSubmitting
            ? "Menyimpan..."
            : mode === "tambah"
              ? "Simpan Pelanggan"
              : "Simpan Perubahan"}
        </Button>
      </div>
    </form>
  );
}
