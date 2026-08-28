import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Alert, Button, SelectField, TextField } from "@/shared/components/ui";
import { ALUR, STATUS_LABEL } from "../constants/order.constants";
import { StatusBadge } from "./StatusBadge";
import { koreksiStatusSchema } from "../schemas/order.schema";

/**
 * Form "Koreksi Status" — jalur pelarian ADMIN untuk salah klik.
 *
 * Berbeda dari Selesaikan (yang punya makna bisnis: catat uang), koreksi
 * memindahkan status secara manual: mundur karena keliru maju, atau lompat.
 * Karena itu:
 *   - Opsi status dibatasi ke ALUR jenis order ini (backend menolak status
 *     yang tak berlaku untuk jenis tsb), dan status SEKARANG dibuang dari
 *     opsi (backend balas 409 kalau sama).
 *   - Alasan WAJIB diisi — tiap koreksi terekam di riwayat.
 *
 * Peringatan khusus ditampilkan saat mengoreksi order yang sudah SELESAI:
 * backend akan menghapus selesai_at/harga/metode bayar (order keluar dari
 * rekap). Admin perlu tahu konsekuensi itu sebelum menyimpan.
 */
export function KoreksiStatusForm({
  order,
  onSubmit,
  onCancel,
  isSubmitting = false,
  errorMessage,
  errorDetails = [],
}) {
  const { control, handleSubmit } = useForm({
    resolver: yupResolver(koreksiStatusSchema),
    defaultValues: { status: "", catatan: "" },
  });

  // Status yang boleh dituju: sah untuk jenis order ini, minus status saat ini.
  const opsiStatus = (ALUR[order?.jenis] ?? [])
    .filter((s) => s !== order?.status)
    .map((s) => ({ value: s, label: STATUS_LABEL[s] ?? s }));

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      {order && (
        <p className="text-sm text-slate-600">
          Koreksi status order{" "}
          <strong className="font-semibold text-slate-900">
            {order.kode_order}
          </strong>
          . Status sekarang: <StatusBadge status={order.status} />
        </p>
      )}

      {order?.status === "SELESAI" && (
        <Alert
          tone="warning"
          title="Order ini sudah selesai."
          messages={[
            "Mengoreksi keluar dari Selesai akan menghapus catatan pembayaran (harga & metode bayar) dan mengeluarkannya dari rekap.",
          ]}
        />
      )}

      {errorMessage && (
        <Alert tone="error" title={errorMessage} messages={errorDetails} />
      )}

      <Controller
        name="status"
        control={control}
        render={({ field, fieldState }) => (
          <SelectField
            {...field}
            label="Status Tujuan"
            placeholder="Pilih status"
            options={opsiStatus}
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
            label="Alasan Koreksi"
            autoComplete="off"
            placeholder="mis. keliru tandai selesai, order belum diambil"
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
          {isSubmitting ? "Menyimpan..." : "Koreksi Status"}
        </Button>
      </div>
    </form>
  );
}
