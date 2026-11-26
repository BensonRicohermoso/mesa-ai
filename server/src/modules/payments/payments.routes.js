import express from "express";
import { authenticate, requireRoles } from "../../middleware/auth.js";
import { postPayment } from "./payments.controller.js";
const router = express.Router();
router.post("/", authenticate, requireRoles("admin", "cashier"), postPayment);
export default router;
