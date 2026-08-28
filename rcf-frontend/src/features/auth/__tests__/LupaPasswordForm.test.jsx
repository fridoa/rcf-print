import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderPlain } from "@/test/renderWithProviders";
import { LupaPasswordForm } from "@/features/auth";

describe("LupaPasswordForm", () => {
  it("menampilkan pesan wajib isi kalau disubmit kosong", async () => {
    renderPlain(<LupaPasswordForm onSubmit={vi.fn()} />);

    await userEvent.click(
      screen.getByRole("button", { name: /kirim instruksi reset/i })
    );

    expect(await screen.findByText(/email wajib diisi/i)).toBeInTheDocument();
  });

  it("menolak email dengan format salah", async () => {
    renderPlain(<LupaPasswordForm onSubmit={vi.fn()} />);

    await userEvent.type(screen.getByLabelText(/email/i), "bukan-email");
    await userEvent.click(
      screen.getByRole("button", { name: /kirim instruksi reset/i })
    );

    expect(
      await screen.findByText(/format email tidak valid/i)
    ).toBeInTheDocument();
  });

  it("meneruskan email (sudah trim + lowercase) saat submit", async () => {
    const onSubmit = vi.fn();
    renderPlain(<LupaPasswordForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/email/i), "  Budi@RCFPrint.com ");
    await userEvent.click(
      screen.getByRole("button", { name: /kirim instruksi reset/i })
    );

    await waitFor(() =>
      expect(onSubmit.mock.calls[0][0]).toMatchObject({
        email: "budi@rcfprint.com",
      })
    );
  });

  it("menampilkan pesan error server (mis. 429) inline", () => {
    renderPlain(
      <LupaPasswordForm
        onSubmit={vi.fn()}
        errorMessage="Terlalu banyak permintaan reset password. Coba lagi dalam 15 menit."
      />
    );

    expect(
      screen.getByText(/terlalu banyak permintaan reset password/i)
    ).toBeInTheDocument();
  });
});
