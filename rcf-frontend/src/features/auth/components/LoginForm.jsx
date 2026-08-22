import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Alert, Button, TextField } from "@/shared/components/ui";
import { loginSchema } from "../schemas/auth.schema";

/**
 * Form login murni presentational: tidak tahu soal router maupun context.
 * Semua efek samping (redirect, simpan token) urusan pemanggilnya.
 *
 * Props:
 *   onSubmit(values)  -> dipanggil dengan { identifier, password }
 *   isSubmitting      -> status loading dari mutation
 *   errorMessage      -> pesan error dari server (bukan validasi lokal)
 *   errorDetails      -> array pesan detail dari backend (field errors)
 */
export function LoginForm({
  onSubmit,
  isSubmitting = false,
  errorMessage,
  errorDetails = [],
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
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

      <TextField
        label="Username atau Email"
        autoComplete="username"
        autoFocus
        placeholder="admin"
        error={errors.identifier?.message}
        {...register("identifier")}
      />

      <TextField
        label="Password"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        error={errors.password?.message}
        {...register("password")}
      />

      <Button type="submit" size="lg" isLoading={isSubmitting}>
        {isSubmitting ? "Masuk..." : "Masuk"}
      </Button>
    </form>
  );
}
