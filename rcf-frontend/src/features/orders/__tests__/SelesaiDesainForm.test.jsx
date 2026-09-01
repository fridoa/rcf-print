import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SelesaiDesainForm } from "../components/SelesaiDesainForm";

const ORDER = { _id: "o1", kode_order: "DTF/220826/001" };

const renderForm = (props = {}) =>
  render(<SelesaiDesainForm onSubmit={vi.fn()} onCancel={vi.fn()} {...props} />);

/**
 * SelesaiDesainForm adalah titik pengisian file_count & total_qty: designer
 * yang menentukan keduanya setelah membuka kiriman pelanggan. Keduanya wajib,
 * catatan tetap opsional.
 */
describe("SelesaiDesainForm", () => {
  it("mengirim file_count, total_qty, dan catatan", async () => {
    const onSubmit = vi.fn();
    renderForm({ order: ORDER, onSubmit });

    await userEvent.type(screen.getByLabelText(/jumlah file/i), "2");
    await userEvent.type(screen.getByLabelText(/total qty/i), "24");
    await userEvent.type(
      screen.getByLabelText(/catatan/i),
      "pakai kertas transfer B"
    );
    await userEvent.click(screen.getByRole("button", { name: /selesai desain/i }));

    await waitFor(() =>
      expect(onSubmit.mock.calls[0][0]).toMatchObject({
        file_count: 2,
        total_qty: 24,
        catatan: "pakai kertas transfer B",
      })
    );
  });

  it("bisa submit tanpa catatan (catatan opsional)", async () => {
    const onSubmit = vi.fn();
    renderForm({ order: ORDER, onSubmit });

    await userEvent.type(screen.getByLabelText(/jumlah file/i), "1");
    await userEvent.type(screen.getByLabelText(/total qty/i), "10");
    await userEvent.click(screen.getByRole("button", { name: /selesai desain/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it("menahan submit kalau jumlah file & total qty kosong", async () => {
    const onSubmit = vi.fn();
    renderForm({ order: ORDER, onSubmit });

    await userEvent.click(screen.getByRole("button", { name: /selesai desain/i }));

    expect(await screen.findByText(/jumlah file wajib diisi/i)).toBeInTheDocument();
    expect(screen.getByText(/total qty wajib diisi/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("menolak angka nol", async () => {
    const onSubmit = vi.fn();
    renderForm({ order: ORDER, onSubmit });

    await userEvent.type(screen.getByLabelText(/jumlah file/i), "0");
    await userEvent.type(screen.getByLabelText(/total qty/i), "0");
    await userEvent.click(screen.getByRole("button", { name: /selesai desain/i }));

    expect(await screen.findByText(/jumlah file minimal 1/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("mengisi ulang angka lama saat order sudah punya nilai", () => {
    renderForm({ order: { ...ORDER, file_count: 3, total_qty: 30 } });

    expect(screen.getByLabelText(/jumlah file/i)).toHaveValue(3);
    expect(screen.getByLabelText(/total qty/i)).toHaveValue(30);
  });
});
