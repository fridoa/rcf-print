import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Alert, Button, TextField } from "@/shared/components/ui";
import { selesaiDesainSchema } from "../schemas/order.schema";

/**
 * Form "Selesai Desain" — dipakai layar Desain saat memajukan order dari
 * ANTRI_DESAIN ke antrian produksi (cetak/cutting).
 *
 * file_count & total_qty TIDAK lagi diminta di sini: keduanya sudah tercatat
 * saat order dibuat (design_ids + total_qty). Sekarang memajukan status keluar
 * dari ANTRI_DESAIN hanya menandai bahwa desain sudah selesai — dengan catatan
 * opsional untuk operator produksi.
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
    defaultValues: { catatan: "" },
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
        name="catatan"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="Catatan (opsional)"
            autoComplete="off"
            autoFocus
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
