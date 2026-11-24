import express from "express";
import { authenticate, requireRoles } from "../../middleware/auth.js";
import {
  getCategories,
  postCategory,
  putCategory,
  patchCategoryStatus,
  getMenuItems,
  postMenuItem,
  putMenuItem,
  patchAvailability,
  patchStatus,
} from "./menu.controller.js";

const router = express.Router();

// All menu management routes require an authenticated admin.
router.use(authenticate, requireRoles("admin"));

// ── Categories ───────────────────────────────────────────────────────────────
router.get("/categories", getCategories);
router.post("/categories", postCategory);
router.put("/categories/:id", putCategory);
router.patch("/categories/:id/status", patchCategoryStatus);

// ── Menu Items ───────────────────────────────────────────────────────────────
router.get("/items", getMenuItems);
router.post("/items", postMenuItem);
router.put("/items/:id", putMenuItem);
router.patch("/items/:id/availability", patchAvailability);
router.patch("/items/:id/status", patchStatus);

export default router;
