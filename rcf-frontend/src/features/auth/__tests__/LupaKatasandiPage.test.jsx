import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { LupaKatasandiPage } from "@/features/auth";
import { authApi } from "@/features/auth/api/auth.api";
import { renderWithProviders } from "@/test/renderWithProviders";

/**
 * Halaman dispatcher lupa katasandi: /lupa-katasandi tanpa token = minta
 * email; ?token=... = form password baru. Route tunggal ini persis link
 * yang dikirim backend di email reset.
 */

// Mock di DEEP PATH api module — hook mengimpor authApi dari
// "../api/auth.api" langsung, jadi mock di barrel tidak menangkapnya.
vi.mock("@/features/auth/api/auth.api", () => ({
  authApi: {
    forgotPassword: vi.fn(),
    verifyOtp: vi.fn(),
    resetPassword: vi.fn(),
  },
}));

const renderDi = (path) =>
  renderWithProviders(<LupaKatasandiPage />, { routes: [path] });

describe("LupaKatasandiPage — langkah 1 (minta email)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it("menampilkan form email, bukan form password", () => {
    renderDi("/lupa-katasandi");

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(
      screen.queryByLabelText(/^password baru$/i)
    ).not.toBeInTheDocument();
  });

  it("sukses kirim -> lanjut ke form OTP (tanpa menjanjikan email terkirim)", async () => {
    authApi.forgotPassword.mockResolvedValue(
      "Jika email terdaftar, instruksi reset sudah dikirim."
    );
    renderDi("/lupa-katasandi");

    await userEvent.type(screen.getByLabelText(/email/i), "budi@rcfprint.com");
    await userEvent.click(
      screen.getByRole("button", { name: /kirim instruksi reset/i })
    );

    // form email hilang, digantikan form OTP — pesan instruksi generik,
    // tidak pernah menjanjikan "email terkirim ke alamat ini".
    expect(
      await screen.findByLabelText(/^kode otp$/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/kami mengirim kode 6 digit ke email anda/i)
    ).toBeInTheDocument();
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
  });

  it("error 429 dari server tampil inline di form", async () => {
    authApi.forgotPassword.mockRejectedValue({
      status: 429,
      message: "Terlalu banyak permintaan reset password. Coba lagi dalam 15 menit.",
      errors: [],
    });
    renderDi("/lupa-katasandi");

    await userEvent.type(screen.getByLabelText(/email/i), "budi@rcfprint.com");
    await userEvent.click(
      screen.getByRole("button", { name: /kirim instruksi reset/i })
    );

    expect(
      await screen.findByText(/terlalu banyak permintaan reset password/i)
    ).toBeInTheDocument();
  });
});

describe("LupaKatasandiPage — langkah 2 (token di URL)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
  });

  it("menampilkan form password baru, bukan form email", () => {
    renderDi("/lupa-katasandi?token=abc123");

    expect(screen.getByLabelText(/^password baru$/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
  });

  it("submit meneruskan token dari URL + password baru", async () => {
    authApi.resetPassword.mockResolvedValue(
      "Password berhasil direset, silakan login"
    );
    renderDi("/lupa-katasandi?token=abc123");

    await userEvent.type(screen.getByLabelText(/^password baru$/i), "rahasia123");
    await userEvent.type(
      screen.getByLabelText(/konfirmasi password baru/i),
      "rahasia123"
    );
    await userEvent.click(
      screen.getByRole("button", { name: /simpan password baru/i })
    );

    await waitFor(() =>
      expect(authApi.resetPassword).toHaveBeenCalledWith({
        token: "abc123",
        newPassword: "rahasia123",
      })
    );
  });

  it("token kosong (?token=) -> kembali ke form email, bukan form password", () => {
    renderDi("/lupa-katasandi?token=");

    // dispatcher memperlakukan token kosong sebagai "belum ada token":
    // minta email ulang, bukan form password yang pasti gagal 400.
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /simpan password baru/i })
    ).not.toBeInTheDocument();
  });
});
