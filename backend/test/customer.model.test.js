import { describe, it, expect, beforeAll } from "vitest";
import { normalizeWhatsapp, toWhatsappLink } from "../src/utils/phone.js";
import CustomerModel from "../src/modules/customers/customer.model.js";

describe("normalizeWhatsapp", () => {
  it("mengubah awalan 0 menjadi 62", () => {
    expect(normalizeWhatsapp("081234567890")).toBe("6281234567890");
  });

  it("membuang spasi, tanda hubung, dan tanda plus", () => {
    expect(normalizeWhatsapp("+62 812-3456-7890")).toBe("6281234567890");
    expect(normalizeWhatsapp("0812 3456 7890")).toBe("6281234567890");
    expect(normalizeWhatsapp("(0812) 3456-7890")).toBe("6281234567890");
  });

  it("membetulkan awalan 620 yang tercampur", () => {
    expect(normalizeWhatsapp("6281234567890")).toBe("6281234567890");
    expect(normalizeWhatsapp("620812345678")).toBe("62812345678");
  });

  it("melengkapi nomor yang ditulis mulai dari 8", () => {
    expect(normalizeWhatsapp("81234567890")).toBe("6281234567890");
  });

  it("mengembalikan string kosong untuk input kosong/tak bermakna", () => {
    expect(normalizeWhatsapp("")).toBe("");
    expect(normalizeWhatsapp(undefined)).toBe("");
    expect(normalizeWhatsapp("abc")).toBe("");
  });

  it("membuat link wa.me dari nomor ternormalisasi", () => {
    expect(toWhatsappLink(normalizeWhatsapp("081234567890"))).toBe(
      "https://wa.me/6281234567890"
    );
  });
});

describe("CustomerModel", () => {
  // unique index tidak otomatis ada di database test yang baru dibuat;
  // tanpa ini test duplikat lolos padahal schema sudah menandai unique
  beforeAll(async () => {
    await CustomerModel.syncIndexes();
  });

  it("menormalkan nomor saat disimpan lewat model langsung", async () => {
    const customer = await CustomerModel.create({
      name: "Budi Santoso",
      whatsapp: "0812-3456-7890",
    });

    expect(customer.whatsapp).toBe("6281234567890");
  });

  it("menolak nomor yang tidak valid", async () => {
    await expect(
      CustomerModel.create({ name: "Budi Santoso", whatsapp: "12" })
    ).rejects.toThrow();
  });

  it("menolak nama kurang dari 3 karakter", async () => {
    await expect(
      CustomerModel.create({ name: "Bu", whatsapp: "081234567890" })
    ).rejects.toThrow();
  });

  it("menolak nomor duplikat lewat unique index", async () => {
    await CustomerModel.create({
      name: "Budi Santoso",
      whatsapp: "081234567890",
    });

    // format berbeda, nomor sama → tetap harus tertolak setelah normalisasi
    await expect(
      CustomerModel.create({ name: "Budi Lain", whatsapp: "+62 812 3456 7890" })
    ).rejects.toMatchObject({ code: 11000 });
  });

  it("tidak membocorkan __v di JSON", async () => {
    const customer = await CustomerModel.create({
      name: "Budi Santoso",
      whatsapp: "081234567890",
    });

    const json = customer.toJSON();
    expect(json.__v).toBeUndefined();
    expect(json.name).toBe("Budi Santoso");
  });
});
