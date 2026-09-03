import { describe, expect, it } from "vitest";
import {
  geserHari,
  kelompokkanPerTanggal,
  labelGrupTanggal,
  tanggalJakarta,
} from "@/shared/lib/date-range";

/**
 * Helper rentang tanggal filter order.
 *
 * Semua test memakai `acuan` eksplisit supaya hasilnya tidak bergantung pada
 * hari saat test dijalankan. Zona uji: 26 Agustus 2026 pukul 10:00 WIB.
 */
const ACUAN = new Date("2026-08-26T10:00:00+07:00");

describe("tanggalJakarta", () => {
  it("mengambil tanggal menurut kalender Jakarta, bukan UTC", () => {
    // 00:30 WIB tanggal 26 = 17:30 UTC tanggal 25. Yang benar: 26.
    expect(tanggalJakarta(new Date("2026-08-26T00:30:00+07:00"))).toBe(
      "2026-08-26"
    );
    // 23:30 WIB tanggal 26 = 16:30 UTC tanggal 26.
    expect(tanggalJakarta(new Date("2026-08-26T23:30:00+07:00"))).toBe(
      "2026-08-26"
    );
  });
});

describe("geserHari", () => {
  it("mundur dan maju sesuai jumlah hari", () => {
    expect(geserHari("2026-08-26", -1)).toBe("2026-08-25");
    expect(geserHari("2026-08-26", 1)).toBe("2026-08-27");
  });

  it("melewati batas bulan dan tahun", () => {
    expect(geserHari("2026-09-01", -1)).toBe("2026-08-31");
    expect(geserHari("2027-01-01", -1)).toBe("2026-12-31");
  });
});

describe("labelGrupTanggal", () => {
  it("memberi label relatif untuk hari ini dan kemarin", () => {
    expect(labelGrupTanggal("2026-08-26T03:00:00.000Z", ACUAN)).toBe("Hari Ini");
    expect(labelGrupTanggal("2026-08-25T03:00:00.000Z", ACUAN)).toBe("Kemarin");
  });

  it("memberi tanggal lengkap dengan nama hari untuk tanggal lain", () => {
    const label = labelGrupTanggal("2026-08-24T03:00:00.000Z", ACUAN);
    expect(label).toMatch(/24/);
    expect(label).toMatch(/Agu/);
    expect(label).toMatch(/2026/);
  });

  it("menangani nilai kosong / tidak valid", () => {
    expect(labelGrupTanggal(null, ACUAN)).toBe("Tanpa tanggal");
    expect(labelGrupTanggal("bukan-tanggal", ACUAN)).toBe("Tanpa tanggal");
  });
});

describe("kelompokkanPerTanggal", () => {
  const order = (id, tgl) => ({ _id: id, tgl_order: tgl });

  it("mengelompokkan order berurutan per tanggal WIB", () => {
    const grup = kelompokkanPerTanggal(
      [
        order("a", "2026-08-26T02:00:00.000Z"),
        order("b", "2026-08-26T08:00:00.000Z"),
        order("c", "2026-08-25T02:00:00.000Z"),
      ],
      ACUAN
    );

    expect(grup).toHaveLength(2);
    expect(grup[0].label).toBe("Hari Ini");
    expect(grup[0].orders.map((o) => o._id)).toEqual(["a", "b"]);
    expect(grup[1].label).toBe("Kemarin");
    expect(grup[1].orders.map((o) => o._id)).toEqual(["c"]);
  });

  it("membuat grup baru saat tanggal berulang tidak berurutan", () => {
    // Daftar yang tidak tersortir memang menghasilkan grup terpisah — itu
    // alasan pemanggil harus meminta sort=-tgl_order ke backend.
    const grup = kelompokkanPerTanggal(
      [
        order("a", "2026-08-26T02:00:00.000Z"),
        order("b", "2026-08-25T02:00:00.000Z"),
        order("c", "2026-08-26T02:00:00.000Z"),
      ],
      ACUAN
    );

    expect(grup).toHaveLength(3);
  });

  it("daftar kosong menghasilkan nol grup", () => {
    expect(kelompokkanPerTanggal([], ACUAN)).toEqual([]);
  });
});
