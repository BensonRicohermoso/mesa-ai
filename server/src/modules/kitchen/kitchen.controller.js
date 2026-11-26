import { transitionOrder } from "./kitchen.service.js";
export async function patchKitchenStatus(req, res, next) {
  try {
    const { status } = req.body || {};
    if (!["preparing", "ready", "completed"].includes(status)) { const error = new Error("Invalid kitchen status."); error.statusCode = 400; error.code = "VALIDATION_ERROR"; throw error; }
    res.json(await transitionOrder(req.params.orderRef, status, req.auth.staff.id));
  } catch (error) { next(error); }
}
