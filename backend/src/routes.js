import { Router } from "express";
import authRoute from "./modules/auth/auth.route.js";

const router = Router();

router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "RCF Print API",
    version: "1.0.0",
  });
});

router.use("/auth", authRoute);

// Modul berikutnya:
// router.use("/customers", customerRoute);
// router.use("/orders", orderRoute);
// router.use("/rekap", rekapRoute);

export default router;
