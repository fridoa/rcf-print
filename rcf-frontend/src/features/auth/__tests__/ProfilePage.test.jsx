import { beforeEach, describe, expect, it, vi } from "vitest";
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

/** Route minimal; ProfilePage butuh user dari AuthProvider (restore /auth/me). */
function ProfileRoutes() {
  return (
    <Routes>
      <Route path="/profil" element={<ProfilePage />} />
      <Route path="/profil/ganti-password" element={<p>HALAMAN GANTI PASSWORD</p>} />
    </Routes>
  );
}

/** Render dengan sesi aktif: token di storage + /auth/me menjawab user. */
async function renderLoggedIn(user = USER_ADMIN) {
  localStorage.setItem("rcf.token", "tok-123");
  authApi.me.mockResolvedValue(user);

  const hasil = renderWithProviders(<ProfileRoutes />, { routes: ["/profil"] });

  // tunggu restore sesi selesai supaya form terisi nilai lama
  await waitFor(() =>
    expect(screen.getByLabelText(/^nama$/i)).toHaveValue(user.name)
  );

  return hasil;
}

describe("ProfilePage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
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
    await userEvent.click(screen.getByRole("button", { name: /simpan/i }));

    await waitFor(() =>
      expect(authApi.editProfile).toHaveBeenCalledWith({ name: "Admin Baru" })
    );
    // username & email tidak ikut walau nilainya ada di form
    expect(authApi.editProfile).toHaveBeenCalledTimes(1);
  });

  it("mengirim dua field sekaligus kalau dua-duanya diubah", async () => {
    authApi.editProfile.mockResolvedValue({
      ...USER_ADMIN,
      name: "Admin Baru",
      email: "admin2@rcfprint.com",
    });

    await renderLoggedIn();

    const inputNama = screen.getByLabelText(/^nama$/i);
    await userEvent.clear(inputNama);
    await userEvent.type(inputNama, "Admin Baru");

    const inputEmail = screen.getByLabelText(/^email$/i);
    await userEvent.clear(inputEmail);
    await userEvent.type(inputEmail, "admin2@rcfprint.com");

    await userEvent.click(screen.getByRole("button", { name: /simpan/i }));

    await waitFor(() =>
      expect(authApi.editProfile).toHaveBeenCalledWith({
        name: "Admin Baru",
        email: "admin2@rcfprint.com",
      })
    );
  });

  it("memperbarui nama user di context setelah sukses", async () => {
    authApi.editProfile.mockResolvedValue({ ...USER_ADMIN, name: "Admin Baru" });

    await renderLoggedIn();

    const inputNama = screen.getByLabelText(/^nama$/i);
    await userEvent.clear(inputNama);
    await userEvent.type(inputNama, "Admin Baru");
    await userEvent.click(screen.getByRole("button", { name: /simpan/i }));

    expect(
      await screen.findByText("Profil berhasil diperbarui")
    ).toBeInTheDocument();
    // form ikut menampilkan nilai terbaru dari context, bukan nilai lama
    expect(screen.getByLabelText(/^nama$/i)).toHaveValue("Admin Baru");
  });

  it("tombol simpan mati sebelum ada perubahan", async () => {
    await renderLoggedIn();

    expect(screen.getByRole("button", { name: /simpan/i })).toBeDisabled();
    expect(authApi.editProfile).not.toHaveBeenCalled();
  });

  it("menolak field kosong tanpa memanggil API", async () => {
    await renderLoggedIn();

    await userEvent.clear(screen.getByLabelText(/^nama$/i));
    await userEvent.click(screen.getByRole("button", { name: /simpan/i }));

    expect(await screen.findByText("Nama wajib diisi")).toBeInTheDocument();
    expect(authApi.editProfile).not.toHaveBeenCalled();
  });

  it("menolak format email salah tanpa memanggil API", async () => {
    await renderLoggedIn();

    const inputEmail = screen.getByLabelText(/^email$/i);
    await userEvent.clear(inputEmail);
    await userEvent.type(inputEmail, "bukan-email");
    await userEvent.click(screen.getByRole("button", { name: /simpan/i }));

    expect(
      await screen.findByText("Format email tidak valid")
    ).toBeInTheDocument();
    expect(authApi.editProfile).not.toHaveBeenCalled();
  });

  it("menampilkan pesan 409 dari server apa adanya", async () => {
    authApi.editProfile.mockRejectedValue({
      status: 409,
      message: "Username sudah dipakai user lain",
      errors: [],
    });

    await renderLoggedIn();

    const inputUsername = screen.getByLabelText(/^username$/i);
    await userEvent.clear(inputUsername);
    await userEvent.type(inputUsername, "budi");
    await userEvent.click(screen.getByRole("button", { name: /simpan/i }));

    expect(
      await screen.findByText("Username sudah dipakai user lain")
    ).toBeInTheDocument();
    // context tidak ikut berubah saat request gagal
    expect(screen.getByLabelText(/^nama$/i)).toHaveValue("Admin RCF");
  });

  it("tombol batal mengembalikan nilai form ke data awal", async () => {
    await renderLoggedIn();

    const inputNama = screen.getByLabelText(/^nama$/i);
    await userEvent.clear(inputNama);
    await userEvent.type(inputNama, "Coba Ganti");

    await userEvent.click(screen.getByRole("button", { name: /batal/i }));

    expect(screen.getByLabelText(/^nama$/i)).toHaveValue("Admin RCF");
    expect(screen.getByRole("button", { name: /simpan/i })).toBeDisabled();
  });

  it("menonaktifkan tombol selama request berjalan", async () => {
    let selesaikan;
    authApi.editProfile.mockImplementation(
      () => new Promise((resolve) => (selesaikan = resolve))
    );

    await renderLoggedIn();

    const inputNama = screen.getByLabelText(/^nama$/i);
    await userEvent.clear(inputNama);
    await userEvent.type(inputNama, "Admin Baru");
    await userEvent.click(screen.getByRole("button", { name: /simpan/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /menyimpan/i })).toBeDisabled()
    );

    selesaikan({ ...USER_ADMIN, name: "Admin Baru" });
    expect(
      await screen.findByText("Profil berhasil diperbarui")
    ).toBeInTheDocument();
  });

  it("menyediakan tautan ke halaman ubah password", async () => {
    await renderLoggedIn();

    await userEvent.click(screen.getByRole("link", { name: /ubah password/i }));

    expect(
      await screen.findByText("HALAMAN GANTI PASSWORD")
    ).toBeInTheDocument();
  });
});
