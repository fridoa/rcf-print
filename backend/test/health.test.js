import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";

describe("Health & routing dasar", () => {
  it("GET /health mengembalikan status ok", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.env).toBeTruthy();
  });

  it("GET /api/v1 mengembalikan info API", async () => {
    const res = await request(app).get("/api/v1");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain("RCF Print");
  });

  it("route tidak dikenal mengembalikan 404 berformat JSON", async () => {
    const res = await request(app).get("/api/v1/tidak-ada");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("tidak ditemukan");
  });
});
