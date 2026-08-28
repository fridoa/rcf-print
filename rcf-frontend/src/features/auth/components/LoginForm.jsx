import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Link } from "react-router-dom";
import { Alert, Button, TextField } from "@/shared/components/ui";
import { ROUTES } from "@/shared/constants/routes";
import { loginSchema } from "../schemas/auth.schema";

/**
 * Form login murni presentational: tidak tahu soal router maupun context.
 * Semua efek samping (redirect, simpan token) urusan pemanggilnya.
 *
 * Field dibungkus <Controller> (controlled) mengikuti pola yang sama
 * dengan CustomerForm. Konsekuensi yang perlu diketahui:
 *
 * - `value` tidak boleh undefined, kalau tidak React memperingatkan
 *   "changing an uncontrolled input to be controlled". Karena itu
 *   defaultValues mengisi kedua field dengan string kosong.
 * - Error dibaca dari `fieldState`, bukan `errors` di formState. Isinya
 *   sama, tapi fieldState datang dari langganan per-field yang juga
 *   memicu render field itu — tidak ada celah pesan error tertinggal
 *   satu render.
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
  const { control, handleSubmit } = useForm({
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

      {/*
        `field` berisi { name, value, onChange, onBlur, ref } dan disebar ke
        TextField. TextField sudah forwardRef, jadi ref-nya sampai ke <input>
        dan react-hook-form tetap bisa memfokuskan field pertama yang error.
      */}
      <Controller
        name="identifier"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="Username atau Email"
            autoComplete="username"
            autoFocus
            placeholder="admin"
            error={fieldState.error?.message}
          />
        )}
      />

      <Controller
        name="password"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="Password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            error={fieldState.error?.message}
          />
        )}
      />

      <div className="flex justify-end">
        <Link
          to={ROUTES.lupaKatasandi}
          className="text-sm font-medium text-brand-600 hover:underline"
        >
          Lupa kata sandi?
        </Link>
      </div>

      <Button type="submit" size="lg" isLoading={isSubmitting}>
        {isSubmitting ? "Masuk..." : "Masuk"}
      </Button>
    </form>
  );
}
