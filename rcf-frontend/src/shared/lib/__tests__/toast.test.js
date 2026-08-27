import { describe, it, expect, vi, beforeEach } from "vitest";
import { toast } from "react-toastify";
import { notify } from "../toast";

/**
 * Test pembungkus notify. react-toastify sudah di-mock global (src/test/setup),
 * jadi cukup verifikasi notify memanggil toast dengan teks yang benar —
 * terutama apiError yang menggabungkan message + errors[].
 */
describe("notify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("success/error/info meneruskan pesan apa adanya", () => {
    notify.success("beres");
    notify.error("gagal");
    notify.info("info");

    expect(toast.success).toHaveBeenCalledWith("beres");
    expect(toast.error).toHaveBeenCalledWith("gagal");
    expect(toast.info).toHaveBeenCalledWith("info");
  });

  it("apiError menggabungkan message + rincian errors[]", () => {
    notify.apiError({
      message: "Validasi gagal",
      errors: ["Nama wajib diisi", "WA tidak valid"],
    });

    expect(toast.error).toHaveBeenCalledWith(
      "Validasi gagal: Nama wajib diisi, WA tidak valid"
    );
  });

  it("apiError tanpa errors[] hanya menampilkan message", () => {
    notify.apiError({ message: "Server error" });
    expect(toast.error).toHaveBeenCalledWith("Server error");
  });

  it("apiError memakai fallback saat err tak terduga", () => {
    notify.apiError(null, "Ada masalah");
    expect(toast.error).toHaveBeenCalledWith("Ada masalah");
  });
});
