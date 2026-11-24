import { createAuthError } from "../../lib/errors.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PIN_RE = /^\d{4}$/;
const ALLOWED_ROLES = ["admin", "cashier", "kitchen"];

function assertJsonObject(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw createAuthError(
      400,
      "VALIDATION_ERROR",
      "Request body must be a JSON object."
    );
  }
}

function validatePinValue(pinCode) {
  if (pinCode === null || pinCode === "") {
    return null;
  }
  if (typeof pinCode !== "string" || !PIN_RE.test(pinCode.trim())) {
    throw createAuthError(
      400,
      "VALIDATION_ERROR",
      "pinCode must be exactly 4 numeric digits."
    );
  }
  return pinCode.trim();
}

function validateRoleValue(role) {
  if (typeof role !== "string" || !ALLOWED_ROLES.includes(role)) {
    throw createAuthError(
      400,
      "VALIDATION_ERROR",
      `role must be one of: ${ALLOWED_ROLES.join(", ")}.`
    );
  }
  return role;
}

function validateFullNameValue(fullName) {
  const trimmed = typeof fullName === "string" ? fullName.trim() : "";
  if (trimmed.length < 2 || trimmed.length > 100) {
    throw createAuthError(
      400,
      "VALIDATION_ERROR",
      "fullName is required and must be between 2 and 100 characters."
    );
  }
  return trimmed;
}

function validatePasswordValue(password) {
  if (typeof password !== "string" || password.length < 6 || password.length > 128) {
    throw createAuthError(
      400,
      "VALIDATION_ERROR",
      "password must be between 6 and 128 characters."
    );
  }
  return password;
}

/**
 * Validate a staff UUID route parameter.
 */
export function validateStaffId(id) {
  if (typeof id !== "string" || !UUID_RE.test(id)) {
    throw createAuthError(
      400,
      "VALIDATION_ERROR",
      "Staff id must be a valid UUID."
    );
  }
  return id;
}

/**
 * Validate payload for provisioning a new staff account.
 */
export function validateProvisionStaff(body) {
  assertJsonObject(body);

  const fullName = validateFullNameValue(body.fullName);
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!email || !EMAIL_RE.test(email)) {
    throw createAuthError(
      400,
      "VALIDATION_ERROR",
      "A valid email address is required."
    );
  }

  const password = validatePasswordValue(body.password);
  const role = validateRoleValue(body.role);

  const result = {
    fullName,
    email,
    password,
    role,
    pinCode:
      body.pinCode !== undefined ? validatePinValue(body.pinCode) : null,
  };

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
 * Validate payload for updating an existing staff account.
 */
export function validateUpdateStaff(body) {
  assertJsonObject(body);

  const updates = {};

  if (body.fullName !== undefined) {
    updates.fullName = validateFullNameValue(body.fullName);
  }

  if (body.role !== undefined) {
    updates.role = validateRoleValue(body.role);
  }

  if (body.pinCode !== undefined) {
    updates.pinCode = validatePinValue(body.pinCode);
  }

  if (body.password !== undefined && body.password !== "") {
    updates.password = validatePasswordValue(body.password);
  }

  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") {
      throw createAuthError(
        400,
        "VALIDATION_ERROR",
        "isActive must be a boolean."
      );
    }
    updates.isActive = body.isActive;
  }

  if (Object.keys(updates).length === 0) {
    throw createAuthError(
      400,
      "VALIDATION_ERROR",
      "At least one staff field must be provided for update."
    );
  }

  return updates;
}

/**
 * Validate payload for activating or deactivating a staff account.
 */
export function validateStaffStatus(body) {
  assertJsonObject(body);

  if (typeof body.isActive !== "boolean") {
    throw createAuthError(
      400,
      "VALIDATION_ERROR",
      "isActive must be a boolean."
    );
  }

  return { isActive: body.isActive };
}
