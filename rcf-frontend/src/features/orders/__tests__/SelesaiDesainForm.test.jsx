import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SelesaiDesainForm } from "../components/SelesaiDesainForm";

const ORDER = { _id: "o1", kode_order: "DTF/220826/001" };

const renderForm = (props = {}) =>
  render(<SelesaiDesainForm onSubmit={vi.fn()} onCancel={vi.fn()} {...props} />);

/**
 * SelesaiDesainForm sekarang hanya menandai desain selesai (file_count &
 * total_qty sudah ditetapkan saat order dibuat). Yang tersisa cuma catatan
 * opsional, jadi submit tanpa isian pun harus lolos.
 */
describe("SelesaiDesainForm", () => {
  it("tidak lagi menampilkan input file_count / total_qty", () => {
    renderForm({ order: ORDER });

    expect(screen.queryByLabelText(/jumlah file/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/total qty/i)).not.toBeInTheDocument();
  });

  it("bisa submit tanpa catatan (catatan opsional)", async () => {
    const onSubmit = vi.fn();
    renderForm({ order: ORDER, onSubmit });

    await userEvent.click(screen.getByRole("button", { name: /selesai desain/i }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });

  it("meneruskan catatan saat diisi", async () => {
    const onSubmit = vi.fn();
    renderForm({ order: ORDER, onSubmit });

    await userEvent.type(
      screen.getByLabelText(/catatan/i),
      "pakai kertas transfer B"
    );
    await userEvent.click(screen.getByRole("button", { name: /selesai desain/i }));

    await waitFor(() =>
      expect(onSubmit.mock.calls[0][0]).toMatchObject({
        catatan: "pakai kertas transfer B",
      })
    );
  });
});
