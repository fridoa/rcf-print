import { describe, expect, it } from "vitest";
import { formatWhatsapp, whatsappLink } from "@/shared/lib/phone";

describe("formatWhatsapp", () => {
  it("mengubah format 62 menjadi 0 dan memberi tanda hubung", () => {
    expect(formatWhatsapp("6281234567890")).toBe("0812-3456-7890");
  });

  it("menangani nomor yang lebih pendek tanpa merusaknya", () => {
    expect(formatWhatsapp("62812345678")).toBe("0812-3456-78");
  });

  it("mengembalikan tanda hubung untuk nilai kosong", () => {
    expect(formatWhatsapp("")).toBe("-");
    expect(formatWhatsapp(undefined)).toBe("-");
    expect(formatWhatsapp(null)).toBe("-");
  });

  it("membuang karakter non-digit sebelum memformat", () => {
    expect(formatWhatsapp("+62 812 3456 7890")).toBe("0812-3456-7890");
  });
});

describe("whatsappLink", () => {
  it("memakai nomor format 62 tanpa karakter lain", () => {
    expect(whatsappLink("6281234567890")).toBe("https://wa.me/6281234567890");
    expect(whatsappLink("+62 812-3456-7890")).toBe(
      "https://wa.me/6281234567890"
    );
  });
});
