import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Alert, Button, TextField } from "@/shared/components/ui";
import { editProfileSchema } from "../schemas/auth.schema";

/**
 * Form edit profil — presentational, tidak tahu soal router/context.
 *
 * Kunci fitur ini: endpoint backend PATCH (partial), jadi form HANYA
 * mengirim field yang benar-benar diubah user. dirtyFields dari
 * react-hook-form yang menentukannya; kalau tidak ada yang berubah,
 * onSubmit tidak dipanggil sama sekali (backend akan menolak body kosong
 * dengan 400, dan tidak ada gunanya request itu terkirim).
 *
 * Field dibungkus <Controller>. Perhatikan `values` (bukan defaultValues)
 * tetap dipakai: berbeda dari defaultValues yang hanya dibaca sekali,
 * `values` bersifat reaktif — begitu simpan berhasil dan user di
 * AuthContext diperbarui, form ikut menampilkan data baru dan isDirty
 * kembali false tanpa perlu reset manual. Kombinasi ini yang membuat
 * tombol Simpan otomatis mati lagi setelah sukses.
 *
 * Props:
 *   user           -> nilai awal { name, username, email }
 *   onSubmit(diff) -> dipanggil dengan HANYA field yang berubah
 *   isSubmitting   -> status loading mutation
 *   errorMessage   -> pesan error dari server
 *   errorDetails   -> array detail error dari server
 *   successMessage -> pesan sukses (dikontrol pemanggil)
 */
export function EditProfileForm({
  user,
  onSubmit,
  isSubmitting = false,
  errorMessage,
  errorDetails = [],
  successMessage,
}) {
  // Dipakai dua kali (values dan tombol Batal), jadi disatukan supaya
  // keduanya tidak bisa lepas sinkron.
  const nilaiDariUser = {
    name: user?.name ?? "",
    username: user?.username ?? "",
    email: user?.email ?? "",
  };

  const {
    control,
    handleSubmit,
    reset,
    formState: { dirtyFields, isDirty },
  } = useForm({
    resolver: yupResolver(editProfileSchema),
    values: nilaiDariUser,
  });

  const kirim = (values) => {
    // Ambil hanya field yang disentuh user.
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

      {successMessage && !errorMessage && (
        <Alert tone="success" title={successMessage} />
      )}

      <Controller
        name="name"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="Nama"
            autoComplete="name"
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
            autoComplete="username"
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
            autoComplete="email"
            error={fieldState.error?.message}
          />
        )}
      />

      <div className="flex items-center gap-2">
        <Button type="submit" isLoading={isSubmitting} disabled={!isDirty}>
          {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>

        <Button
          type="button"
          variant="secondary"
          disabled={!isDirty || isSubmitting}
          onClick={() => reset(nilaiDariUser)}
        >
          Batal
        </Button>
      </div>
    </form>
  );
}
