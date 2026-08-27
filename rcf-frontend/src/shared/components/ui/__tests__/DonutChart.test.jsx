import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DonutChart } from "../DonutChart";
import { BarList } from "../BarList";

/**
 * Test komponen chart SVG. Karena murni presentational, cukup render langsung
 * tanpa provider. Fokus: label/nilai muncul, dan state kosong ditangani.
 */
describe("DonutChart", () => {
  const data = [
    { label: "Antri Desain", value: 3, color: "#f59e0b" },
    { label: "Packing", value: 1, color: "#8b5cf6" },
  ];

  it("menampilkan legenda label + nilai tiap irisan", () => {
    render(<DonutChart data={data} centerLabel={4} centerSub="aktif" />);

    expect(screen.getByText("Antri Desain")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Packing")).toBeInTheDocument();
    // Label tengah.
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("aktif")).toBeInTheDocument();
  });

  it("total 0 tetap render tanpa error (cincin kosong)", () => {
    const kosong = [
      { label: "A", value: 0, color: "#000" },
      { label: "B", value: 0, color: "#111" },
    ];
    render(<DonutChart data={kosong} />);
    expect(screen.getByLabelText(/diagram lingkaran kosong/i)).toBeInTheDocument();
  });
});

describe("BarList", () => {
  it("menampilkan bar dengan nilai dan aria untuk aksesibilitas", () => {
    render(
      <BarList
        items={[
          { label: "Cetak", value: 5 },
          { label: "Cutting", value: 2 },
        ]}
      />
    );

    expect(screen.getByText("Cetak")).toBeInTheDocument();
    const bars = screen.getAllByRole("progressbar");
    expect(bars).toHaveLength(2);
    expect(bars[0]).toHaveAttribute("aria-valuenow", "5");
  });

  it("menampilkan emptyText saat semua nol", () => {
    render(
      <BarList
        items={[{ label: "X", value: 0 }]}
        emptyText="Tidak ada antrian."
      />
    );
    expect(screen.getByText("Tidak ada antrian.")).toBeInTheDocument();
  });
});
