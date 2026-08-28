import { Router } from "express";
import authController from "./auth.controller.js";
import { authenticate } from "../../middlewares/auth.middleware.js";
import {
  loginLimiter,
  forgotPasswordLimiter,
  otpLimiter,
} from "../../middlewares/rateLimit.middleware.js";

const router = Router();

router.post("/login", loginLimiter, authController.login);

// Lupa katasandi — publik, pemanggil belum punya token justru karena
// tidak bisa login.
router.post("/forgot-password", forgotPasswordLimiter, authController.lupaPassword);
router.post("/verify-otp", otpLimiter, authController.verifikasiOtp);
router.post("/reset-password", otpLimiter, authController.resetPassword);

// semua endpoint di bawah ini butuh token
router.get("/me", authenticate, authController.me);
router.patch("/edit-profile", authenticate, authController.editProfile);
router.patch("/change-password", authenticate, authController.changePassword);

export default router;
