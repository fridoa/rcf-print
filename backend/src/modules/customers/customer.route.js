import { Router } from "express";
import customerController from "./customer.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { authorize } from "../../middlewares/role.middleware.js";
import { ROLES } from "../auth/auth.constant.js";

const router = Router();

// Semua endpoint pelanggan butuh login.
router.use(authenticate);

/**
 * Baca: semua role boleh.
 *
 * Alasannya nomor WhatsApp pelanggan dipakai di layar produksi/packing
 * untuk mengabari konsumen saat status READY, jadi membatasi baca ke ADMIN
 * akan mematikan alur itu.
 */
router.get("/", customerController.list);
router.get("/:id", customerController.detail);

/**
 * Tulis: hanya ADMIN.
 *
 * Data pelanggan dimasukkan admin saat order dibuat; role desain/produksi/
 * packing tidak punya alasan mengubahnya.
 */
router.post("/", authorize(ROLES.ADMIN), customerController.create);
router.patch("/:id", authorize(ROLES.ADMIN), customerController.update);
router.delete("/:id", authorize(ROLES.ADMIN), customerController.remove);

export default router;
