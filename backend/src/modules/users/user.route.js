import { Router } from "express";
import userController from "./user.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/role.middleware.js";
import { ROLES } from "../auth/auth.constant.js";

const router = Router();

/**
 * Manajemen user sepenuhnya wewenang ADMIN.
 *
 * Berbeda dari modul customer yang membuka endpoint baca untuk semua role,
 * daftar user tidak punya alasan dilihat role lain: PRODUKSI/PACKING/DESIGNER
 * tidak perlu tahu siapa saja user sistem, dan datanya (username, email,
 * role, status aktif) lebih sensitif. Jadi authenticate + authorize(ADMIN)
 * dipasang untuk SEMUA endpoint di sini.
 *
 * Catatan: mengubah profil/password DIRI SENDIRI tetap lewat modul auth
 * (/auth/edit-profile, /auth/change-password). Modul ini khusus admin
 * mengelola user LAIN (dan dirinya, dengan batasan di service).
 */
router.use(authenticate, authorize(ROLES.ADMIN));

router.get("/", userController.list);
router.get("/:id", userController.detail);
router.post("/", userController.create);
router.patch("/:id", userController.update);
router.patch("/:id/reset-password", userController.resetPassword);
router.delete("/:id", userController.remove);

export default router;
