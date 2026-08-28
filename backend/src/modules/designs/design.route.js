import { Router } from "express";
import designController from "./design.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/role.middleware.js";
import { uploadDesainFile } from "../../middlewares/upload.middleware.js";
import { ROLES } from "../auth/auth.constant.js";

const router = Router();

// Semua endpoint galeri butuh login.
router.use(authenticate);

/**
 * Baca galeri: ADMIN & DESIGNER.
 *
 * Admin memilih desain saat membuat order; designer melihat file yang harus
 * dikerjakan. Role produksi/packing tidak perlu galeri (mereka kerja dari
 * status order, bukan file mentah) — dibatasi supaya file pelanggan tidak
 * tersebar lebih luas dari perlunya.
 */
router.get(
  "/",
  authorize(ROLES.ADMIN, ROLES.DESIGNER),
  designController.list
);
router.get(
  "/:id",
  authorize(ROLES.ADMIN, ROLES.DESIGNER),
  designController.detail
);

/**
 * Upload desain: ADMIN & DESIGNER.
 *
 * uploadDesainFile (multer) berjalan SEBELUM controller untuk mengisi
 * req.file dari multipart/form-data. Field file bernama "file".
 */
router.post(
  "/",
  authorize(ROLES.ADMIN, ROLES.DESIGNER),
  uploadDesainFile,
  designController.upload
);

/** Hapus desain: hanya ADMIN (dan ditolak kalau masih dipakai order). */
router.delete("/:id", authorize(ROLES.ADMIN), designController.remove);

export default router;
