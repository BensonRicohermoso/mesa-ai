import express from "express";
import rateLimit from "express-rate-limit";
import { authenticate } from "../../middleware/auth.js";
import {
  getCurrentUser,
  postLogin,
  postLogout,
  postRefresh,
} from "./auth.controller.js";

const router = express.Router();

// Throttle login attempts: max 10 per 15 minutes per IP.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMITED",
      message: "Too many sign-in attempts. Please try again in 15 minutes.",
    },
  },
});

// POST /api/auth/login   — no auth required; rate-limited
router.post("/auth/login", loginLimiter, postLogin);

// POST /api/auth/refresh — no auth required; silently refreshes an expired session
router.post("/auth/refresh", postRefresh);

// GET  /api/auth/me      — any authenticated staff member; no role restriction
router.get("/auth/me", authenticate, getCurrentUser);

// POST /api/auth/logout  — authenticated; revokes the current session server-side
router.post("/auth/logout", authenticate, postLogout);

export default router;
