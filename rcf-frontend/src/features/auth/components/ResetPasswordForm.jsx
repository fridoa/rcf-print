import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Alert, Button, TextField } from "@/shared/components/ui";
import { resetPasswordSchema } from "../schemas/auth.schema";

/**
 * Form langkah 2 lupa katasandi: password baru (dibuka lewat link email
 * ber-token). Presentational murni; token dikelola halaman pemanggil.
 */
export function ResetPasswordForm({
  onSubmit,
  isSubmitting = false,
  errorMessage,
  errorDetails = [],
}) {
  const { control, handleSubmit } = useForm({
    resolver: yupResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
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

      <Controller
        name="newPassword"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="Password Baru"
            type="password"
            autoComplete="new-password"
            placeholder="Minimal 6 karakter"
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
            placeholder="Ulangi password baru"
            error={fieldState.error?.message}
          />
        )}
      />

      <Button type="submit" size="lg" isLoading={isSubmitting}>
        {isSubmitting ? "Menyimpan..." : "Simpan Password Baru"}
      </Button>
    </form>
  );
}
