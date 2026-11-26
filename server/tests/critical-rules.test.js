import assert from "node:assert/strict";
import test from "node:test";
import { canCreatePayment, canEnterKitchen, hasTrackingPermission, isExpired, isValidStatusTransition } from "../src/lib/order-rules.js";
import { verifyWebhookSignature } from "../src/lib/webhook.js";
import crypto from "node:crypto";

test("payment is idempotent: only an unpaid pending order may create a payment", () => {
  assert.equal(canCreatePayment({ paymentStatus: "unpaid", orderStatus: "pending" }), true);
  assert.equal(canCreatePayment({ paymentStatus: "paid", orderStatus: "confirmed" }), false);
});

test("invalid status transitions and unpaid kitchen entry are blocked", () => {
  assert.equal(isValidStatusTransition("pending", "ready"), false);
  assert.equal(isValidStatusTransition("confirmed", "preparing"), true);
  assert.equal(canEnterKitchen({ paymentStatus: "unpaid", orderStatus: "confirmed" }), false);
  assert.equal(canEnterKitchen({ paymentStatus: "paid", orderStatus: "confirmed" }), true);
});

test("unpaid pending orders expire at their expiry time", () => {
  assert.equal(isExpired({ paymentStatus: "unpaid", orderStatus: "pending", expiresAt: "2026-01-01T00:00:00.000Z" }, new Date("2026-01-01T00:00:01.000Z")), true);
  assert.equal(isExpired({ paymentStatus: "paid", orderStatus: "pending", expiresAt: "2026-01-01T00:00:00.000Z" }, new Date("2026-01-01T00:00:01.000Z")), false);
});

test("webhook signatures use timing-safe HMAC verification", () => {
  const body = Buffer.from('{"event":"paid"}');
  const secret = "test-secret";
  const signature = crypto.createHmac("sha256", secret).update(body).digest("hex");
  assert.equal(verifyWebhookSignature(body, `sha256=${signature}`, secret), true);
  assert.equal(verifyWebhookSignature(body, "sha256=bad", secret), false);
});

test("customer tracking requires the possession token", () => {
  assert.equal(hasTrackingPermission("b1b5ebda-b079-4ae1-a24d-0d76d76e1a94", "b1b5ebda-b079-4ae1-a24d-0d76d76e1a94"), true);
  assert.equal(hasTrackingPermission("b1b5ebda-b079-4ae1-a24d-0d76d76e1a94", "other"), false);
});
