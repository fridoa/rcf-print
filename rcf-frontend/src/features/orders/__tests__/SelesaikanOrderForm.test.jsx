import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SelesaikanOrderForm } from "../components/SelesaikanOrderForm";

/**
 * Test komponen SelesaikanOrderForm secara terisolasi (tanpa provider) —
 * ini form presentational: harga + metode bayar untuk READY → SELESAI.
 */

const ORDER = { _id: "o1", kode_order: "DTF/220826/001", total_qty: 24 };

const renderForm = (props = {}) => {
  const semua = { onSubmit: vi.fn(), onCancel: vi.fn(), ...props };
  return { ...render(<SelesaikanOrderForm {...semua} />), props: semua };
};

describe("SelesaikanOrderForm", () => {
  it("menampilkan kode order yang akan diselesaikan", () => {
    renderForm({ order: ORDER });
    expect(screen.getByText("DTF/220826/001")).toBeInTheDocument();
  });

  it("menampilkan pemisah ribuan saat mengetik dan mengirim angka murni", async () => {
    const onSubmit = vi.fn();
    renderForm({ order: ORDER, onSubmit });

    const input = screen.getByLabelText(/total harga/i);
    await userEvent.type(input, "350000");

    // yang tampil sudah diformat "350.000", tapi value yang dikirim tetap angka
    expect(input).toHaveValue("350.000");

    await userEvent.selectOptions(screen.getByLabelText(/metode bayar/i), "CASH");
    await userEvent.click(
      screen.getByRole("button", { name: /selesaikan order/i })
    );

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ total_harga: 350000, metode_bayar: "CASH" })
      )
    );
  });

  it("menolak submit tanpa harga dan tanpa metode bayar", async () => {
    const onSubmit = vi.fn();
    renderForm({ order: ORDER, onSubmit });

    await userEvent.click(
      screen.getByRole("button", { name: /selesaikan order/i })
    );

    expect(await screen.findByText(/total harga wajib diisi/i)).toBeInTheDocument();
    expect(screen.getByText(/metode bayar wajib dipilih/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("mengabaikan karakter non-angka (tanda minus/huruf) pada harga", async () => {
    const onSubmit = vi.fn();
    renderForm({ order: ORDER, onSubmit });

    const input = screen.getByLabelText(/total harga/i);
    // input hanya menerima digit: "-5000abc" → "5000"
    await userEvent.type(input, "-5000abc");
    expect(input).toHaveValue("5.000");

    await userEvent.selectOptions(screen.getByLabelText(/metode bayar/i), "TRANSFER");
    await userEvent.click(
      screen.getByRole("button", { name: /selesaikan order/i })
    );

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ total_harga: 5000, metode_bayar: "TRANSFER" })
      )
    );
  });

  it("menampilkan pesan error server", () => {
    renderForm({ order: ORDER, errorMessage: "Order sudah selesai" });
    expect(screen.getByText("Order sudah selesai")).toBeInTheDocument();
  });

  it("memanggil onCancel saat Batal", async () => {
    const onCancel = vi.fn();
    renderForm({ order: ORDER, onCancel });
    await userEvent.click(screen.getByRole("button", { name: /^batal$/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
