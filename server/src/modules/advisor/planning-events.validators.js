import { createAuthError } from "../../lib/errors.js";

const TYPES = new Set(["promotion", "holiday", "closure", "large_order"]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateEventId(value) {
  if (typeof value !== "string" || !UUID_RE.test(value)) throw createAuthError(400, "VALIDATION_ERROR", "eventId must be a valid UUID.");
  return value;
}
export function validatePlanningEvent(body, { partial = false } = {}) {
  const value = {};
  if (!partial || body?.title !== undefined) {
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    if (!title || title.length > 160) throw createAuthError(400, "VALIDATION_ERROR", "title is required and must be at most 160 characters.");
    value.title = title;
  }
  if (!partial || body?.eventType !== undefined) {
    if (!TYPES.has(body?.eventType)) throw createAuthError(400, "VALIDATION_ERROR", "eventType must be promotion, holiday, closure, or large_order.");
    value.eventType = body.eventType;
  }
  for (const [input, output] of [["startsOn", "startsOn"], ["endsOn", "endsOn"]]) {
    if (!partial || body?.[input] !== undefined) {
      if (typeof body?.[input] !== "string" || !DATE_RE.test(body[input])) throw createAuthError(400, "VALIDATION_ERROR", `${input} must use YYYY-MM-DD.`);
      value[output] = body[input];
    }
  }
  if (!partial || body?.demandAdjustmentPct !== undefined) {
    const adjustment = Number(body?.demandAdjustmentPct);
    if (!Number.isFinite(adjustment) || adjustment < -100 || adjustment > 500) throw createAuthError(400, "VALIDATION_ERROR", "demandAdjustmentPct must be between -100 and 500.");
    value.demandAdjustmentPct = adjustment;
  }
  if (body?.note !== undefined) {
    if (body.note !== null && (typeof body.note !== "string" || body.note.length > 2000)) throw createAuthError(400, "VALIDATION_ERROR", "note must be text of at most 2000 characters.");
    value.note = body.note?.trim() || null;
  }
  if (partial && Object.keys(value).length === 0) throw createAuthError(400, "VALIDATION_ERROR", "At least one event field is required.");
  if (value.startsOn && value.endsOn && value.endsOn < value.startsOn) throw createAuthError(400, "VALIDATION_ERROR", "endsOn must be on or after startsOn.");
  if (value.eventType === "closure" && value.demandAdjustmentPct !== undefined && value.demandAdjustmentPct !== -100) throw createAuthError(400, "VALIDATION_ERROR", "closure events must use -100 demandAdjustmentPct.");
  return value;
}
