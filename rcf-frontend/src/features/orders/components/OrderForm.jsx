import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Alert, Button, SelectField, TextField } from "@/shared/components/ui";
import { formatWhatsapp } from "@/shared/lib/phone";
import { DesignPicker } from "@/features/designs";
import { JENIS_LIST, JENIS_LABEL } from "../constants/order.constants";
import { createOrderSchema } from "../schemas/order.schema";
import { CustomerPicker } from "./CustomerPicker";

const JENIS_OPTIONS = JENIS_LIST.map((j) => ({
  value: j,
  label: JENIS_LABEL[j] ?? j,
}));

/**
 * Form buat order baru / edit order yang ada (khusus ADMIN).
 *
 * Alur data (cerminan createOrderSchema / updateOrderSchema backend):
 *   - Pelanggan di-resolve ke customer_id lebih dulu oleh CustomerPicker
 *     (pelanggan baru dibuat di sana). customer_id ini juga kunci galeri desain.
 *   - design_ids: minimal 1 desain dipilih dari galeri pelanggan lewat
 *     DesignPicker. file_count TIDAK dikirim — backend menurunkannya.
 *   - total_qty: diisi admin di sini (qty diketahui sejak awal).
 *
 * Harga TIDAK di sini — admin mengisinya saat serah terima (READY → SELESAI).
 */
export function OrderForm({
  order,
  onSubmit,
  onCancel,
  isSubmitting = false,
  errorMessage,
  errorDetails = [],
}) {
  const isEdit = Boolean(order);

  const initialCustomerId =
    typeof order?.customer_id === "object"
      ? order.customer_id?._id
      : order?.customer_id ?? "";

  const initialSelection =
    typeof order?.customer_id === "object" && order.customer_id
      ? {
          customer_id: order.customer_id._id,
          label: `${order.customer_id.name} (${formatWhatsapp(
            order.customer_id.whatsapp
          )})`,
        }
      : undefined;

  const initialDesignIds = Array.isArray(order?.design_ids)
    ? order.design_ids.map((d) => (typeof d === "object" ? d._id : d))
    : [];

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(createOrderSchema),
    defaultValues: {
      customer_id: initialCustomerId,
      _selection: initialSelection,
      design_ids: initialDesignIds,
      total_qty: order?.total_qty ?? "",
      jenis: order?.jenis ?? "",
      deadline: order?.deadline ? order.deadline.slice(0, 10) : "",
      catatan: order?.catatan ?? "",
    },
  });


  // Label pilihan pelanggan hidup di field bantu non-schema supaya ikut
  // ter-reset saat form di-remount (Modal me-remount tiap dibuka).
  const selection = watch("_selection");
  const customerId = watch("customer_id");
  const designIds = watch("design_ids");

  const setSelection = (payload) => {
    // payload: { customer_id, label } | null
    setValue("_selection", payload ?? undefined, { shouldValidate: false });
    setValue("customer_id", payload?.customer_id ?? "", {
      shouldValidate: true,
    });
    // Ganti pelanggan → galeri berbeda, kosongkan desain yang sebelumnya dipilih.
    setValue("design_ids", [], { shouldValidate: false });
  };

  const setDesignIds = (ids) => {
    setValue("design_ids", ids, { shouldValidate: true });
  };

  const kirim = (values) => {
    const payload = {
      customer_id: values.customer_id,
      design_ids: values.design_ids,
      total_qty: values.total_qty,
      jenis: values.jenis,
      catatan: values.catatan,
    };
    if (values.deadline) payload.deadline = values.deadline;
    onSubmit(payload);
  };

  return (
    <form noValidate onSubmit={handleSubmit(kirim)} className="flex flex-col gap-4">
      {errorMessage && (
        <Alert tone="error" title={errorMessage} messages={errorDetails} />
      )}

      <CustomerPicker
        selection={selection}
        onChange={setSelection}
        error={errors.customer_id?.message}
      />

      <DesignPicker
        customerId={customerId}
        value={designIds}
        onChange={setDesignIds}
        error={errors.design_ids?.message}
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
        name="jenis"
        control={control}
        render={({ field, fieldState }) => (
          <SelectField
            {...field}
            label="Jenis Sablon"
            placeholder="Pilih jenis"
            options={JENIS_OPTIONS}
            hint="Menentukan nomor order (DTF/PLF) dan alur produksinya."
            error={fieldState.error?.message}
          />
        )}
      />

      <Controller
        name="deadline"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="Deadline (opsional)"
            type="date"
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
            placeholder="Bahan kaos, warna, dsb"
            autoComplete="off"
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
          {isSubmitting
            ? "Menyimpan..."
            : isEdit
            ? "Simpan Perubahan"
            : "Simpan Order"}
        </Button>
      </div>

    </form>
  );
}
