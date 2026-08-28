import { describe, it, expect, afterEach, vi } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { isOriginAllowed, allowedOrigins } from "../src/config/cors.js";

/**
 * Test ini berjalan dengan APP_ENV=autotest (dipaksa test/setup.js),
 * jadi cabang "izinkan localhost" aktif. Untuk menguji perilaku
 * production/staging, modul env di-mock dan cors.js diimpor ulang —
 * lihat describe terakhir.
 */

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

describe("CORS — origin yang diizinkan (dev/autotest)", () => {
  it("memasukkan FRONTEND_URL ke daftar origin", () => {
    expect(allowedOrigins).toContain(FRONTEND_URL.replace(/\/+$/, ""));
  });

  it("mengizinkan request tanpa header Origin (curl, health check)", () => {
    // Bukan request lintas-origin dari browser, jadi CORS tidak berlaku.
    expect(isOriginAllowed(undefined)).toBe(true);
    expect(isOriginAllowed("")).toBe(true);
  });

  it("mengizinkan localhost di port berapa pun saat bukan production", () => {
    expect(isOriginAllowed("http://localhost:5173")).toBe(true);
    expect(isOriginAllowed("http://localhost:5174")).toBe(true);
    expect(isOriginAllowed("http://127.0.0.1:3000")).toBe(true);
  });

  it("menolak domain luar meski di development", () => {
    expect(isOriginAllowed("https://situs-jahat.example")).toBe(false);
  });

  it("tidak tertipu subdomain yang menempel pada nama yang diizinkan", () => {
    // "localhost.penyerang.com" mengandung kata localhost tapi bukan localhost.
    expect(isOriginAllowed("http://localhost.penyerang.example")).toBe(false);
    expect(isOriginAllowed("http://notlocalhost")).toBe(false);
  });

  it("mengabaikan trailing slash saat membandingkan", () => {
    // Browser mengirim Origin tanpa slash, tapi nilai di .env sering
    // ditulis dengan slash. Keduanya harus dianggap sama.
    expect(isOriginAllowed(`${FRONTEND_URL}/`)).toBe(true);
  });

  it("membedakan skema http dan https", () => {
    // https://localhost tetap lolos lewat pola localhost, jadi yang diuji
    // di sini domain non-localhost dengan skema berbeda.
    expect(isOriginAllowed("http://situs-jahat.example")).toBe(false);
    expect(isOriginAllowed("https://situs-jahat.example")).toBe(false);
  });
});

describe("CORS — header pada response nyata", () => {
  it("mengirim Access-Control-Allow-Origin untuk origin yang diizinkan", async () => {
    const res = await request(app).get("/health").set("Origin", FRONTEND_URL);

    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe(FRONTEND_URL);
  });

  it("mengirim Allow-Credentials, bukan wildcard", async () => {
    const res = await request(app).get("/health").set("Origin", FRONTEND_URL);

    expect(res.headers["access-control-allow-credentials"]).toBe("true");
    // Wildcard dan credentials tidak boleh digabung — browser menolaknya.
    expect(res.headers["access-control-allow-origin"]).not.toBe("*");
  });

  it("menjawab preflight OPTIONS dengan method dan header yang diizinkan", async () => {
    const res = await request(app)
      .options("/api/v1/auth/login")
      .set("Origin", FRONTEND_URL)
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "authorization,content-type");

    expect(res.status).toBeLessThan(300);
    expect(res.headers["access-control-allow-methods"]).toContain("POST");
    expect(res.headers["access-control-allow-methods"]).toContain("PATCH");
    expect(res.headers["access-control-allow-headers"]).toContain("Authorization");
    expect(res.headers["access-control-max-age"]).toBe("600");
  });

  it("menolak origin asing dengan 403 berformat JSON", async () => {
    const res = await request(app)
      .get("/health")
      .set("Origin", "https://situs-jahat.example");

    // 403, bukan 500: penolakan yang disengaja tidak boleh mengotori
    // log error server.
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("tidak diizinkan");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("tetap melayani request tanpa Origin", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("CORS — perilaku di production", () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock("../src/config/env.js");
  });

  /**
   * Impor ulang cors.js dengan modul env yang dipalsukan.
   *
   * vi.resetModules() wajib dipanggil SEBELUM import: tanpa itu, cors.js
   * diambil dari cache modul dan mock-nya tidak berpengaruh — testnya lulus
   * padahal tidak menguji apa pun.
   */
  const muatCors = async ({ APP_ENV, FRONTEND_URL: fe, CORS_ORIGINS = [] }) => {
    vi.resetModules();

    vi.doMock("../src/config/env.js", () => ({
      env: {
        APP_ENV,
        NODE_ENV: APP_ENV,
        FRONTEND_URL: fe,
        CORS_ORIGINS,
      },
      isProduction: APP_ENV === "production",
      isStaging: APP_ENV === "staging",
      isAutotest: false,
      isTest: false,
      isDevelopment: false,
    }));

    return import("../src/config/cors.js");
  };

  it("menolak localhost di production", async () => {
    const { isOriginAllowed: cek } = await muatCors({
      APP_ENV: "production",
      FRONTEND_URL: "https://rcfprint.example.com",
    });

    expect(cek("http://localhost:5173")).toBe(false);
    expect(cek("http://127.0.0.1:5173")).toBe(false);
    expect(cek("https://rcfprint.example.com")).toBe(true);
  });

  it("menolak localhost di staging juga", async () => {
    const { isOriginAllowed: cek } = await muatCors({
      APP_ENV: "staging",
      FRONTEND_URL: "https://staging.rcfprint.example.com",
    });

    expect(cek("http://localhost:5173")).toBe(false);
    expect(cek("https://staging.rcfprint.example.com")).toBe(true);
  });

  it("mengizinkan origin tambahan dari CORS_ORIGINS", async () => {
    const { isOriginAllowed: cek, allowedOrigins: daftar } = await muatCors({
      APP_ENV: "production",
      FRONTEND_URL: "https://rcfprint.example.com",
      CORS_ORIGINS: ["https://www.rcfprint.example.com", "https://admin.rcfprint.example.com"],
    });

    expect(cek("https://www.rcfprint.example.com")).toBe(true);
    expect(cek("https://admin.rcfprint.example.com")).toBe(true);
    expect(daftar).toHaveLength(3);
  });

  it("tidak menduplikasi origin yang ditulis dua kali", async () => {
    const { allowedOrigins: daftar } = await muatCors({
      APP_ENV: "production",
      FRONTEND_URL: "https://rcfprint.example.com",
      // sengaja: sama dengan FRONTEND_URL, hanya beda trailing slash
      CORS_ORIGINS: ["https://rcfprint.example.com/"],
    });

    expect(daftar).toEqual(["https://rcfprint.example.com"]);
  });

  it("tetap mengizinkan request tanpa Origin di production", async () => {
    const { isOriginAllowed: cek } = await muatCors({
      APP_ENV: "production",
      FRONTEND_URL: "https://rcfprint.example.com",
    });

    // Health check dari Docker dan panggilan server-to-server tidak
    // mengirim Origin. Kalau ini ditolak, container selalu unhealthy.
    expect(cek(undefined)).toBe(true);
  });
});
