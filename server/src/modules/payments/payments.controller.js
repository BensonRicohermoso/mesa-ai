import { confirmPayment } from "./payments.service.js";

export async function postPayment(req, res, next) {
  try {
    const { orderRef, method, amountTendered, referenceNumber } = req.body || {};
    if (typeof orderRef !== "string" || !["cash", "gcash"].includes(method)) {
      const error = new Error("orderRef and a supported payment method are required."); error.statusCode = 400; error.code = "VALIDATION_ERROR"; throw error;
    }
    res.status(201).json(await confirmPayment({ orderRef, method, amountTendered: method === "cash" ? Number(amountTendered) : null, referenceNumber, staffId: req.auth.staff.id }));
  } catch (error) { next(error); }
}
