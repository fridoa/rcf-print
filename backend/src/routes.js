import { Router } from "express";
import authRoute from "./modules/auth/auth.route.js";
import customerRoute from "./modules/customers/customer.route.js";

const router = Router();

router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "RCF Print API",
    version: "1.0.0",
  });
});

router.use("/auth", authRoute);
router.use("/customers", customerRoute);

// Modul berikutnya:
// router.use("/orders", orderRoute);
// router.use("/rekap", rekapRoute);

export default router;
