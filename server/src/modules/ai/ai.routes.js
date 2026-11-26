import express from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { authenticate, requireRoles } from "../../middleware/auth.js";
import {
  getAiStatus,
  postAiBriefing,
  postAiForecast,
  postAiQna,
} from "./ai.controller.js";

const router = express.Router();

const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  // Admin accounts are the normal key. Keep the package's IPv6-safe subnet
  // normalization for the (rare) unauthenticated fallback.
  keyGenerator: (req) => req.auth?.staff?.id ?? ipKeyGenerator(req.ip),
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: "RATE_LIMITED",
        message: "Too many AI requests. Please wait a moment and try again.",
      },
    });
  },
});

// All AI endpoints require an authenticated admin; rate limit per staff account.
router.use(authenticate, requireRoles("admin"), aiRateLimiter);

router.get("/status", getAiStatus);
router.post("/briefing", postAiBriefing);
router.post("/forecast", postAiForecast);
router.post("/qna", postAiQna);

export default router;
