import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Alert, Button, TextField } from "@/shared/components/ui";
import { changePasswordSchema } from "../schemas/auth.schema";

/**
 * Form ubah password — presentational.
 *
 * Nama field mengikuti backend apa adanya (oldPassword / newPassword /
 * confirmPassword) supaya values bisa dikirim langsung tanpa pemetaan.
 * confirmPassword ikut terkirim dan diverifikasi ulang di server; itu
 * memang disengaja (validator backend punya aturan oneOf sendiri).
 *
 * autoComplete diisi current-password / new-password supaya password
 * manager browser tidak salah menawarkan isian.
 *
 * Field dibungkus <Controller> (controlled). Untuk form ini ada satu
 * catatan khusus: nilai password sekarang hidup di state React, bukan
 * hanya di DOM. Praktis tidak mengubah tingkat keamanan (state React ada
 * di memori halaman yang sama, dan value input selalu bisa dibaca script
 * di origin ini), tapi berarti nilainya ikut muncul di React DevTools
 * saat form terbuka.
 */
export function ChangePasswordForm({
  onSubmit,
  isSubmitting = false,
  errorMessage,
  errorDetails = [],
  successMessage,
}) {
  const { control, handleSubmit } = useForm({
    resolver: yupResolver(changePasswordSchema),
    defaultValues: {
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      {errorMessage && (
        <Alert tone="error" title={errorMessage} messages={errorDetails} />
      )}

      {successMessage && !errorMessage && (
        <Alert tone="success" title={successMessage} />
      )}

      <Controller
        name="oldPassword"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="Password Lama"
            type="password"
            autoComplete="current-password"
            error={fieldState.error?.message}
          />
        )}
      />

      <Controller
        name="newPassword"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="Password Baru"
            type="password"
            autoComplete="new-password"
            hint="Minimal 6 karakter."
            error={fieldState.error?.message}
          />
        )}
      />

      <Controller
        name="confirmPassword"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="Konfirmasi Password Baru"
            type="password"
            autoComplete="new-password"
            error={fieldState.error?.message}
          />
        )}
      />

      <Button type="submit" isLoading={isSubmitting}>
        {isSubmitting ? "Menyimpan..." : "Ubah Password"}
      </Button>
    </form>
  );
}
