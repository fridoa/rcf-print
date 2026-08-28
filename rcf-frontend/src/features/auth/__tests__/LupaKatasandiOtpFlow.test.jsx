import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LupaKatasandiPage } from "@/features/auth";
import { authApi } from "@/features/auth/api/auth.api";
import { renderWithProviders } from "@/test/renderWithProviders";

/**
 * Alur OTP lengkap di satu halaman:
 * email -> panel OTP -> tukar token -> form password -> sukses.
 * Mock di deep path api module (hook impor dari sana, bukan barrel).
 */

vi.mock("@/features/auth/api/auth.api", () => ({
  authApi: {
    forgotPassword: vi.fn(),
    verifyOtp: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

const renderDi = (path = "/lupa-katasandi") =>
  renderWithProviders(<LupaKatasandiPage />, { routes: [path] });

describe("LupaKatasandiPage — alur OTP", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  // alur 3 langkah + banyak typing: butuh ruang lebih dari default 5 dtk
  // saat suite penuh berjalan paralel.
  it("lengkap: email -> OTP -> password baru dengan token hasil tukar OTP", { timeout: 15000 }, async () => {
    authApi.forgotPassword.mockResolvedValue("Jika email terdaftar...");
    authApi.verifyOtp.mockResolvedValue({ resetToken: "token_dari_otp" });
    authApi.resetPassword.mockResolvedValue("Password berhasil direset");

    renderDi();

    // langkah 1
    await userEvent.type(screen.getByLabelText(/^email$/i), "budi@rcfprint.com");
    await userEvent.click(
      screen.getByRole("button", { name: /kirim instruksi reset/i })
    );

    // langkah 2: form OTP muncul
    expect(
      await screen.findByText(/masukkan kode otp/i)
    ).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/^kode otp$/i), "123456");
    await userEvent.click(
      screen.getByRole("button", { name: /verifikasi kode/i })
    );

    // langkah 3: form password muncul, submit pakai token hasil OTP
    expect(
      await screen.findByLabelText(/^password baru$/i)
    ).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/^password baru$/i), "rahasia123");
    await userEvent.type(
      screen.getByLabelText(/^konfirmasi password baru$/i),
      "rahasia123"
    );
    await userEvent.click(
      screen.getByRole("button", { name: /simpan password baru/i })
    );

    await waitFor(() =>
      expect(authApi.resetPassword).toHaveBeenCalledWith({
        token: "token_dari_otp",
        newPassword: "rahasia123",
      })
    );
    expect(
      await screen.findByText(/password berhasil direset/i)
    ).toBeInTheDocument();
  });

  it("OTP salah -> pesan error inline, tetap di form OTP", async () => {
    authApi.forgotPassword.mockResolvedValue("Jika email terdaftar...");
    authApi.verifyOtp.mockRejectedValue({
      status: 400,
      message: "Kode OTP salah atau kedaluwarsa",
      errors: [],
    });

    renderDi();

    await userEvent.type(screen.getByLabelText(/^email$/i), "budi@rcfprint.com");
    await userEvent.click(
      screen.getByRole("button", { name: /kirim instruksi reset/i })
    );

    await userEvent.type(
      await screen.findByLabelText(/^kode otp$/i),
      "000000"
    );
    await userEvent.click(
      screen.getByRole("button", { name: /verifikasi kode/i })
    );

    expect(
      await screen.findByText(/kode otp salah atau kedaluwarsa/i)
    ).toBeInTheDocument();
    // masih di langkah OTP, belum pindah ke form password
    expect(
      screen.queryByLabelText(/^password baru$/i)
    ).not.toBeInTheDocument();
  });

  it("kirim ulang: kembali ke form email dari panel OTP", async () => {
    authApi.forgotPassword.mockResolvedValue("Jika email terdaftar...");

    renderDi();

    await userEvent.type(screen.getByLabelText(/^email$/i), "budi@rcfprint.com");
    await userEvent.click(
      screen.getByRole("button", { name: /kirim instruksi reset/i })
    );

    await screen.findByLabelText(/^kode otp$/i);
    await userEvent.click(
      screen.getByRole("button", { name: /kembali — kirim ulang/i })
    );

    // balik ke langkah 1
    expect(await screen.findByLabelText(/^email$/i)).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/^kode otp$/i)
    ).not.toBeInTheDocument();
  });

  it("tautan email (?token=) langsung ke form password, melewati OTP", () => {
    authApi.forgotPassword.mockResolvedValue("x");
    renderDi("/lupa-katasandi?token=abc123");

    expect(screen.getByLabelText(/^password baru$/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^kode otp$/i)).not.toBeInTheDocument();
  });
});
