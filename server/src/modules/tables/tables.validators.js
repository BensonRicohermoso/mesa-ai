import { createAuthError } from "../../lib/errors.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TABLE_CODE_RE = /^[A-Z0-9]{1,20}$/;

/**
 * Validate a dining table UUID route parameter.
 */
export function validateTableId(id) {
  if (typeof id !== "string" || !UUID_RE.test(id)) {
    throw createAuthError(
      400,
      "VALIDATION_ERROR",
      "Table id must be a valid UUID."
    );
  }
  return id;
}

/**
 * Validate a dining table creation or update payload.
 */
export function validateTable(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw createAuthError(
      400,
      "VALIDATION_ERROR",
      "Request body must be a JSON object."
    );
  }

  const tableCode =
    typeof body.tableCode === "string"
      ? body.tableCode.trim().toUpperCase()
      : "";

  if (!TABLE_CODE_RE.test(tableCode)) {
    throw createAuthError(
      400,
      "VALIDATION_ERROR",
      "tableCode is required and must be 1 to 20 alphanumeric characters."
    );
  }

  const label =
    typeof body.label === "string" ? body.label.trim() : "";

  if (!label || label.length > 50) {
    throw createAuthError(
      400,
      "VALIDATION_ERROR",
      "label is required and must be at most 50 characters."
    );
  }

  const result = { tableCode, label };

  if (body.isActive !== undefined) {
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
 * Validate a dining table active-status toggle payload.
 */
export function validateTableStatus(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw createAuthError(
      400,
      "VALIDATION_ERROR",
      "Request body must be a JSON object."
    );
  }

  if (typeof body.isActive !== "boolean") {
    throw createAuthError(
      400,
      "VALIDATION_ERROR",
      "isActive must be a boolean."
    );
  }

  return { isActive: body.isActive };
}
