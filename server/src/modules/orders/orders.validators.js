const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Validate an order request and merge repeated menu item lines.
export function validateCreateOrder(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throwValidation("Request body must be a JSON object.");
  }

  if (typeof body.tableCode !== "string" || body.tableCode.trim() === "") {
    throwValidation("tableCode is required.", "tableCode");
  }
  if (
    typeof body.idempotencyKey !== "string" ||
    body.idempotencyKey.trim() === ""
  ) {
    throwValidation("idempotencyKey is required.", "idempotencyKey");
  }
  if (
    body.customerNotes !== undefined &&
    (typeof body.customerNotes !== "string" ||
      body.customerNotes.length > 300)
  ) {
    throwValidation(
      "customerNotes must be a string no longer than 300 characters.",
      "customerNotes"
    );
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    throwValidation("items must contain at least one item.", "items");
  }
  if (body.items.length > 30) {
    throwValidation("items cannot contain more than 30 lines.", "items");
  }

  const merged = new Map();
  for (const item of body.items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throwValidation("Each item must be a JSON object.", "items");
    }
    if (typeof item.menuItemId !== "string" || !UUID_PATTERN.test(item.menuItemId)) {
      throwValidation("menuItemId must be a valid UUID.", "menuItemId");
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
      throwValidation("quantity must be an integer from 1 to 20.", "quantity");
    }
    if (
      item.notes !== undefined &&
      (typeof item.notes !== "string" || item.notes.length > 200)
    ) {
      throwValidation(
        "notes must be a string no longer than 200 characters.",
        "notes"
      );
    }

    const existing = merged.get(item.menuItemId);
    const quantity = existing ? existing.quantity + item.quantity : item.quantity;
    if (quantity > 20) {
      throwValidation(
        "Merged quantity cannot exceed 20 for a menu item.",
        "quantity"
      );
    }
    merged.set(item.menuItemId, {
      menuItemId: item.menuItemId,
      quantity,
      notes: existing?.notes || item.notes || null,
    });
  }

  return {
    tableCode: body.tableCode.trim(),
    idempotencyKey: body.idempotencyKey.trim(),
    customerNotes: body.customerNotes?.trim() || null,
    items: Array.from(merged.values()),
  };
}

// Create a validation error with a field and a stable API code.
function throwValidation(message, field) {
  const error = new Error(message);
  error.statusCode = 400;
  error.code = "VALIDATION_ERROR";
  if (field) error.details = { field };
  throw error;
}
