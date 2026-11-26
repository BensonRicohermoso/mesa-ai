import express from "express";
import { authenticate, requireRoles } from "../../middleware/auth.js";
import { patchKitchenStatus } from "./kitchen.controller.js";
const router = express.Router();
router.patch("/:orderRef/status", authenticate, requireRoles("admin", "kitchen"), patchKitchenStatus);
export default router;
