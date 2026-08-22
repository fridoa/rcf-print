import { Router } from "express";
import authController from "./auth.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";

const router = Router();

router.post("/login", authController.login);

// semua endpoint di bawah ini butuh token
router.get("/me", authenticate, authController.me);
router.patch("/edit-profile", authenticate, authController.editProfile);
router.patch("/change-password", authenticate, authController.changePassword);

export default router;
