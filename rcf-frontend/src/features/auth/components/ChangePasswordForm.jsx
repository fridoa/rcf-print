import { useForm } from "react-hook-form";
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
 */
export function ChangePasswordForm({
  onSubmit,
  isSubmitting = false,
  errorMessage,
  errorDetails = [],
  successMessage,
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
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

      <TextField
        label="Password Lama"
        type="password"
        autoComplete="current-password"
        error={errors.oldPassword?.message}
        {...register("oldPassword")}
      />

      <TextField
        label="Password Baru"
        type="password"
        autoComplete="new-password"
        hint="Minimal 6 karakter."
        error={errors.newPassword?.message}
        {...register("newPassword")}
      />

      <TextField
        label="Konfirmasi Password Baru"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      <Button type="submit" isLoading={isSubmitting}>
        {isSubmitting ? "Menyimpan..." : "Ubah Password"}
      </Button>
    </form>
  );
}
