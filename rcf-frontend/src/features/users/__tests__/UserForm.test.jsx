import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserForm } from "../components/UserForm";
import { ROLES } from "@/shared/constants/roles";

/**
 * Test komponen UserForm saja — tidak menyentuh react-query, router, atau
 * AuthContext (form ini murni presentational). UserMutations.test.jsx yang
 * menguji alur lengkap lewat halaman.
 *
 * render biasa dipakai, bukan renderWithProviders: membungkus dengan
 * provider yang tidak dipakai hanya menyembunyikan dependensi tak sengaja.
 */

const USER = {
  _id: "u2",
  name: "Budi Desainer",
  username: "budi",
  email: "budi@rcfprint.com",
  role: ROLES.DESIGNER,
  isActive: true,
};

const renderForm = (props = {}) => {
  const semua = { onSubmit: vi.fn(), onCancel: vi.fn(), ...props };
  const hasil = render(<UserForm {...semua} />);
  return {
    ...hasil,
    rerenderDengan: (patch) =>
      hasil.rerender(<UserForm {...semua} {...patch} />),
  };
};

const isiWajib = async ({
  name = "User Baru",
  username = "userbaru",
  email = "userbaru@rcfprint.com",
  password = "rahasia123",
} = {}) => {
  await userEvent.type(screen.getByLabelText(/^nama$/i), name);
  await userEvent.type(screen.getByLabelText(/^username$/i), username);
  await userEvent.type(screen.getByLabelText(/^email$/i), email);
  if (password !== null) {
    await userEvent.type(screen.getByLabelText(/^password$/i), password);
  }
  await userEvent.selectOptions(screen.getByLabelText(/^role$/i), ROLES.PRODUKSI);
};

const submitTambah = () =>
  userEvent.click(screen.getByRole("button", { name: /simpan user/i }));

const submitUbah = () =>
  userEvent.click(screen.getByRole("button", { name: /simpan perubahan/i }));

describe("UserForm — mode tambah", () => {
  it("menampilkan field password hanya di mode tambah", () => {
    renderForm();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
  });

  it("field controlled mulai dari string kosong, bukan undefined", () => {
    renderForm();
    expect(screen.getByLabelText(/^nama$/i)).toHaveValue("");
    expect(screen.getByLabelText(/^username$/i)).toHaveValue("");
    expect(screen.getByLabelText(/^email$/i)).toHaveValue("");
    expect(screen.getByLabelText(/^password$/i)).toHaveValue("");
  });

  it("tidak memunculkan peringatan controlled/uncontrolled dari React", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderForm();
    await userEvent.type(screen.getByLabelText(/^nama$/i), "Budi");
    const pesan = spy.mock.calls.flat().join(" ");
    expect(pesan).not.toMatch(/uncontrolled input to be controlled/i);
    spy.mockRestore();
  });

  it("password bertipe password", () => {
    renderForm();
    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute(
      "type",
      "password"
    );
  });

  it("mengirim semua field dengan isActive dikonversi ke boolean", async () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    await isiWajib();
    await submitTambah();

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toEqual({
      name: "User Baru",
      username: "userbaru",
      email: "userbaru@rcfprint.com",
      password: "rahasia123",
      role: ROLES.PRODUKSI,
      isActive: true, // string "true" dari <select> dikonversi ke boolean
    });
  });

  it("bisa membuat user langsung nonaktif", async () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    await isiWajib();
    await userEvent.selectOptions(screen.getByLabelText(/^status$/i), "false");
    await submitTambah();

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].isActive).toBe(false);
  });

  it("menolak password kurang dari 6 karakter tanpa memanggil onSubmit", async () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    await isiWajib({ password: null });
    await userEvent.type(screen.getByLabelText(/^password$/i), "abc");
    await submitTambah();

    expect(
      await screen.findByText(/password minimal 6 karakter/i)
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("menolak role kosong", async () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    await userEvent.type(screen.getByLabelText(/^nama$/i), "User Baru");
    await userEvent.type(screen.getByLabelText(/^username$/i), "userbaru");
    await userEvent.type(
      screen.getByLabelText(/^email$/i),
      "userbaru@rcfprint.com"
    );
    await userEvent.type(screen.getByLabelText(/^password$/i), "rahasia123");
    // role dibiarkan pada placeholder ""
    await submitTambah();

    expect(await screen.findByText(/role wajib diisi/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("menolak username dengan karakter tidak valid", async () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    await userEvent.type(screen.getByLabelText(/^nama$/i), "User Baru");
    await userEvent.type(screen.getByLabelText(/^username$/i), "user baru!");
    await userEvent.type(
      screen.getByLabelText(/^email$/i),
      "userbaru@rcfprint.com"
    );
    await userEvent.type(screen.getByLabelText(/^password$/i), "rahasia123");
    await userEvent.selectOptions(
      screen.getByLabelText(/^role$/i),
      ROLES.PACKING
    );
    await submitTambah();

    expect(await screen.findByText(/username hanya boleh/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("memanggil onCancel saat Batal diklik", async () => {
    const onCancel = vi.fn();
    renderForm({ onCancel });
    await userEvent.click(screen.getByRole("button", { name: /^batal$/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe("UserForm — mode ubah", () => {
  it("tidak menampilkan field password", () => {
    renderForm({ user: USER });
    expect(screen.queryByLabelText(/^password$/i)).not.toBeInTheDocument();
  });

  it("mengisi field dari prop user (isActive sebagai string di select)", () => {
    renderForm({ user: USER });
    expect(screen.getByLabelText(/^nama$/i)).toHaveValue("Budi Desainer");
    expect(screen.getByLabelText(/^username$/i)).toHaveValue("budi");
    expect(screen.getByLabelText(/^email$/i)).toHaveValue("budi@rcfprint.com");
    expect(screen.getByLabelText(/^role$/i)).toHaveValue(ROLES.DESIGNER);
    expect(screen.getByLabelText(/^status$/i)).toHaveValue("true");
  });

  it("tombol simpan mati sebelum ada perubahan", () => {
    renderForm({ user: USER });
    expect(
      screen.getByRole("button", { name: /simpan perubahan/i })
    ).toBeDisabled();
  });

  it("mengirim hanya field yang diubah", async () => {
    const onSubmit = vi.fn();
    renderForm({ user: USER, onSubmit });

    const nama = screen.getByLabelText(/^nama$/i);
    await userEvent.clear(nama);
    await userEvent.type(nama, "Budi Senior");
    await submitUbah();

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ name: "Budi Senior" })
    );
  });

  it("mengirim isActive sebagai boolean saat status diubah", async () => {
    const onSubmit = vi.fn();
    renderForm({ user: USER, onSubmit });

    await userEvent.selectOptions(screen.getByLabelText(/^status$/i), "false");
    await submitUbah();

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ isActive: false })
    );
  });

  it("mengirim role sebagai perubahan tunggal", async () => {
    const onSubmit = vi.fn();
    renderForm({ user: USER, onSubmit });

    await userEvent.selectOptions(
      screen.getByLabelText(/^role$/i),
      ROLES.PRODUKSI
    );
    await submitUbah();

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ role: ROLES.PRODUKSI })
    );
  });

  it("menampilkan pesan error server beserta detail", () => {
    renderForm({
      user: USER,
      errorMessage: "Username sudah dipakai user lain",
      errorDetails: ["username bentrok"],
    });

    expect(
      screen.getByText("Username sudah dipakai user lain")
    ).toBeInTheDocument();
    expect(screen.getByText("username bentrok")).toBeInTheDocument();
  });

  it("tidak mengosongkan isian saat error server muncul", async () => {
    const { rerenderDengan } = renderForm({ user: USER });

    const nama = screen.getByLabelText(/^nama$/i);
    await userEvent.clear(nama);
    await userEvent.type(nama, "Budi Senior");

    rerenderDengan({ errorMessage: "Username sudah dipakai user lain" });

    expect(screen.getByLabelText(/^nama$/i)).toHaveValue("Budi Senior");
  });
});
