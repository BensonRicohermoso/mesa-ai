import { createAuthError } from "../../lib/errors.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BASE_UNITS = new Set(["g", "ml", "piece", "pack", "portion"]);
const ADJUSTMENT_REASONS = new Set([
  "physical_count", "wastage", "delivery_correction", "manual_correction",
]);

export function validateUuidParam(value, fieldName = "id") {
  const id = typeof value === "string" ? value.trim() : "";
  if (!UUID_RE.test(id)) throw createAuthError(400, "VALIDATION_ERROR", `${fieldName} must be a valid UUID.`);
  return id;
}

function optionalText(value, fieldName, maxLength = 500) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string" || value.trim().length > maxLength) {
    throw createAuthError(400, "VALIDATION_ERROR", `${fieldName} must be text of at most ${maxLength} characters.`);
  }
  return value.trim() || null;
}

function requiredName(value, fieldName = "name") {
  const name = typeof value === "string" ? value.trim() : "";
  if (!name || name.length > 150) throw createAuthError(400, "VALIDATION_ERROR", `${fieldName} is required and must be at most 150 characters.`);
  return name;
}

function nonNegative(value, fieldName, { integer = false, required = false } = {}) {
  if (value === undefined && !required) return undefined;
  if (value === undefined || value === null || value === "") throw createAuthError(400, "VALIDATION_ERROR", `${fieldName} is required.`);
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || (integer && !Number.isInteger(number))) {
    throw createAuthError(400, "VALIDATION_ERROR", `${fieldName} must be a finite non-negative ${integer ? "integer" : "number"}.`);
  }
  return number;
}

function boolean(value, fieldName) {
  if (typeof value !== "boolean") throw createAuthError(400, "VALIDATION_ERROR", `${fieldName} must be a boolean.`);
  return value;
}

export function validateSupplier(body, { partial = false } = {}) {
  const result = {};
  if (!partial || body?.name !== undefined) result.name = requiredName(body?.name);
  for (const [key, dbKey] of [["contactName", "contactName"], ["phone", "phone"], ["email", "email"]]) {
    const value = optionalText(body?.[key], key, 200);
    if (value !== undefined) result[dbKey] = value;
  }
  if (body?.isActive !== undefined) result.isActive = boolean(body.isActive, "isActive");
  if (partial && Object.keys(result).length === 0) throw createAuthError(400, "VALIDATION_ERROR", "At least one supplier field is required.");
  return result;
}

export function validateIngredient(body, { partial = false } = {}) {
  const result = {};
  if (!partial || body?.name !== undefined) result.name = requiredName(body?.name);
  if (!partial || body?.baseUnit !== undefined) {
    const baseUnit = typeof body?.baseUnit === "string" ? body.baseUnit.trim() : "";
    if (!BASE_UNITS.has(baseUnit)) throw createAuthError(400, "VALIDATION_ERROR", "baseUnit must be one of g, ml, piece, pack, or portion.");
    result.baseUnit = baseUnit;
  }
  if (partial && body?.onHandQuantity !== undefined) {
    throw createAuthError(400, "VALIDATION_ERROR", "onHandQuantity is an opening balance and cannot be edited; record a physical_count adjustment instead.");
  }
  for (const [key, integer] of [["onHandQuantity", false], ["parLevelQuantity", false], ["unitCost", false], ["leadTimeDays", true]]) {
    const value = nonNegative(body?.[key], key, { integer, required: !partial });
    if (value !== undefined) result[key] = value;
  }
  if (body?.supplierId !== undefined) result.supplierId = body.supplierId === null ? null : validateUuidParam(body.supplierId, "supplierId");
  if (body?.isActive !== undefined) result.isActive = boolean(body.isActive, "isActive");
  if (partial && Object.keys(result).length === 0) throw createAuthError(400, "VALIDATION_ERROR", "At least one ingredient field is required.");
  return result;
}

export function validateRecipe(body) {
  if (!Array.isArray(body?.items)) throw createAuthError(400, "VALIDATION_ERROR", "items must be an array.");
  const seen = new Set();
  return body.items.map((item, index) => {
    const ingredientId = validateUuidParam(item?.ingredientId, `items[${index}].ingredientId`);
    if (seen.has(ingredientId)) throw createAuthError(400, "VALIDATION_ERROR", "Recipe cannot contain the same ingredient more than once.");
    seen.add(ingredientId);
    const quantityPerServing = Number(item?.quantityPerServing);
    if (!Number.isFinite(quantityPerServing) || quantityPerServing <= 0) {
      throw createAuthError(400, "VALIDATION_ERROR", `items[${index}].quantityPerServing must be a finite number greater than zero.`);
    }
    return { ingredientId, quantityPerServing };
  });
}

export function validateAdjustment(body) {
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (!ADJUSTMENT_REASONS.has(reason)) throw createAuthError(400, "VALIDATION_ERROR", "reason must be physical_count, wastage, delivery_correction, or manual_correction.");
  const hasCountedQuantity = body?.countedQuantity !== undefined;
  if (hasCountedQuantity && reason !== "physical_count") throw createAuthError(400, "VALIDATION_ERROR", "countedQuantity is only supported for physical_count adjustments.");
  if (hasCountedQuantity) {
    const countedQuantity = nonNegative(body.countedQuantity, "countedQuantity", { required: true });
    if (body?.quantityDelta !== undefined) throw createAuthError(400, "VALIDATION_ERROR", "Provide either countedQuantity or quantityDelta, not both.");
    const note = optionalText(body?.note, "note", 2000);
    return { reason, countedQuantity, note: note ?? null };
  }
  const quantityDelta = Number(body?.quantityDelta);
  if (!Number.isFinite(quantityDelta) || quantityDelta === 0) throw createAuthError(400, "VALIDATION_ERROR", "quantityDelta must be a finite non-zero number.");
  if (reason === "wastage" && quantityDelta > 0) throw createAuthError(400, "VALIDATION_ERROR", "wastage quantityDelta must be negative.");
  if (reason === "delivery_correction" && quantityDelta < 0) throw createAuthError(400, "VALIDATION_ERROR", "delivery_correction quantityDelta must be positive.");
  const note = optionalText(body?.note, "note", 2000);
  return { reason, quantityDelta, note: note ?? null };
}
