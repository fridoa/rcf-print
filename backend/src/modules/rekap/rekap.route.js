import { Router } from "express";
import rekapController from "./rekap.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/role.middleware.js";
import { ROLES } from "../auth/auth.constant.js";

const router = Router();

// Semua endpoint rekap butuh login.
router.use(authenticate);

/**
 * Rekap uang hanya untuk ADMIN.
 *
 * Berbeda dari daftar order (yang terbuka ke semua role untuk keperluan
 * produksi), rekap memuat pendapatan Cash/Transfer — data keuangan yang tidak
 * relevan untuk desain/produksi/packing dan sebaiknya dibatasi.
 */
router.get("/harian", authorize(ROLES.ADMIN), rekapController.harian);

export default router;
