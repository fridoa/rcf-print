import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Alert, Button, TextField } from "@/shared/components/ui";
import { selesaiDesainSchema } from "../schemas/order.schema";

/**
 * Form "Selesai Desain" — dipakai layar Desain saat memajukan order dari
 * ANTRI_DESAIN ke antrian produksi (cetak/cutting).
 *
 * Di sinilah file_count & total_qty diisi: designer yang membuka file kiriman
 * pelanggan (lewat WhatsApp) tahu berapa file efektif dan berapa total potong
 * yang harus diproduksi. Keduanya wajib — backend menolak transisi keluar
 * ANTRI_DESAIN tanpa angka ini, karena setelah masuk produksi tidak ada lagi
 * titik pengisian di alur normal. Catatan tetap opsional untuk operator.
 */
export function SelesaiDesainForm({
  order,
  onSubmit,
  onCancel,
  isSubmitting = false,
  errorMessage,
  errorDetails = [],
}) {
  const { control, handleSubmit } = useForm({
    resolver: yupResolver(selesaiDesainSchema),
    defaultValues: {
      // Order yang sudah pernah diisi (mis. dikoreksi balik ke ANTRI_DESAIN)
      // mempertahankan angka lamanya sebagai titik awal.
      file_count: order?.file_count ?? "",
      total_qty: order?.total_qty ?? "",
      catatan: "",
    },
  });

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {order && (
        <p className="text-sm text-slate-600">
          Order{" "}
          <strong className="font-semibold text-slate-900">
            {order.kode_order}
          </strong>{" "}
          akan maju ke antrian produksi.
        </p>
      )}

      {errorMessage && (
        <Alert tone="error" title={errorMessage} messages={errorDetails} />
      )}

      <Controller
        name="file_count"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="Jumlah File"
            type="number"
            min="1"
            inputMode="numeric"
            autoFocus
            placeholder="2"
            hint="Berapa file desain yang harus diproduksi."
            error={fieldState.error?.message}
          />
        )}
      />

      <Controller
        name="total_qty"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="Total Qty"
            type="number"
            min="1"
            inputMode="numeric"
            placeholder="24"
            hint="Total potong/pcs untuk order ini."
            error={fieldState.error?.message}
          />
        )}
      />

      <Controller
        name="catatan"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="Catatan (opsional)"
            autoComplete="off"
            placeholder="Catatan untuk operator produksi"
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

        <Button type="submit" isLoading={isSubmitting}>
          {isSubmitting ? "Menyimpan..." : "Selesai Desain"}
        </Button>
      </div>
    </form>
  );
}
