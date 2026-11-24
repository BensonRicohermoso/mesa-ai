import express from "express";
import rateLimit from "express-rate-limit";
import { authenticate } from "../../middleware/auth.js";
import {
  getCurrentUser,
  getStaffList,
  postLogin,
  postLogout,
  postPinSwitch,
  postRefresh,
  postSetPin,
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

// Throttle PIN attempts: max 15 per 5 minutes per IP.
const pinLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "PIN_RATE_LIMITED",
      message: "Too many PIN attempts. Please wait 5 minutes.",
    },
  },
});

// POST /api/auth/login   — terminal / master sign-in; rate-limited
router.post("/auth/login", loginLimiter, postLogin);

// POST /api/auth/refresh — silently refreshes an expired session
router.post("/auth/refresh", postRefresh);

// GET  /api/auth/staff   — active staff list for terminal staff switcher
router.get("/auth/staff", getStaffList);

// POST /api/auth/pin-switch — fast POS staff switch by PIN (rate-limited)
router.post("/auth/pin-switch", pinLimiter, postPinSwitch);

// GET  /api/auth/me      — any authenticated staff member
router.get("/auth/me", authenticate, getCurrentUser);

// POST /api/auth/pin     — authenticated staff member can set their PIN
router.post("/auth/pin", authenticate, postSetPin);

// POST /api/auth/logout  — authenticated; revokes the current session server-side
router.post("/auth/logout", authenticate, postLogout);

export default router;
