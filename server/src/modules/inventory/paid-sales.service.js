import { supabase } from "../../config/supabase.js";
import { createAuthError } from "../../lib/errors.js";

const number = (value) => Number(value ?? 0);
const EXCLUDED_ORDER_STATUSES = new Set(["cancelled", "expired"]);
const SALES_QUERY_PAGE_SIZE = 1_000;
// At this volume, query plans should be reviewed; a derived consumption ledger
// can be introduced later without changing this module's public return shape.
const SALES_QUERY_REVIEW_THRESHOLD = 10_000;

function salesDate(isoTimestamp, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(isoTimestamp));
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function isPaidConfirmedOrder(order) {
  return Boolean(
    order &&
    order.payment_status === "paid" &&
    order.confirmed_at &&
    !EXCLUDED_ORDER_STATUSES.has(order.order_status)
  );
}

/**
 * Reduce paid order-item snapshots to daily menu-item quantities. This is the
 * one source of truth for inventory consumption and later demand forecasting.
 */
export function aggregatePaidMenuItemSales(rows, { timeZone = "Asia/Manila" } = {}) {
  const grouped = new Map();
  for (const row of rows || []) {
    const order = row.orders;
    if (!isPaidConfirmedOrder(order)) continue;

    const date = salesDate(order.confirmed_at, timeZone);
    const key = `${date}:${row.menu_item_id}`;
    const current = grouped.get(key) || {
      date,
      menuItemId: row.menu_item_id,
      itemName: row.item_name,
      quantity: 0,
      grossSales: 0,
      cogs: 0,
      orderItemCount: 0,
    };
    const quantity = number(row.quantity);
    current.quantity += quantity;
    current.grossSales += number(row.line_total);
    current.cogs += quantity * number(row.unit_cost);
    current.orderItemCount += 1;
    grouped.set(key, current);
  }
  return [...grouped.values()]
    .map((sale) => ({
      ...sale,
      realizedUnitPrice: sale.quantity ? sale.grossSales / sale.quantity : 0,
      realizedUnitCost: sale.quantity ? sale.cogs / sale.quantity : 0,
    }))
    .sort((left, right) => left.date.localeCompare(right.date) || left.itemName.localeCompare(right.itemName));
}

/** Fetch paid, non-cancelled, non-expired menu-item snapshots for a time range. */
export async function getPaidOrderItemSnapshots({ from, to } = {}) {
  if (typeof from !== "string" || !from) throw createAuthError(400, "VALIDATION_ERROR", "from must be an ISO timestamp.");
  if (to !== undefined && (typeof to !== "string" || !to)) throw createAuthError(400, "VALIDATION_ERROR", "to must be an ISO timestamp when provided.");

  let query = supabase
    .from("order_items")
    .select("id,menu_item_id,item_name,quantity,unit_price,unit_cost,line_total,orders!inner(payment_status,order_status,confirmed_at)")
    .eq("orders.payment_status", "paid")
    .not("orders.order_status", "in", "(cancelled,expired)")
    .gte("orders.confirmed_at", from);
  if (to) query = query.lt("orders.confirmed_at", to);
  query = query.order("id", { ascending: true });
  const rows = [];
  for (let offset = 0; ; offset += SALES_QUERY_PAGE_SIZE) {
    const { data, error } = await query.range(offset, offset + SALES_QUERY_PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < SALES_QUERY_PAGE_SIZE) break;
  }
  if (rows.length >= SALES_QUERY_REVIEW_THRESHOLD) {
    console.warn(`[inventory] Paid-sales query returned ${rows.length} snapshots; review a derived consumption ledger before this becomes a production bottleneck.`);
  }
  return rows;
}

export async function getPaidMenuItemSales({ from, to, timeZone = "Asia/Manila" } = {}) {
  return aggregatePaidMenuItemSales(await getPaidOrderItemSnapshots({ from, to }), { timeZone });
}

export function mapPaidSalesToRecipeConsumption(orderItemSnapshots, recipes, { timeZone = "Asia/Manila" } = {}) {
  const menuItemSales = aggregatePaidMenuItemSales(orderItemSnapshots, { timeZone });
  const recipesByMenuItem = new Map();
  for (const recipe of recipes || []) {
    const entries = recipesByMenuItem.get(recipe.menu_item_id) || [];
    entries.push(recipe);
    recipesByMenuItem.set(recipe.menu_item_id, entries);
  }

  const consumption = new Map();
  const missing = new Map();
  for (const snapshot of orderItemSnapshots || []) {
    if (!isPaidConfirmedOrder(snapshot.orders)) continue;
    const recipe = recipesByMenuItem.get(snapshot.menu_item_id);
    if (!recipe?.length) continue;
    for (const line of recipe) {
      const id = `${snapshot.id}:${line.ingredient_id}`;
      consumption.set(id, {
        id,
        ingredientId: line.ingredient_id,
        menuItemId: snapshot.menu_item_id,
        orderItemId: snapshot.id,
        confirmedAt: snapshot.orders.confirmed_at,
        quantity: number(snapshot.quantity) * number(line.quantity_per_serving),
      });
    }
  }

  for (const sale of menuItemSales) {
    if (recipesByMenuItem.has(sale.menuItemId)) continue;
    const current = missing.get(sale.menuItemId) || { menuItemId: sale.menuItemId, itemName: sale.itemName, quantity: 0, grossSales: 0, dates: [] };
    current.quantity += sale.quantity;
    current.grossSales += sale.grossSales;
    current.dates.push(sale.date);
    missing.set(sale.menuItemId, current);
  }

  return {
    menuItemSales,
    ingredientConsumption: [...consumption.values()],
    missingRecipeMenuItems: [...missing.values()].map((entry) => ({ ...entry, dates: [...new Set(entry.dates)].sort() })),
  };
}

/**
 * Apply current recipes to the reusable paid-sales data. Sales for a menu item
 * without a recipe are deliberately retained in missingRecipeMenuItems rather
 * than silently disappearing from the inventory audit.
 */
export async function getPaidIngredientConsumption({ from, to, timeZone = "Asia/Manila" } = {}) {
  const orderItemSnapshots = await getPaidOrderItemSnapshots({ from, to });
  const menuItemSales = aggregatePaidMenuItemSales(orderItemSnapshots, { timeZone });
  if (menuItemSales.length === 0) return { menuItemSales, ingredientConsumption: [], missingRecipeMenuItems: [] };
  const orderItemIds = orderItemSnapshots.map((item) => item.id);
  let query = supabase.from("order_item_ingredient_consumptions").select("order_item_id,ingredient_id,quantity,confirmed_at").in("order_item_id", orderItemIds);
  if (from) query = query.gte("confirmed_at", from);
  if (to) query = query.lt("confirmed_at", to);
  const { data: consumptions, error } = await query;
  if (error) throw error;
  const consumptionOrderItems = new Set((consumptions || []).map((entry) => entry.order_item_id));
  const missingByMenuItem = new Map();
  for (const item of orderItemSnapshots) {
    if (consumptionOrderItems.has(item.id)) continue;
    const current = missingByMenuItem.get(item.menu_item_id) || { menuItemId: item.menu_item_id, itemName: item.item_name, quantity: 0, grossSales: 0, dates: [] };
    current.quantity += number(item.quantity);
    current.grossSales += number(item.line_total);
    current.dates.push(salesDate(item.orders.confirmed_at, timeZone));
    missingByMenuItem.set(item.menu_item_id, current);
  }
  return {
    menuItemSales,
    ingredientConsumption: (consumptions || []).map((entry) => ({
      id: `${entry.order_item_id}:${entry.ingredient_id}`,
      ingredientId: entry.ingredient_id,
      orderItemId: entry.order_item_id,
      confirmedAt: entry.confirmed_at,
      quantity: number(entry.quantity),
    })),
    missingRecipeMenuItems: [...missingByMenuItem.values()].map((entry) => ({ ...entry, dates: [...new Set(entry.dates)].sort() })),
  };
}
