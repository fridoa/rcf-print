import { useForm } from "react-hook-form";
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
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, dirtyFields, isDirty },
  } = useForm({
    resolver: yupResolver(editProfileSchema),
    values: {
      name: user?.name ?? "",
      username: user?.username ?? "",
      email: user?.email ?? "",
    },
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

      <TextField
        label="Nama"
        autoComplete="name"
        error={errors.name?.message}
        {...register("name")}
      />

      <TextField
        label="Username"
        autoComplete="username"
        hint="Huruf kecil, angka, titik, garis bawah, tanda hubung."
        error={errors.username?.message}
        {...register("username")}
      />

      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />

      <div className="flex items-center gap-2">
        <Button type="submit" isLoading={isSubmitting} disabled={!isDirty}>
          {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>

        <Button
          type="button"
          variant="secondary"
          disabled={!isDirty || isSubmitting}
          onClick={() =>
            reset({
              name: user?.name ?? "",
              username: user?.username ?? "",
              email: user?.email ?? "",
            })
          }
        >
          Batal
        </Button>
      </div>
    </form>
  );
}
