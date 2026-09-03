import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Alert, Button, ConfirmDialog, TextField } from "@/shared/components/ui";
import { selesaiDesainSchema } from "../schemas/order.schema";

/**
 * Form "Selesai Desain" — dipakai layar Desain saat memajukan order dari
 * ANTRI_DESAIN ke antrian produksi (cetak/cutting/sublim).
 *
 * Di sinilah file_count & total_qty diisi: designer yang membuka file kiriman
 * pelanggan (lewat WhatsApp) tahu berapa file efektif dan berapa total potong
 * yang harus diproduksi. Keduanya wajib — backend menolak transisi keluar
 * ANTRI_DESAIN tanpa angka ini, karena setelah masuk produksi tidak ada lagi
 * titik pengisian di alur normal. Catatan tetap opsional untuk operator.
 *
 * Setelah validasi lolos, dialog konfirmasi ditampilkan agar operator bisa
 * mengecek ulang data sebelum benar-benar mengirim ke backend.
 */
export function SelesaiDesainForm({
  order,
  onSubmit,
  onCancel,
  isSubmitting = false,
  errorMessage,
  errorDetails = [],
}) {
  // Data yang sudah lolos validasi, menunggu konfirmasi user.
  const [pendingData, setPendingData] = useState(null);

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

  // Langkah 1: validasi form → simpan data & buka dialog konfirmasi.
  const mintaKonfirmasi = (data) => setPendingData(data);

  // Langkah 2: user konfirmasi → kirim ke parent.
  const konfirmasi = () => {
    if (pendingData) onSubmit(pendingData);
  };

  return (
    <>
      <form noValidate onSubmit={handleSubmit(mintaKonfirmasi)} className="flex flex-col gap-4">
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

      {/* Dialog konfirmasi — muncul setelah validasi lolos, sebelum data
          benar-benar dikirim ke backend. Memberi kesempatan operator mengecek
          ringkasan data yang diisi. */}
      <ConfirmDialog
        open={!!pendingData}
        title="Konfirmasi Selesai Desain"
        description={
          order
            ? `Pastikan data berikut sudah benar untuk order ${order.kode_order}.`
            : "Pastikan data berikut sudah benar."
        }
        confirmLabel="Ya, Selesaikan"
        cancelLabel="Periksa Lagi"
        isLoading={isSubmitting}
        errorMessage={errorMessage}
        onConfirm={konfirmasi}
        onCancel={() => setPendingData(null)}
      >
        {pendingData && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-slate-500">Jumlah File</dt>
            <dd className="font-medium text-slate-900">{pendingData.file_count}</dd>

            <dt className="text-slate-500">Total Qty</dt>
            <dd className="font-medium text-slate-900">{pendingData.total_qty} pcs</dd>

            {pendingData.catatan && (
              <>
                <dt className="text-slate-500">Catatan</dt>
                <dd className="font-medium text-slate-900">{pendingData.catatan}</dd>
              </>
            )}
          </dl>
        )}
      </ConfirmDialog>
    </>
  );
}
