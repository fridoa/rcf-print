import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Alert, Button, TextField } from "@/shared/components/ui";
import { resetPasswordSchema } from "../schemas/user.schema";

/**
 * Form reset password oleh admin. Isi Modal, bukan modal sendiri.
 *
 * Tidak meminta password lama (berbeda dari ChangePasswordForm milik user):
 * ini aksi admin terhadap user lain, admin tidak tahu password lama mereka.
 * Backend-nya pun endpoint terpisah (/users/:id/reset-password) tanpa
 * verifikasi password lama.
 *
 * Nama user disebut supaya admin tidak mereset password orang yang salah.
 * Field dibungkus <Controller> mengikuti pola form lain.
 */
export function ResetPasswordForm({
  user,
  onSubmit,
  onCancel,
  isSubmitting = false,
  errorMessage,
  errorDetails = [],
  successMessage,
}) {
  const { control, handleSubmit } = useForm({
    resolver: yupResolver(resetPasswordSchema),
    defaultValues: { newPassword: "" },
  });

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <p className="text-sm text-slate-600">
        Setel password baru untuk{" "}
        <strong className="font-semibold text-slate-900">{user?.name}</strong>
        {user?.username ? ` (${user.username})` : ""}.
      </p>

      {errorMessage && (
        <Alert tone="error" title={errorMessage} messages={errorDetails} />
      )}

      {successMessage && !errorMessage && (
        <Alert tone="success" title={successMessage} />
      )}

      <Controller
        name="newPassword"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="Password Baru"
            type="password"
            autoComplete="new-password"
            autoFocus
            hint="Minimal 6 karakter. Sampaikan ke user lewat kanal yang aman."
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
          Tutup
        </Button>

        <Button type="submit" isLoading={isSubmitting}>
          {isSubmitting ? "Menyimpan..." : "Reset Password"}
        </Button>
      </div>
    </form>
  );
}
