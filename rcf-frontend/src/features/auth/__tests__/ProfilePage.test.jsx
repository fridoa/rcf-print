import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { ProfilePage } from "@/features/auth";
import { renderWithProviders } from "@/test/renderWithProviders";

vi.mock("@/features/auth/api/auth.api", () => ({
  authApi: {
    login: vi.fn(),
    me: vi.fn(),
    editProfile: vi.fn(),
    changePassword: vi.fn(),
  },
}));

const { authApi } = await import("@/features/auth/api/auth.api");

const USER_ADMIN = {
  _id: "1",
  name: "Admin RCF",
  username: "admin",
  email: "admin@rcfprint.com",
  role: "ADMIN",
  isActive: true,
};

const PASSWORD_BARU = "rahasia123";

function ProfileRoutes() {
  return (
    <Routes>
      <Route path="/profil" element={<ProfilePage />} />
    </Routes>
  );
}

async function renderLoggedIn(user = USER_ADMIN) {
  localStorage.setItem("rcf.token", "tok-123");
  authApi.me.mockResolvedValue(user);

  const hasil = renderWithProviders(<ProfileRoutes />, { routes: ["/profil"] });

  await waitFor(() =>
    expect(screen.getByLabelText(/^nama$/i)).toHaveValue(user.name)
  );

  return hasil;
}

describe("ProfilePage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("mengisi form dengan data user yang sedang login", async () => {
    await renderLoggedIn();

    expect(screen.getByLabelText(/^username$/i)).toHaveValue("admin");
    expect(screen.getByLabelText(/^email$/i)).toHaveValue("admin@rcfprint.com");
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("hanya mengirim field yang diubah (PATCH partial)", async () => {
    authApi.editProfile.mockResolvedValue({ ...USER_ADMIN, name: "Admin Baru" });

    await renderLoggedIn();

    const inputNama = screen.getByLabelText(/^nama$/i);
    await userEvent.clear(inputNama);
    await userEvent.type(inputNama, "Admin Baru");
    await userEvent.click(screen.getByRole("button", { name: /^simpan perubahan$/i }));

    await waitFor(() =>
      expect(authApi.editProfile).toHaveBeenCalledWith({ name: "Admin Baru" })
    );
    expect(authApi.editProfile).toHaveBeenCalledTimes(1);
  });

  it("tombol simpan mati sebelum ada perubahan", async () => {
    await renderLoggedIn();

    expect(
      screen.getByRole("button", { name: /^simpan perubahan$/i })
    ).toBeDisabled();
    expect(authApi.editProfile).not.toHaveBeenCalled();
  });

  it("menolak field kosong tanpa memanggil API", async () => {
    await renderLoggedIn();

    await userEvent.clear(screen.getByLabelText(/^nama$/i));
    await userEvent.click(
      screen.getByRole("button", { name: /^simpan perubahan$/i })
    );

    expect(await screen.findByText("Nama wajib diisi")).toBeInTheDocument();
    expect(authApi.editProfile).not.toHaveBeenCalled();
  });

  it("menampilkan kartu identitas: inisial avatar, @username, role, status", async () => {
    await renderLoggedIn();

    expect(screen.getByText("AR")).toBeInTheDocument();
    expect(screen.getByText("@admin")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Aktif")).toBeInTheDocument();
  });

  it("menandai akun nonaktif dengan badge berbeda", async () => {
    await renderLoggedIn({ ...USER_ADMIN, isActive: false });

    expect(screen.getByText("Tidak aktif")).toBeInTheDocument();
    expect(screen.queryByText("Aktif")).not.toBeInTheDocument();
  });

  it("tombol Ubah Password membuka panel inline (bukan navigasi)", async () => {
    await renderLoggedIn();

    // panel tertutup: tidak ada input password di DOM
    expect(
      screen.queryByLabelText(/^password lama$/i)
    ).not.toBeInTheDocument();

    const tombol = screen.getByRole("button", { name: /ubah password/i });
    expect(tombol).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(tombol);

    expect(await screen.findByLabelText(/^password lama$/i)).toBeInTheDocument();
    expect(tombol).toHaveAttribute("aria-expanded", "true");
  });

  it("mengganti password lewat panel inline dan mereset form", async () => {
    authApi.changePassword.mockResolvedValue({});

    await renderLoggedIn();
    await userEvent.click(
      screen.getByRole("button", { name: /ubah password/i })
    );

    await userEvent.type(
      await screen.findByLabelText(/^password lama$/i),
      "passwordLama"
    );
    await userEvent.type(
      screen.getByLabelText(/^password baru$/i),
      PASSWORD_BARU
    );
    await userEvent.type(
      screen.getByLabelText(/^konfirmasi password baru$/i),
      PASSWORD_BARU
    );
    await userEvent.click(
      screen.getByRole("button", { name: /^ubah password$/i, exact: true })
    );

    await waitFor(() =>
      expect(authApi.changePassword).toHaveBeenCalledWith({
        oldPassword: "passwordLama",
        newPassword: PASSWORD_BARU,
        confirmPassword: PASSWORD_BARU,
      })
    );
    expect(
      await screen.findByText("Password berhasil diubah")
    ).toBeInTheDocument();
  });
});