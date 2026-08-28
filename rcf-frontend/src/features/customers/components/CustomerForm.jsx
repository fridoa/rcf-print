import { Controller, useForm } from "react-hook-form";
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
 *
 * Field dibungkus <Controller>, bukan register(). Konsekuensinya yang
 * perlu diketahui:
 *
 * - register() menyerahkan input ke DOM (uncontrolled) dan react-hook-form
 *   hanya menempel ref + event. Controller menjadikannya controlled:
 *   nilainya hidup di state form, dan tiap ketikan me-render ulang field
 *   itu saja (Controller melanggan per-field, bukan seluruh form).
 * - Karena controlled, nilai dari luar (mis. reset ke data pelanggan lain)
 *   pasti tercermin di layar. Dengan register, input yang sudah ter-mount
 *   bisa tertinggal menampilkan nilai lama.
 * - `value` tidak boleh undefined, kalau tidak React memperingatkan
 *   "changing an uncontrolled input to be controlled". Itu sebabnya
 *   defaultValues di bawah mengisi ketiga field dengan string kosong,
 *   termasuk `note` yang opsional.
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
    control,
    handleSubmit,
    formState: { dirtyFields, isDirty },
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

      {/*
        `field` berisi { name, value, onChange, onBlur, ref } dan disebar ke
        TextField. TextField sudah forwardRef, jadi ref-nya sampai ke <input>
        dan react-hook-form tetap bisa memfokuskan field pertama yang error.

        `fieldState` dipakai untuk error, bukan `errors.name` dari formState:
        keduanya berisi nilai sama, tapi fieldState datang dari langganan
        per-field yang sama dengan yang memicu render — tidak ada celah di
        mana pesan error tertinggal satu render.
      */}
      <Controller
        name="name"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="Nama Pelanggan"
            autoFocus
            autoComplete="off"
            placeholder="Budi Santoso"
            error={fieldState.error?.message}
          />
        )}
      />

      <Controller
        name="whatsapp"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="Nomor WhatsApp"
            inputMode="tel"
            autoComplete="off"
            placeholder="081234567890"
            hint="Boleh ditulis 0812..., 62812..., atau +62 812..."
            error={fieldState.error?.message}
          />
        )}
      />

      <Controller
        name="note"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="Catatan (opsional)"
            autoComplete="off"
            placeholder="Langganan kaos komunitas"
            error={fieldState.error?.message}
          />
        )}
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
