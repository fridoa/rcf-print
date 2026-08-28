import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomerForm } from "../components/CustomerForm";

// render biasa, bukan renderWithProviders: form ini tidak menyentuh
// router, react-query, maupun AuthContext. Membungkusnya dengan provider
// yang tidak dipakai hanya menyembunyikan dependensi tak sengaja
// kalau suatu saat ada yang menambahkannya.

/**
 * Test komponen form saja — tidak menyentuh react-query maupun API.
 * Tujuannya menguji hal-hal yang khusus muncul karena field dibungkus
 * <Controller> (controlled), yang tidak terlihat di test integrasi halaman.
 */

const BUDI = {
  _id: "c1",
  name: "Budi Santoso",
  whatsapp: "6281234567890",
  note: "Langganan kaos komunitas",
};

const renderForm = (props = {}) => {
  const semua = { onSubmit: vi.fn(), onCancel: vi.fn(), ...props };
  const hasil = render(<CustomerForm {...semua} />);

  return {
    ...hasil,
    // rerender bawaan RTL mengganti seluruh elemen root, jadi dibungkus
    // supaya prop yang tidak disebut tetap sama seperti render pertama.
    rerenderDengan: (patchProps) =>
      hasil.rerender(<CustomerForm {...semua} {...patchProps} />),
  };
};

describe("CustomerForm — field controlled", () => {
  it("menampilkan string kosong, bukan undefined, saat mode tambah", () => {
    renderForm();

    // Kalau defaultValues tidak mengisi ketiga field, `value` jadi undefined
    // dan React memperingatkan "uncontrolled input to be controlled".
    expect(screen.getByLabelText(/nama pelanggan/i)).toHaveValue("");
    expect(screen.getByLabelText(/nomor whatsapp/i)).toHaveValue("");
    expect(screen.getByLabelText(/catatan/i)).toHaveValue("");
  });

  it("tidak memunculkan peringatan controlled/uncontrolled dari React", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderForm();
    await userEvent.type(screen.getByLabelText(/nama pelanggan/i), "Dewi");

    const pesan = spy.mock.calls.flat().join(" ");
    expect(pesan).not.toMatch(/uncontrolled input to be controlled/i);

    spy.mockRestore();
  });

  it("mengisi nilai awal dari prop customer pada mode ubah", () => {
    renderForm({ customer: BUDI });

    expect(screen.getByLabelText(/nama pelanggan/i)).toHaveValue("Budi Santoso");
    expect(screen.getByLabelText(/nomor whatsapp/i)).toHaveValue("6281234567890");
    expect(screen.getByLabelText(/catatan/i)).toHaveValue(
      "Langganan kaos komunitas"
    );
  });

  it("mengosongkan catatan yang null tanpa menampilkan 'null'", () => {
    // Backend boleh mengirim note: null; Controller akan meneruskannya
    // apa adanya ke value kalau tidak dijaga di defaultValues.
    renderForm({ customer: { ...BUDI, note: null } });

    expect(screen.getByLabelText(/catatan/i)).toHaveValue("");
  });

  it("nilai yang diketik langsung tercermin di layar", async () => {
    renderForm();

    const input = screen.getByLabelText(/nama pelanggan/i);
    await userEvent.type(input, "Dewi Lestari");

    // Pada field controlled, apa yang tampil berasal dari state form.
    // Kalau onChange tidak tersambung, input akan tetap kosong.
    expect(input).toHaveValue("Dewi Lestari");
  });

  it("TIDAK ikut berubah saat prop customer diganti tanpa remount", () => {
    const { rerenderDengan } = renderForm({ customer: BUDI });

    rerenderDengan({ customer: { ...BUDI, _id: "c2", name: "Citra Dewi" } });

    // defaultValues hanya dibaca sekali saat useForm pertama dijalankan,
    // jadi mengganti prop saja tidak cukup — nilainya tetap Budi.
    //
    // Ini bukan bug selama Modal merender children di balik `{open && ...}`:
    // form di-unmount setiap dialog ditutup, jadi pelanggan berikutnya
    // selalu dapat form baru. Test ini mengunci ketergantungan itu —
    // kalau Modal diubah menjadi selalu merender children, dialog "Ubah"
    // akan menampilkan data pelanggan yang dipilih sebelumnya, dan test
    // ini yang akan menjelaskan kenapa.
    expect(screen.getByLabelText(/nama pelanggan/i)).toHaveValue("Budi Santoso");
  });
});

describe("CustomerForm — validasi", () => {
  it("menampilkan error per field dari fieldState dan tidak submit", async () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    await userEvent.click(
      screen.getByRole("button", { name: /simpan pelanggan/i })
    );

    expect(
      await screen.findByText(/nama pelanggan wajib diisi/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/nomor whatsapp wajib diisi/i)
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("menghubungkan error ke input lewat aria-invalid dan aria-describedby", async () => {
    renderForm();

    await userEvent.click(
      screen.getByRole("button", { name: /simpan pelanggan/i })
    );
    await screen.findByText(/nama pelanggan wajib diisi/i);

    const input = screen.getByLabelText(/nama pelanggan/i);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toContain("-error");
  });

  it("menghapus error setelah field diperbaiki", async () => {
    renderForm();

    await userEvent.click(
      screen.getByRole("button", { name: /simpan pelanggan/i })
    );
    await screen.findByText(/nama pelanggan wajib diisi/i);

    await userEvent.type(
      screen.getByLabelText(/nama pelanggan/i),
      "Dewi Lestari"
    );

    await waitFor(() =>
      expect(
        screen.queryByText(/nama pelanggan wajib diisi/i)
      ).not.toBeInTheDocument()
    );
  });

  it("menolak nomor yang tidak cocok pola tanpa memanggil onSubmit", async () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    await userEvent.type(screen.getByLabelText(/nama pelanggan/i), "Dewi Lestari");
    await userEvent.type(screen.getByLabelText(/nomor whatsapp/i), "12345");
    await userEvent.click(
      screen.getByRole("button", { name: /simpan pelanggan/i })
    );

    expect(
      await screen.findByText(/nomor whatsapp tidak valid/i)
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("CustomerForm — payload yang dikirim", () => {
  it("mode tambah mengirim semua field apa adanya", async () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });

    await userEvent.type(screen.getByLabelText(/nama pelanggan/i), "Dewi Lestari");
    await userEvent.type(
      screen.getByLabelText(/nomor whatsapp/i),
      "0857-1111-2222"
    );
    await userEvent.click(
      screen.getByRole("button", { name: /simpan pelanggan/i })
    );

    // normalisasi nomor tugas backend — FE tidak boleh menebaknya
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        name: "Dewi Lestari",
        whatsapp: "0857-1111-2222",
        note: "",
      })
    );
  });

  it("mode ubah hanya mengirim field yang tersentuh", async () => {
    const onSubmit = vi.fn();
    renderForm({ customer: BUDI, onSubmit });

    const input = screen.getByLabelText(/nama pelanggan/i);
    await userEvent.clear(input);
    await userEvent.type(input, "Budi Santoso Jaya");
    await userEvent.click(
      screen.getByRole("button", { name: /simpan perubahan/i })
    );

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ name: "Budi Santoso Jaya" })
    );
  });

  it("mengirim catatan kosong sebagai string kosong saat dihapus", async () => {
    const onSubmit = vi.fn();
    renderForm({ customer: BUDI, onSubmit });

    await userEvent.clear(screen.getByLabelText(/catatan/i));
    await userEvent.click(
      screen.getByRole("button", { name: /simpan perubahan/i })
    );

    // "" berbeda dari "tidak dikirim" — admin sengaja menghapus catatannya.
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ note: "" }));
  });

  it("tombol simpan mati sebelum ada perubahan di mode ubah", () => {
    renderForm({ customer: BUDI });

    expect(
      screen.getByRole("button", { name: /simpan perubahan/i })
    ).toBeDisabled();
  });

  it("tombol simpan hidup setelah ada perubahan", async () => {
    renderForm({ customer: BUDI });

    await userEvent.type(screen.getByLabelText(/catatan/i), " tambahan");

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /simpan perubahan/i })
      ).toBeEnabled()
    );
  });
});

describe("CustomerForm — status submit dan error server", () => {
  it("menonaktifkan kedua tombol saat isSubmitting", () => {
    renderForm({ isSubmitting: true });

    expect(screen.getByRole("button", { name: /menyimpan/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^batal$/i })).toBeDisabled();
  });

  it("menampilkan pesan error server beserta detailnya", () => {
    renderForm({
      errorMessage: "Nomor WhatsApp sudah terdaftar",
      errorDetails: ["whatsapp sudah digunakan"],
    });

    expect(screen.getByText("Nomor WhatsApp sudah terdaftar")).toBeInTheDocument();
    expect(screen.getByText("whatsapp sudah digunakan")).toBeInTheDocument();
  });

  it("tidak mengosongkan isian saat error server muncul", async () => {
    const { rerenderDengan } = renderForm();

    await userEvent.type(screen.getByLabelText(/nama pelanggan/i), "Budi Kedua");

    // Setelah 409, halaman merender ulang form dengan errorMessage terisi.
    // Form tidak di-unmount, jadi isiannya harus tetap ada — itu yang
    // membuat admin bisa memperbaiki nomornya saja tanpa mengetik ulang.
    rerenderDengan({ errorMessage: "Nomor WhatsApp sudah terdaftar" });

    expect(screen.getByText("Nomor WhatsApp sudah terdaftar")).toBeInTheDocument();
    expect(screen.getByLabelText(/nama pelanggan/i)).toHaveValue("Budi Kedua");
  });

  it("memanggil onCancel saat Batal diklik tanpa submit", async () => {
    const onCancel = vi.fn();
    const onSubmit = vi.fn();
    renderForm({ onCancel, onSubmit });

    await userEvent.click(screen.getByRole("button", { name: /^batal$/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
