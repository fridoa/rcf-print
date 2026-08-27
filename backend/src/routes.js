import { Router } from "express";
import authRoute from "./modules/auth/auth.route.js";
import customerRoute from "./modules/customers/customer.route.js";
import userRoute from "./modules/users/user.route.js";
import orderRoute from "./modules/orders/order.route.js";
import designRoute from "./modules/designs/design.route.js";
import rekapRoute from "./modules/rekap/rekap.route.js";

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
router.use("/users", userRoute);
router.use("/orders", orderRoute);
router.use("/designs", designRoute);
router.use("/rekap", rekapRoute);

export default router;
