import { supabase } from "../../config/supabase.js";
import { createAuthError } from "../../lib/errors.js";

const supplierFields = "id,name,contact_name,phone,email,is_active,created_at,updated_at";
const ingredientFields = "id,name,base_unit,on_hand_quantity,par_level_quantity,unit_cost,supplier_id,lead_time_days,is_active,created_at,updated_at,suppliers(id,name,is_active)";

const number = (value) => Number(value ?? 0);

function formatSupplier(row) {
  return { id: row.id, name: row.name, contactName: row.contact_name, phone: row.phone, email: row.email, isActive: row.is_active, createdAt: row.created_at, updatedAt: row.updated_at };
}
function formatIngredient(row) {
  return { id: row.id, name: row.name, baseUnit: row.base_unit, onHandQuantity: number(row.on_hand_quantity), parLevelQuantity: number(row.par_level_quantity), unitCost: number(row.unit_cost), supplierId: row.supplier_id, supplier: row.suppliers ? { id: row.suppliers.id, name: row.suppliers.name, isActive: row.suppliers.is_active } : null, leadTimeDays: row.lead_time_days, isActive: row.is_active, createdAt: row.created_at, updatedAt: row.updated_at };
}
function mapDbError(error, notFoundCode, message) {
  if (error?.code === "PGRST116") throw createAuthError(404, notFoundCode, message);
  if (error?.code === "23505") throw createAuthError(409, "DUPLICATE_RECORD", "A record with that name already exists.");
  if (error?.code === "23503") throw createAuthError(400, "INVALID_REFERENCE", "A referenced record does not exist.");
  throw error;
}

export async function listSuppliers({ includeInactive = false } = {}) {
  let query = supabase.from("suppliers").select(supplierFields).order("name");
  if (!includeInactive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(formatSupplier);
}
export async function createSupplier(input) {
  const { data, error } = await supabase.from("suppliers").insert({ name: input.name, contact_name: input.contactName ?? null, phone: input.phone ?? null, email: input.email ?? null, is_active: input.isActive ?? true }).select(supplierFields).single();
  if (error) mapDbError(error, "SUPPLIER_NOT_FOUND", "Supplier not found.");
  return formatSupplier(data);
}
export async function updateSupplier(id, input) {
  const updates = {};
  if (input.name !== undefined) updates.name = input.name;
  if (input.contactName !== undefined) updates.contact_name = input.contactName;
  if (input.phone !== undefined) updates.phone = input.phone;
  if (input.email !== undefined) updates.email = input.email;
  if (input.isActive !== undefined) updates.is_active = input.isActive;
  const { data, error } = await supabase.from("suppliers").update(updates).eq("id", id).select(supplierFields).single();
  if (error) mapDbError(error, "SUPPLIER_NOT_FOUND", "Supplier not found.");
  return formatSupplier(data);
}

export async function listIngredients({ includeInactive = false } = {}) {
  let query = supabase.from("ingredients").select(ingredientFields).order("name");
  if (!includeInactive) query = query.eq("is_active", true);
  const { data, error } = await query;
  if (error) throw error;
  return Promise.all((data || []).map(async (row) => ({ ...formatIngredient(row), stock: await getIngredientStock(row.id, row) })));
}
export async function createIngredient(input) {
  const { data, error } = await supabase.from("ingredients").insert({ name: input.name, base_unit: input.baseUnit, on_hand_quantity: input.onHandQuantity, par_level_quantity: input.parLevelQuantity, unit_cost: input.unitCost, supplier_id: input.supplierId ?? null, lead_time_days: input.leadTimeDays, is_active: input.isActive ?? true }).select(ingredientFields).single();
  if (error) mapDbError(error, "INGREDIENT_NOT_FOUND", "Ingredient not found.");
  return formatIngredient(data);
}
export async function updateIngredient(id, input) {
  const updates = {};
  const columns = { name: "name", baseUnit: "base_unit", onHandQuantity: "on_hand_quantity", parLevelQuantity: "par_level_quantity", unitCost: "unit_cost", supplierId: "supplier_id", leadTimeDays: "lead_time_days", isActive: "is_active" };
  for (const [key, column] of Object.entries(columns)) if (input[key] !== undefined) updates[column] = input[key];
  const { data, error } = await supabase.from("ingredients").update(updates).eq("id", id).select(ingredientFields).single();
  if (error) mapDbError(error, "INGREDIENT_NOT_FOUND", "Ingredient not found.");
  return formatIngredient(data);
}

export async function getRecipe(menuItemId) {
  const { data: menuItem, error: itemError } = await supabase.from("menu_items").select("id,name").eq("id", menuItemId).maybeSingle();
  if (itemError) throw itemError;
  if (!menuItem) throw createAuthError(404, "MENU_ITEM_NOT_FOUND", "Menu item not found.");
  const { data, error } = await supabase.from("menu_item_recipes").select("id,ingredient_id,quantity_per_serving,created_at,updated_at,ingredients(id,name,base_unit,is_active)").eq("menu_item_id", menuItemId).order("created_at");
  if (error) throw error;
  return { menuItem: { id: menuItem.id, name: menuItem.name }, items: (data || []).map((row) => ({ id: row.id, ingredientId: row.ingredient_id, ingredientName: row.ingredients?.name ?? null, baseUnit: row.ingredients?.base_unit ?? null, quantityPerServing: number(row.quantity_per_serving), createdAt: row.created_at, updatedAt: row.updated_at })) };
}
export async function replaceRecipe(menuItemId, items) {
  const { error } = await supabase.rpc("replace_menu_item_recipe", { p_menu_item_id: menuItemId, p_items: items.map((item) => ({ ingredient_id: item.ingredientId, quantity_per_serving: item.quantityPerServing })) });
  if (error) {
    const token = String(error.message || "").match(/(MENU_ITEM_NOT_FOUND|INGREDIENT_NOT_FOUND|INGREDIENT_INACTIVE)/)?.[1];
    if (token) throw createAuthError(token === "MENU_ITEM_NOT_FOUND" ? 404 : 400, token, token === "INGREDIENT_INACTIVE" ? "Recipes can only use active ingredients." : token === "INGREDIENT_NOT_FOUND" ? "A referenced ingredient does not exist." : "Menu item not found.");
    throw error;
  }
  return getRecipe(menuItemId);
}

export async function createAdjustment(ingredientId, input, staffId) {
  // A physical count is stored as a reconciliation delta, preserving the immutable
  // ledger while letting the caller submit the quantity they actually counted.
  const quantityDelta = input.countedQuantity === undefined
    ? input.quantityDelta
    : input.countedQuantity - (await getIngredientStock(ingredientId)).calculatedOnHand;
  const { data, error } = await supabase.from("inventory_adjustments").insert({ ingredient_id: ingredientId, quantity_delta: quantityDelta, reason: input.reason, note: input.note, recorded_by: staffId }).select("id,ingredient_id,quantity_delta,reason,note,recorded_by,recorded_at,created_at").single();
  if (error) mapDbError(error, "INGREDIENT_NOT_FOUND", "Ingredient not found.");
  return formatAdjustment(data);
}
function formatAdjustment(row) { return { id: row.id, ingredientId: row.ingredient_id, quantityDelta: number(row.quantity_delta), reason: row.reason, note: row.note, recordedBy: row.recorded_by, recordedAt: row.recorded_at, createdAt: row.created_at }; }
export async function listAdjustments(ingredientId) {
  const { data, error } = await supabase.from("inventory_adjustments").select("id,ingredient_id,quantity_delta,reason,note,recorded_by,recorded_at,created_at").eq("ingredient_id", ingredientId).order("recorded_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(formatAdjustment);
}

/** Pure, auditable stock-ledger reduction. Sales quantities are already expressed in this ingredient's base unit. */
export function calculateStockLedger({ openingQuantity, adjustments, sales }) {
  const events = [
    ...(adjustments || []).map((entry) => ({ kind: "adjustment", at: entry.recordedAt || entry.recorded_at, quantity: number(entry.quantityDelta ?? entry.quantity_delta), reason: entry.reason, id: entry.id })),
    ...(sales || []).map((entry) => ({ kind: "sale", at: entry.confirmedAt || entry.confirmed_at, quantity: number(entry.quantity), id: entry.id })),
  ].sort((a, b) => new Date(a.at) - new Date(b.at));
  let balance = number(openingQuantity);
  let latestCount = null;
  for (const event of events) {
    balance += event.kind === "sale" ? -event.quantity : event.quantity;
    if (event.kind === "adjustment" && event.reason === "physical_count") latestCount = { recordedAt: event.at, balanceAfterCount: balance };
  }
  const afterCount = latestCount ? events.filter((event) => new Date(event.at) > new Date(latestCount.recordedAt)) : events;
  const adjustmentTotal = events.filter((event) => event.kind === "adjustment").reduce((total, event) => total + event.quantity, 0);
  const paidSalesConsumption = events.filter((event) => event.kind === "sale").reduce((total, event) => total + event.quantity, 0);
  const adjustmentsAfterCount = afterCount.filter((event) => event.kind === "adjustment").reduce((total, event) => total + event.quantity, 0);
  const paidSalesConsumptionAfterCount = afterCount.filter((event) => event.kind === "sale").reduce((total, event) => total + event.quantity, 0);
  return { calculatedOnHand: balance, latestPhysicalCountAt: latestCount?.recordedAt ?? null, countBaselineQuantity: latestCount?.balanceAfterCount ?? number(openingQuantity), adjustmentTotal, paidSalesConsumption, adjustmentsAfterCount, paidSalesConsumptionAfterCount };
}

async function loadIngredientSales(ingredientId, since) {
  const { data: recipes, error: recipeError } = await supabase.from("menu_item_recipes").select("menu_item_id,quantity_per_serving").eq("ingredient_id", ingredientId);
  if (recipeError) throw recipeError;
  if (!recipes?.length) return [];
  const recipeByItem = new Map(recipes.map((recipe) => [recipe.menu_item_id, number(recipe.quantity_per_serving)]));
  const { data, error } = await supabase.from("order_items").select("id,menu_item_id,quantity,orders!inner(payment_status,order_status,confirmed_at)").in("menu_item_id", [...recipeByItem.keys()]).eq("orders.payment_status", "paid").gte("orders.confirmed_at", since);
  if (error) throw error;
  return (data || []).map((item) => ({ id: item.id, confirmedAt: item.orders.confirmed_at, quantity: number(item.quantity) * recipeByItem.get(item.menu_item_id) }));
}
export async function getIngredientStock(ingredientId, providedIngredient = null) {
  let ingredient = providedIngredient;
  if (!ingredient) {
    const { data, error } = await supabase.from("ingredients").select(ingredientFields).eq("id", ingredientId).maybeSingle();
    if (error) throw error;
    if (!data) throw createAuthError(404, "INGREDIENT_NOT_FOUND", "Ingredient not found.");
    ingredient = data;
  }
  const [{ data: adjustments, error: adjustmentsError }, sales] = await Promise.all([
    supabase.from("inventory_adjustments").select("id,quantity_delta,reason,recorded_at").eq("ingredient_id", ingredientId).order("recorded_at", { ascending: true }),
    loadIngredientSales(ingredientId, ingredient.created_at),
  ]);
  if (adjustmentsError) throw adjustmentsError;
  const result = calculateStockLedger({ openingQuantity: ingredient.on_hand_quantity, adjustments, sales });
  const openingQuantity = number(ingredient.on_hand_quantity);
  return {
    ...result,
    openingQuantity,
    adjustmentCount: adjustments?.length ?? 0,
    paidSalesLineCount: sales.length,
    calculationInputs: {
      openingQuantity,
      adjustmentTotal: result.adjustmentTotal,
      paidSalesConsumption: result.paidSalesConsumption,
      adjustmentsAfterCount: result.adjustmentsAfterCount,
      paidSalesConsumptionAfterCount: result.paidSalesConsumptionAfterCount,
    },
  };
}
