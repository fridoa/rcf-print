import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Alert,
  Button,
  CurrencyField,
  SelectField,
  TextField,
} from "@/shared/components/ui";
import {
  METODE_BAYAR_LIST,
  METODE_BAYAR_LABEL,
} from "../constants/order.constants";
import { selesaikanOrderSchema } from "../schemas/order.schema";

const METODE_OPTIONS = METODE_BAYAR_LIST.map((m) => ({
  value: m,
  label: METODE_BAYAR_LABEL[m] ?? m,
}));

/**
 * Form "Selesaikan Order" — READY → SELESAI, khusus ADMIN.
 *
 * Di sinilah harga masuk ke sistem (keputusan: harga diisi saat serah
 * terima, bukan saat order dibuat). Setelah ini order tercatat sebagai
 * pendapatan pada tanggal hari ini (selesai_at) untuk rekap.
 */
export function SelesaikanOrderForm({
  order,
  onSubmit,
  onCancel,
  isSubmitting = false,
  errorMessage,
  errorDetails = [],
}) {
  const { control, handleSubmit } = useForm({
    resolver: yupResolver(selesaikanOrderSchema),
    defaultValues: { total_harga: "", metode_bayar: "", catatan: "" },
  });

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {order && (
        <p className="text-sm text-slate-600">
          Serah terima order{" "}
          <strong className="font-semibold text-slate-900">
            {order.kode_order}
          </strong>
          {order.total_qty ? ` — ${order.total_qty} pcs` : ""}. Catat pembayaran
          untuk menyelesaikannya.
        </p>
      )}

      {errorMessage && (
        <Alert tone="error" title={errorMessage} messages={errorDetails} />
      )}

      <Controller
        name="total_harga"
        control={control}
        render={({ field, fieldState }) => (
          <CurrencyField
            {...field}
            label="Total Harga"
            autoFocus
            placeholder="0"
            hint="Nominal otomatis diberi pemisah ribuan (mis. 50.000)."
            error={fieldState.error?.message}
          />
        )}
      />

      <Controller
        name="metode_bayar"
        control={control}
        render={({ field, fieldState }) => (
          <SelectField
            {...field}
            label="Metode Bayar"
            placeholder="Pilih metode"
            options={METODE_OPTIONS}
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
            placeholder="Tambahkan catatan jika ada"
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
          {isSubmitting ? "Menyimpan..." : "Selesaikan Order"}
        </Button>
      </div>
    </form>
  );
}
