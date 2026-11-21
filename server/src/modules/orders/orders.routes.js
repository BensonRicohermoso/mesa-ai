import express from "express";
import {
  getMenu,
  getOrder,
  getTable,
  postOrder,
} from "./orders.controller.js";
import { validateCreateOrder } from "./orders.validators.js";

const router = express.Router();

// Validate the create-order body before entering the controller.
function validateCreateOrderMiddleware(req, _res, next) {
  try {
    req.validatedOrder = validateCreateOrder(req.body);
    next();
  } catch (error) {
    next(error);
  }
}

router.get("/customer/tables/:tableCode", getTable);
router.get("/customer/menu", getMenu);
router.post("/orders", validateCreateOrderMiddleware, postOrder);
router.get("/orders/:orderRef", getOrder);

export default router;
