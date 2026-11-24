import express from "express";
import { authenticate } from "../../middleware/auth.js";
import { getCurrentUser, postLogin } from "./auth.controller.js";

const router = express.Router();

router.post("/auth/login", postLogin);
router.get("/auth/me", authenticate, getCurrentUser);

export default router;
