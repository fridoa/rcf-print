import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderPlain } from "@/test/renderWithProviders";
import { ResetPasswordForm } from "@/features/auth";

describe("ResetPasswordForm", () => {
  it("menampilkan pesan wajib isi kalau disubmit kosong", async () => {
    renderPlain(<ResetPasswordForm onSubmit={vi.fn()} />);

    await userEvent.click(
      screen.getByRole("button", { name: /simpan password baru/i })
    );

    expect(
      await screen.findByText(/password baru wajib diisi/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/konfirmasi password wajib diisi/i)
    ).toBeInTheDocument();
  });

  it("menolak password baru di bawah 6 karakter", async () => {
    renderPlain(<ResetPasswordForm onSubmit={vi.fn()} />);

    await userEvent.type(screen.getByLabelText(/^password baru$/i), "abc");
    await userEvent.click(
      screen.getByRole("button", { name: /simpan password baru/i })
    );

    expect(
      await screen.findByText(/password baru minimal 6 karakter/i)
    ).toBeInTheDocument();
  });

  it("menolak konfirmasi yang tidak sama", async () => {
    renderPlain(<ResetPasswordForm onSubmit={vi.fn()} />);

    await userEvent.type(screen.getByLabelText(/^password baru$/i), "rahasia123");
    await userEvent.type(
      screen.getByLabelText(/konfirmasi password baru/i),
      "beda123"
    );
    await userEvent.click(
      screen.getByRole("button", { name: /simpan password baru/i })
    );

    expect(
      await screen.findByText(/konfirmasi password tidak sama/i)
    ).toBeInTheDocument();
  });

  it("meneruskan hanya newPassword (token urusan halaman)", async () => {
    const onSubmit = vi.fn();
    renderPlain(<ResetPasswordForm onSubmit={onSubmit} />);

    await userEvent.type(screen.getByLabelText(/^password baru$/i), "rahasia123");
    await userEvent.type(
      screen.getByLabelText(/konfirmasi password baru/i),
      "rahasia123"
    );
    await userEvent.click(
      screen.getByRole("button", { name: /simpan password baru/i })
    );

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      newPassword: "rahasia123",
    });
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty("token");
  });

  it("menampilkan pesan error token kedaluwarsa dari server", () => {
    renderPlain(
      <ResetPasswordForm
        onSubmit={vi.fn()}
        errorMessage="Token reset salah atau kedaluwarsa"
      />
    );

    expect(
      screen.getByText(/token reset salah atau kedaluwarsa/i)
    ).toBeInTheDocument();
  });
});
