import { createAuthError } from "../../lib/errors.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SAFE_URL_RE = /^(https?:\/\/|\/)/i;

/**
 * Validate that a route parameter is a valid UUID.
 */
export function validateUuidParam(value, fieldName = "id") {
  const id = typeof value === "string" ? value.trim() : "";
  if (!id || !UUID_RE.test(id)) {
    throw createAuthError(
      400,
      "VALIDATION_ERROR",
      `${fieldName} must be a valid UUID.`
    );
  }
  return id;
}

function parseNonNegativeNumber(value, fieldName, { integer = false } = {}) {
  const isValidType =
    typeof value === "number" ||
    (typeof value === "string" && value.trim() !== "");

  if (!isValidType) {
    throw createAuthError(
      400,
      "VALIDATION_ERROR",
      `${fieldName} must be a non-negative ${integer ? "integer" : "number"}.`
    );
  }

  const num = Number(value);
  if (!Number.isFinite(num) || num < 0 || (integer && !Number.isInteger(num))) {
    throw createAuthError(
      400,
      "VALIDATION_ERROR",
      `${fieldName} must be a finite non-negative ${integer ? "integer" : "number"}.`
    );
  }

  return num;
}

/**
 * Validate a category creation or update payload.
 */
export function validateCategory(body) {
  const name =
    typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 100) {
    throw createAuthError(
      400,
      "VALIDATION_ERROR",
      "name is required and must be at most 100 characters."
    );
  }

  const sortOrder =
    body?.sortOrder !== undefined
      ? parseNonNegativeNumber(body.sortOrder, "sortOrder", { integer: true })
      : 0;

  const result = { name, sortOrder };

  if (body?.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") {
      throw createAuthError(
        400,
        "VALIDATION_ERROR",
        "isActive must be a boolean."
      );
    }
    result.isActive = body.isActive;
  }

  return result;
}

/**
 * Validate a menu item creation or update payload.
 */
export function validateMenuItem(body) {
  const categoryId =
    typeof body?.categoryId === "string" ? body.categoryId.trim() : "";
  if (!categoryId || !UUID_RE.test(categoryId)) {
    throw createAuthError(
      400,
      "VALIDATION_ERROR",
      "categoryId must be a valid UUID."
    );
  }

  const name =
    typeof body?.name === "string" ? body.name.trim() : "";
  if (!name || name.length > 150) {
    throw createAuthError(
      400,
      "VALIDATION_ERROR",
      "name is required and must be at most 150 characters."
    );
  }

  const description =
    typeof body?.description === "string" ? body.description.trim() || null : null;

  const rawImageUrl =
    typeof body?.imageUrl === "string" ? body.imageUrl.trim() : "";
  if (rawImageUrl && !SAFE_URL_RE.test(rawImageUrl)) {
    throw createAuthError(
      400,
      "VALIDATION_ERROR",
      "imageUrl must start with http://, https://, or /."
    );
  }
  const imageUrl = rawImageUrl || null;

  const price = parseNonNegativeNumber(body?.price, "price");
  const costPrice = parseNonNegativeNumber(body?.costPrice, "costPrice");

  const result = { categoryId, name, description, imageUrl, price, costPrice };

  if (body?.isAvailable !== undefined) {
    if (typeof body.isAvailable !== "boolean") {
      throw createAuthError(
        400,
        "VALIDATION_ERROR",
        "isAvailable must be a boolean."
      );
    }
    result.isAvailable = body.isAvailable;
  }

  if (body?.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") {
      throw createAuthError(
        400,
        "VALIDATION_ERROR",
        "isActive must be a boolean."
      );
    }
    result.isActive = body.isActive;
  }

  return result;
}

/**
 * Validate an availability toggle payload.
 */
export function validateAvailabilityToggle(body) {
  if (typeof body?.isAvailable !== "boolean") {
    throw createAuthError(
      400,
      "VALIDATION_ERROR",
      "isAvailable must be a boolean."
    );
  }
  return { isAvailable: body.isAvailable };
}

/**
 * Validate an item active-status toggle payload.
 */
export function validateItemStatusToggle(body) {
  if (typeof body?.isActive !== "boolean") {
    throw createAuthError(
      400,
      "VALIDATION_ERROR",
      "isActive must be a boolean."
    );
  }
  return { isActive: body.isActive };
}

/**
 * Validate a category active-status toggle payload.
 */
export function validateCategoryStatusToggle(body) {
  if (typeof body?.isActive !== "boolean") {
    throw createAuthError(
      400,
      "VALIDATION_ERROR",
      "isActive must be a boolean."
    );
  }
  return { isActive: body.isActive };
}
