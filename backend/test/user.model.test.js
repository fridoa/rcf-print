import { describe, it, expect } from "vitest";
import UserModel from "../src/modules/auth/user.model.js";
import { buatUser } from "./helpers.js";
import { ROLES } from "../src/modules/auth/auth.constant.js";

describe("UserModel", () => {
  it("meng-hash password saat disimpan", async () => {
    const { user, passwordMentah } = await buatUser();
    const tersimpan = await UserModel.findById(user._id).select("+password");

    expect(tersimpan.password).not.toBe(passwordMentah);
    expect(tersimpan.password).toMatch(/^\$2[aby]\$/); // format bcrypt
  });

  it("comparePassword benar untuk password yang tepat dan salah", async () => {
    const { user, passwordMentah } = await buatUser();
    const tersimpan = await UserModel.findById(user._id).select("+password");

    expect(await tersimpan.comparePassword(passwordMentah)).toBe(true);
    expect(await tersimpan.comparePassword("bukanpassword")).toBe(false);
  });

  it("menyimpan username dan email dalam huruf kecil", async () => {
    const { user } = await buatUser({
      username: "AdminBesar",
      email: "AdminBesar@RCFPrint.com",
    });

    expect(user.username).toBe("adminbesar");
    expect(user.email).toBe("adminbesar@rcfprint.com");
  });

  it("tidak membawa password saat query biasa", async () => {
    const { user } = await buatUser();
    const tersimpan = await UserModel.findById(user._id);

    expect(tersimpan.password).toBeUndefined();
  });

  it("menolak username duplikat", async () => {
    await UserModel.syncIndexes();
    await buatUser({ username: "kembar", email: "satu@rcfprint.com" });

    await expect(
      buatUser({ username: "kembar", email: "dua@rcfprint.com" })
    ).rejects.toThrow();
  });

  it("menolak email duplikat", async () => {
    await UserModel.syncIndexes();
    await buatUser({ username: "satu", email: "kembar@rcfprint.com" });

    await expect(
      buatUser({ username: "dua", email: "kembar@rcfprint.com" })
    ).rejects.toThrow();
  });

  it("menolak role di luar daftar", async () => {
    await expect(buatUser({ role: "SATPAM" })).rejects.toThrow();
  });

  it("menerima keempat role yang sah", async () => {
    for (const [i, role] of Object.values(ROLES).entries()) {
      const { user } = await buatUser({
        username: `user${i}`,
        email: `user${i}@rcfprint.com`,
        role,
      });
      expect(user.role).toBe(role);
    }
  });

  it("default isActive true", async () => {
    const { user } = await buatUser();
    expect(user.isActive).toBe(true);
  });
});
