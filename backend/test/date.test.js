import { describe, it, expect } from "vitest";
import {
  formatDDMMYY,
  komponenTanggalJakarta,
  awalHariJakarta,
  awalHariBerikutnyaJakarta,
} from "../src/utils/date.js";

describe("utils/date (Asia/Jakarta)", () => {
  it("memformat DDMMYY menurut tanggal WIB", () => {
    // 22 Agustus 2026, 10:00 UTC = 17:00 WIB — masih 22 Agustus
    expect(formatDDMMYY(new Date("2026-08-22T10:00:00Z"))).toBe("220826");
  });

  it("menggeser tanggal untuk waktu larut malam WIB", () => {
    // 22 Agustus 23:30 WIB = 22 Agustus 16:30 UTC → tetap 22 di WIB
    const larut = new Date("2026-08-22T16:30:00Z");
    expect(formatDDMMYY(larut)).toBe("220826");
    expect(komponenTanggalJakarta(larut)).toMatchObject({
      year: 2026,
      month: 8,
      day: 22,
    });
  });

  it("menempatkan waktu tepat lewat tengah malam WIB di hari yang benar", () => {
    // 21 Agustus 17:30 UTC = 22 Agustus 00:30 WIB → harus jadi 22, bukan 21.
    // Ini kasus yang gagal kalau memakai UTC apa adanya.
    const lewatTengahMalam = new Date("2026-08-21T17:30:00Z");
    expect(formatDDMMYY(lewatTengahMalam)).toBe("220826");
  });

  it("awalHariJakarta = tengah malam WIB (17:00 UTC hari sebelumnya)", () => {
    const awal = awalHariJakarta(new Date("2026-08-22T10:00:00Z"));
    expect(awal.toISOString()).toBe("2026-08-21T17:00:00.000Z");
  });

  it("awalHariBerikutnya berjarak tepat 24 jam", () => {
    const d = new Date("2026-08-22T10:00:00Z");
    const selisih =
      awalHariBerikutnyaJakarta(d).getTime() - awalHariJakarta(d).getTime();
    expect(selisih).toBe(24 * 60 * 60 * 1000);
  });
});
