import { env } from "../../config/server-config.js";
import { supabase } from "../../config/supabase.js";
import { createAuthError } from "../../lib/errors.js";

const TABLE_SELECT = "id,table_code,label,is_active,created_at,updated_at";

/**
 * Resolve the customer QR ordering URL for a table code.
 */
export function getCustomerQrUrl(tableCode) {
  const baseUrl = (env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "");
  return `${baseUrl}/t/${encodeURIComponent(tableCode)}`;
}

function formatTable(row) {
  return {
    id: row.id,
    tableCode: row.table_code,
    label: row.label,
    isActive: row.is_active,
    customerUrl: getCustomerQrUrl(row.table_code),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Load all dining tables ordered by table code.
 */
export async function getAllTables() {
  const { data, error } = await supabase
    .from("dining_tables")
    .select(TABLE_SELECT)
    .order("table_code", { ascending: true });

  if (error) throw error;
  return (data || []).map(formatTable);
}

/**
 * Create a new dining table record.
 */
export async function createTable({ tableCode, label, isActive }) {
  const { data, error } = await supabase
    .from("dining_tables")
    .insert({
      table_code: tableCode,
      label,
      is_active: isActive !== undefined ? isActive : true,
    })
    .select(TABLE_SELECT)
    .single();

  if (error) {
    if (error.code === "23505") {
      throw createAuthError(
        409,
        "TABLE_DUPLICATE",
        `A table with code "${tableCode}" already exists.`
      );
    }
    throw error;
  }

  return formatTable(data);
}

/**
 * Update an existing dining table's code, label, or active state.
 */
export async function updateTable(id, { tableCode, label, isActive }) {
  const updates = {
    table_code: tableCode,
    label,
  };
  if (isActive !== undefined) {
    updates.is_active = isActive;
  }

  const { data, error } = await supabase
    .from("dining_tables")
    .update(updates)
    .eq("id", id)
    .select(TABLE_SELECT)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw createAuthError(404, "TABLE_NOT_FOUND", "Table not found.");
    }
    if (error.code === "23505") {
      throw createAuthError(
        409,
        "TABLE_DUPLICATE",
        `A table with code "${tableCode}" already exists.`
      );
    }
    throw error;
  }

  return formatTable(data);
}

/**
 * Activate or deactivate a dining table without deleting historical orders.
 */
export async function setTableStatus(id, isActive) {
  const { data, error } = await supabase
    .from("dining_tables")
    .update({ is_active: isActive })
    .eq("id", id)
    .select(TABLE_SELECT)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw createAuthError(404, "TABLE_NOT_FOUND", "Table not found.");
    }
    throw error;
  }

  return formatTable(data);
}
