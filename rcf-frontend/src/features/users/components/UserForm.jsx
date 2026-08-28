import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Alert, Button, SelectField, TextField } from "@/shared/components/ui";
import { ROLE_LIST, ROLE_LABEL } from "@/shared/constants/roles";
import { createUserSchema, userSchema } from "../schemas/user.schema";

const ROLE_OPTIONS = ROLE_LIST.map((role) => ({
  value: role,
  label: ROLE_LABEL[role] ?? role,
}));

const STATUS_OPTIONS = [
  { value: "true", label: "Aktif" },
  { value: "false", label: "Nonaktif" },
];

/**
 * Form user, dipakai untuk tambah maupun ubah — mengikuti pola CustomerForm.
 *
 * Mode ditentukan oleh ada/tidaknya prop `user`:
 *   tidak ada  -> tambah: semua field + password dikirim
 *   ada        -> ubah: HANYA field yang berubah yang dikirim (PATCH partial)
 *
 * Perbedaan dari CustomerForm yang perlu diketahui:
 *
 * - Password hanya ada di mode tambah. Skemanya pun beda (createUserSchema
 *   vs userSchema), dipilih berdasarkan mode. Reset password punya form
 *   sendiri, jadi tidak ada field password di mode ubah.
 * - isActive di form berupa string "true"/"false" (karena <select> selalu
 *   string), lalu dikonversi ke boolean sebelum dikirim. Backend menerima
 *   boolean.
 *
 * Field dibungkus <Controller> (controlled), sama alasannya dengan form
 * lain: nilai dari luar pasti tercermin, dan `value` tidak boleh undefined.
 */
export function UserForm({
  user,
  onSubmit,
  onCancel,
  isSubmitting = false,
  errorMessage,
  errorDetails = [],
}) {
  const mode = user ? "ubah" : "tambah";

  const {
    control,
    handleSubmit,
    formState: { dirtyFields, isDirty },
  } = useForm({
    resolver: yupResolver(mode === "tambah" ? createUserSchema : userSchema),
    defaultValues: {
      name: user?.name ?? "",
      username: user?.username ?? "",
      email: user?.email ?? "",
      role: user?.role ?? "",
      // <select> bekerja dengan string; default aktif untuk user baru
      isActive: user ? String(user.isActive) : "true",
      ...(mode === "tambah" ? { password: "" } : {}),
    },
  });

  const kirim = (values) => {
    // isActive dipastikan boolean sebelum menyeberang ke API.
    //
    // Catatan: yupResolver sudah meng-coerce isActive dari string "<select>"
    // ("true"/"false") menjadi boolean lewat yup.boolean(). Jadi di sini
    // values.isActive BISA sudah berupa boolean, bukan string. Membandingkan
    // `=== "true"` saja salah: boolean true !== "true" -> selalu false, yang
    // membuat setiap user baru terkirim sebagai nonaktif. Terima kedua bentuk.
    const normalized = {
      ...values,
      isActive: values.isActive === true || values.isActive === "true",
    };

    if (mode === "tambah") {
      onSubmit(normalized);
      return;
    }

    // Ambil hanya field yang disentuh. isActive disimpan sebagai string di
    // form, jadi dirty-nya dinilai dari string; nilai yang dikirim tetap
    // boolean hasil konversi di atas.
    const diff = {};
    for (const field of Object.keys(dirtyFields)) {
      diff[field] = normalized[field];
    }

    if (Object.keys(diff).length === 0) return;

    onSubmit(diff);
  };

  return (
    <form noValidate onSubmit={handleSubmit(kirim)} className="flex flex-col gap-4">
      {errorMessage && (
        <Alert tone="error" title={errorMessage} messages={errorDetails} />
      )}

      <Controller
        name="name"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="Nama"
            autoFocus
            autoComplete="off"
            placeholder="Budi Santoso"
            error={fieldState.error?.message}
          />
        )}
      />

      <Controller
        name="username"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="Username"
            autoComplete="off"
            placeholder="budi"
            hint="Huruf kecil, angka, titik, garis bawah, tanda hubung."
            error={fieldState.error?.message}
          />
        )}
      />

      <Controller
        name="email"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="Email"
            type="email"
            autoComplete="off"
            placeholder="budi@rcfprint.com"
            error={fieldState.error?.message}
          />
        )}
      />

      {mode === "tambah" && (
        <Controller
          name="password"
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label="Password"
              type="password"
              autoComplete="new-password"
              hint="Minimal 6 karakter. Bisa diganti user setelah login."
              error={fieldState.error?.message}
            />
          )}
        />
      )}

      <Controller
        name="role"
        control={control}
        render={({ field, fieldState }) => (
          <SelectField
            {...field}
            label="Role"
            placeholder="Pilih role"
            options={ROLE_OPTIONS}
            error={fieldState.error?.message}
          />
        )}
      />

      <Controller
        name="isActive"
        control={control}
        render={({ field, fieldState }) => (
          <SelectField
            {...field}
            label="Status"
            options={STATUS_OPTIONS}
            hint="User nonaktif tidak bisa login."
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
              ? "Simpan User"
              : "Simpan Perubahan"}
        </Button>
      </div>
    </form>
  );
}
