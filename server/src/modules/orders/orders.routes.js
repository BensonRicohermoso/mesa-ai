import express from "express";
import rateLimit from "express-rate-limit";
import {
  getMenu,
  getOrder,
  getTable,
  postOrder,
} from "./orders.controller.js";
import { validateCreateOrder } from "./orders.validators.js";

const router = express.Router();
const publicOrderLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false, message: { error: { code: "RATE_LIMITED", message: "Too many customer requests. Please try again shortly." } } });

// Validate the create-order body before entering the controller.
function validateCreateOrderMiddleware(req, _res, next) {
  try {
    req.validatedOrder = validateCreateOrder(req.body);
    next();
  } catch (error) {
    next(error);
  }
}

router.get("/customer/tables/:tableCode", publicOrderLimiter, getTable);
router.get("/customer/menu", publicOrderLimiter, getMenu);
router.post("/orders", publicOrderLimiter, validateCreateOrderMiddleware, postOrder);
router.get("/orders/:orderRef", publicOrderLimiter, getOrder);

export default router;
