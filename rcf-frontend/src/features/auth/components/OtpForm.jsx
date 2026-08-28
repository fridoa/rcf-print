import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { Alert, Button, TextField } from "@/shared/components/ui";

/**
 * Form langkah 2: input kode OTP 6 digit yang dikirim ke email.
 *
 * Dibuat polos (satu TextField) daripada 6 kotak terpisah: kotak-kotak
 * butuh logika pindah-fokus & paste yang rawan bug di mobile, sementara
 * inputType=numeric + maxLength di satu kolom memberi UX hampir sama
 * (autofokus + numeric keyboard di HP) tanpa kompleksitas.
 */
const otpSchema = yup.object({
  otp: yup
    .string()
    .required("Kode OTP wajib diisi")
    .trim()
    .matches(/^\d{6}$/, "Kode OTP harus 6 digit angka"),
});

export function OtpForm({
  onSubmit,
  isSubmitting = false,
  errorMessage,
  errorDetails = [],
}) {
  const { control, handleSubmit } = useForm({
    resolver: yupResolver(otpSchema),
    defaultValues: { otp: "" },
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
        name="otp"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="Kode OTP"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={6}
            placeholder="6 digit dari email"
            error={fieldState.error?.message}
          />
        )}
      />

      <Button type="submit" size="lg" isLoading={isSubmitting}>
        {isSubmitting ? "Memeriksa..." : "Verifikasi Kode"}
      </Button>
    </form>
  );
}
