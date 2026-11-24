import express from "express";
import { authenticate, requireRoles } from "../../middleware/auth.js";
import {
  getTables,
  patchTableStatus,
  postTable,
  putTable,
} from "./tables.controller.js";

const router = express.Router();

// All table management routes require an authenticated admin.
router.use(authenticate, requireRoles("admin"));

router.get("/", getTables);
router.post("/", postTable);
router.put("/:id", putTable);
router.patch("/:id/status", patchTableStatus);

export default router;
