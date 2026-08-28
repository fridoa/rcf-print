import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrderTimeline } from "../components/OrderTimeline";

/**
 * OrderTimeline presentational: fokus menampilkan siapa memproses tiap langkah.
 */

const LOGS = [
  {
    _id: "l1",
    status_dari: null, // event pembuatan
    status_ke: "ANTRI_DESAIN",
    user_id: { _id: "u1", name: "Admin RCF", role: "ADMIN" },
    catatan: "",
    createdAt: "2026-08-22T03:00:00.000Z",
  },
  {
    _id: "l2",
    status_dari: "ANTRI_DESAIN",
    status_ke: "ANTRI_CETAK",
    user_id: { _id: "u2", name: "Desi Desainer", role: "DESIGNER" },
    catatan: "file siap cetak",
    createdAt: "2026-08-22T05:30:00.000Z",
  },
];

describe("OrderTimeline", () => {
  it("menampilkan spinner saat loading", () => {
    render(<OrderTimeline logs={[]} isLoading />);
    expect(screen.getByText(/memuat riwayat/i)).toBeInTheDocument();
  });

  it("menampilkan pesan error", () => {
    render(
      <OrderTimeline logs={[]} error={{ message: "Gagal ambil riwayat" }} />
    );
    expect(screen.getByText("Gagal ambil riwayat")).toBeInTheDocument();
  });

  it("menampilkan pesan kosong saat belum ada riwayat", () => {
    render(<OrderTimeline logs={[]} />);
    expect(
      screen.getByText(/belum ada riwayat perubahan status/i)
    ).toBeInTheDocument();
  });

  it("menampilkan pelaku (nama + role) tiap langkah", () => {
    render(<OrderTimeline logs={LOGS} />);

    // pembuatan order
    expect(screen.getByText(/order dibuat/i)).toBeInTheDocument();
    expect(screen.getByText("Admin RCF")).toBeInTheDocument();
    expect(screen.getByText("ADMIN")).toBeInTheDocument();

    // langkah approve ke step berikutnya
    expect(screen.getByText("Desi Desainer")).toBeInTheDocument();
    expect(screen.getByText("DESIGNER")).toBeInTheDocument();
    // label status tujuan tampil (mapping dari konstanta)
    expect(screen.getByText("Antri Cetak")).toBeInTheDocument();
  });

  it("menampilkan catatan bila ada", () => {
    render(<OrderTimeline logs={LOGS} />);
    expect(screen.getByText(/file siap cetak/i)).toBeInTheDocument();
  });
});
