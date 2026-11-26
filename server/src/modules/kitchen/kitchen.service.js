import { supabase } from "../../config/supabase.js";
import { createAuthError } from "../../lib/errors.js";
export async function transitionOrder(orderRef, status, staffId) {
  const { error } = await supabase.rpc("transition_order_status", { p_order_ref: orderRef, p_to_status: status, p_changed_by: staffId });
  if (!error) return { ok: true };
  const code = String(error.message || "").match(/(ORDER_NOT_FOUND|INVALID_STATUS_TRANSITION|UNPAID_ORDER)/)?.[1];
  if (code) throw createAuthError(code === "ORDER_NOT_FOUND" ? 404 : 409, code, "The requested order status transition is not allowed.");
  throw error;
}
