import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Alert, Button, TextField } from "@/shared/components/ui";
import { lupaPasswordSchema } from "../schemas/auth.schema";

/**
 * Form langkah 1 lupa katasandi: minta email reset dikirim.
 * Presentational murni — mutasi & status di halaman pemanggil.
 *
 * Catatan pesan: server SELALU menjawab sukses generik (anti
 * user-enumeration), jadi jangan pernah menjanjikan "email terkirim ke
 * alamat ini" di UI; cukup instruksi generik yang sama untuk semua kasus.
 */
export function LupaPasswordForm({ onSubmit, isSubmitting = false, errorMessage }) {
  const { control, handleSubmit } = useForm({
    resolver: yupResolver(lupaPasswordSchema),
    defaultValues: { email: "" },
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      {errorMessage && <Alert tone="error" title={errorMessage} />}

      <Controller
        name="email"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="Email"
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="nama@perusahaan.com"
            error={fieldState.error?.message}
          />
        )}
      />

      <Button type="submit" size="lg" isLoading={isSubmitting}>
        {isSubmitting ? "Mengirim..." : "Kirim Instruksi Reset"}
      </Button>
    </form>
  );
}
