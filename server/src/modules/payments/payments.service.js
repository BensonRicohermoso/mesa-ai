import { supabase } from "../../config/supabase.js";
import { createAuthError } from "../../lib/errors.js";

export async function confirmPayment({ orderRef, method, amountTendered, referenceNumber, staffId }) {
  const { error } = await supabase.rpc("confirm_order_payment", {
    p_order_ref: orderRef, p_method: method, p_amount_tendered: amountTendered,
    p_reference_number: referenceNumber || null, p_confirmed_by: staffId,
  });
  if (!error) return { ok: true };
  const code = String(error.message || "").match(/(ORDER_NOT_FOUND|PAYMENT_NOT_ALLOWED|INSUFFICIENT_TENDERED)/)?.[1];
  if (code) throw createAuthError(code === "ORDER_NOT_FOUND" ? 404 : 409, code, code === "INSUFFICIENT_TENDERED" ? "Cash tendered is below the order total." : "This order cannot be paid in its current state.");
  throw error;
}
