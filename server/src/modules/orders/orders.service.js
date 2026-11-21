import { supabase } from "../../config/supabase.js";
import { env } from "../../config/env.js";

// Convert PostgreSQL numeric values into JSON numbers.
function toNumber(value) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

// Format a database order without exposing cost or staff data.
function formatOrder(order, includeStatusTimestamps = false) {
  const table = order.table || order.dining_tables || {};
  const formatted = {
    orderRef: order.orderRef || order.order_ref,
    orderStatus: order.orderStatus || order.order_status,
    paymentStatus: order.paymentStatus || order.payment_status,
    subtotal: toNumber(order.subtotal),
    total: toNumber(order.total),
    expiresAt: order.expiresAt || order.expires_at,
    table: {
      code: table.code || table.table_code,
      label: table.label,
    },
    items: (order.items || []).map((item) => ({
      name: item.name || item.item_name,
      quantity: item.quantity,
      unitPrice: toNumber(item.unitPrice ?? item.unit_price),
      lineTotal: toNumber(item.lineTotal ?? item.line_total),
      notes: item.notes ?? null,
    })),
  };

  if (includeStatusTimestamps) {
    formatted.createdAt = order.createdAt || order.created_at;
    formatted.confirmedAt = order.confirmedAt || order.confirmed_at;
    formatted.preparingAt = order.preparingAt || order.preparing_at;
    formatted.readyAt = order.readyAt || order.ready_at;
    formatted.completedAt = order.completedAt || order.completed_at;
  }

  return formatted;
}

// Look up a single active table by its QR table code.
export async function getActiveTable(tableCode) {
  const { data, error } = await supabase
    .from("dining_tables")
    .select("table_code,label,is_active")
    .eq("table_code", tableCode)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Load customer-visible menu categories and active menu items.
export async function getCustomerMenu() {
  const { data, error } = await supabase
    .from("menu_categories")
    .select(
      "id,name,sort_order,menu_items(id,name,description,image_url,price,is_available)"
    )
    .eq("is_active", true)
    .eq("menu_items.is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  return (data || []).map((category) => ({
    id: category.id,
    name: category.name,
    sortOrder: category.sort_order,
    items: (category.menu_items || []).map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      imageUrl: item.image_url,
      price: toNumber(item.price),
      isAvailable: item.is_available,
    })),
  }));
}

// Atomically create or repeat an order through the database RPC.
export async function createOrder(validated) {
  const { data, error } = await supabase.rpc("create_order", {
    p_table_code: validated.tableCode,
    p_idempotency_key: validated.idempotencyKey,
    p_customer_notes: validated.customerNotes,
    p_items: validated.items,
    p_expiry_minutes: env.ORDER_EXPIRY_MINUTES,
  });

  if (error) throw error;
  if (!data) {
    const rpcError = new Error("The order could not be created.");
    rpcError.statusCode = 500;
    rpcError.code = "INTERNAL_ERROR";
    throw rpcError;
  }
  if (data.errorCode) {
    const rpcError = new Error(data.message);
    rpcError.code = data.errorCode;
    rpcError.statusCode =
      data.errorCode === "TABLE_INVALID" || data.errorCode === "ITEM_MISSING"
        ? 404
        : data.errorCode === "ITEM_INACTIVE" || data.errorCode === "ITEM_SOLD_OUT"
          ? 409
          : 400;
    rpcError.details = {
      itemName: data.itemName,
      menuItemId: data.menuItemId,
    };
    throw rpcError;
  }

  return {
    isNew: data.isNew,
    order: formatOrder(data),
  };
}

// Fetch an order by reference and return only customer-safe fields.
export async function getOrderByReference(orderRef) {
  const { data, error } = await supabase
    .from("orders")
    .select(
      "order_ref,order_status,payment_status,subtotal,total,expires_at,created_at,confirmed_at,preparing_at,ready_at,completed_at,dining_tables(table_code,label),order_items(item_name,quantity,unit_price,line_total,notes)"
    )
    .eq("order_ref", orderRef)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return formatOrder(
    {
      ...data,
      table: data.dining_tables,
      items: data.order_items,
    },
    true
  );
}
