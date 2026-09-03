import { Router } from "express";
import orderController from "./order.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/role.middleware.js";
import { ROLES } from "../auth/auth.constant.js";

const router = Router();

// Semua endpoint order butuh login.
router.use(authenticate);

/**
 * Baca: semua role boleh.
 *
 * Tiap layar produksi (DESIGN, CETAK, POLYFLEX, SUBLIM, PACKING) perlu melihat
 * daftar order sesuai statusnya, jadi membaca tidak dibatasi ke ADMIN. Yang
 * dibatasi adalah aksi yang mengubah data.
 */
router.get("/", orderController.list);
// PENTING: /statistik harus sebelum /:id, kalau tidak "statistik" tertangkap
// sebagai parameter id dan diperlakukan sebagai ObjectId (error/404).
router.get("/statistik", orderController.statistik);
// Sama seperti /statistik: harus mendahului /:id.
router.get("/tertahan", orderController.tertahan);
router.get("/:id", orderController.detail);
router.get("/:id/riwayat", orderController.riwayat);

/**
 * Buat order: hanya ADMIN. Order lahir dari meja admin (atau nanti webhook WA
 * yang juga bertindak atas nama sistem/admin).
 */
router.post("/", authorize(ROLES.ADMIN), orderController.create);

/**
 * Majukan status satu langkah. Route hanya mensyaratkan login; siapa yang
 * berhak untuk transisi TERTENTU diputuskan di service berdasarkan status
 * asal order (DESIGNER/PRODUKSI/PACKING/ADMIN). Menaruh cek itu di service,
 * bukan di route, karena role yang diizinkan berbeda-beda per status —
 * authorize() statis tidak bisa menyatakannya.
 */
router.patch("/:id/status", orderController.majukanStatus);

/** Selesaikan order + catat pembayaran: hanya ADMIN. */
router.patch("/:id/selesai", authorize(ROLES.ADMIN), orderController.selesaikan);

/** Koreksi status manual (mundur/lompat): hanya ADMIN. */
router.patch("/:id/koreksi", authorize(ROLES.ADMIN), orderController.koreksi);

/** Ubah data order: hanya ADMIN. */
router.patch("/:id", authorize(ROLES.ADMIN), orderController.update);

/** Hapus order: hanya ADMIN. */
router.delete("/:id", authorize(ROLES.ADMIN), orderController.remove);

export default router;

