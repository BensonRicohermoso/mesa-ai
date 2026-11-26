export const VALID_TRANSITIONS = new Map([
  ["confirmed", new Set(["preparing", "cancelled"])],
  ["preparing", new Set(["ready"])],
  ["ready", new Set(["completed"])],
  ["pending", new Set(["cancelled"])],
]);

export function isValidStatusTransition(from, to) { return VALID_TRANSITIONS.get(from)?.has(to) ?? false; }
export function canEnterKitchen(order) { return order.paymentStatus === "paid" && order.orderStatus === "confirmed"; }
export function isExpired(order, now = new Date()) { return order.paymentStatus === "unpaid" && order.orderStatus === "pending" && !!order.expiresAt && new Date(order.expiresAt) <= now; }
export function hasTrackingPermission(expectedToken, suppliedToken) { return typeof suppliedToken === "string" && suppliedToken === expectedToken; }
export function canCreatePayment(order) { return order.paymentStatus === "unpaid" && order.orderStatus === "pending"; }
