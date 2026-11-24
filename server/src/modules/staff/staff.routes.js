import express from "express";
import { authenticate, requireRoles } from "../../middleware/auth.js";
import {
  getStaff,
  patchStaffStatus,
  postStaff,
  putStaff,
} from "./staff.controller.js";

const router = express.Router();

// All staff management routes require an authenticated admin.
router.use(authenticate, requireRoles("admin"));

router.get("/", getStaff);
router.post("/", postStaff);
router.put("/:id", putStaff);
router.patch("/:id/status", patchStaffStatus);

export default router;
