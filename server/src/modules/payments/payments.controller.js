import { confirmPayment } from "./payments.service.js";
import { invalidatePlanningCache } from "../ai/planning.service.js";

export async function postPayment(req, res, next) {
  try {
    const { orderRef, method, amountTendered, referenceNumber } = req.body || {};
    if (typeof orderRef !== "string" || !["cash", "gcash"].includes(method)) {
      const error = new Error("orderRef and a supported payment method are required."); error.statusCode = 400; error.code = "VALIDATION_ERROR"; throw error;
    }
    const result = await confirmPayment({ orderRef, method, amountTendered: method === "cash" ? Number(amountTendered) : null, referenceNumber, staffId: req.auth.staff.id });
    invalidatePlanningCache();
    res.status(201).json(result);
  } catch (error) { next(error); }
}
