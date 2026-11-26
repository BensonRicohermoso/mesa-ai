import crypto from "node:crypto";
import { supabase } from "../../config/supabase.js";
import { createAuthError } from "../../lib/errors.js";
import { getPaidMenuItemSales } from "../inventory/paid-sales.service.js";
import { getIngredientStock } from "../inventory/inventory.service.js";
import { listPlanningEvents } from "../advisor/planning-events.service.js";
import { aiService } from "./ai.service.js";

const TTL_MS = 5 * 60 * 1000;
const cache = new Map();
const number = (value) => Number(value ?? 0);
const dateString = (date) => date.toISOString().slice(0, 10);
const addDays = (date, amount) => new Date(date.getTime() + amount * 86400000);
const weekday = (date) => date.getUTCDay();
const keyFor = (...parts) => crypto.createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 20);
function todayInTimezone(timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return new Date(`${get("year")}-${get("month")}-${get("day")}T00:00:00.000Z`);
}

export function invalidatePlanningCache() { cache.clear(); }

export function validatePlanningInput(input = {}) {
  if (![30, 60, 90].includes(Number(input.horizonDays))) throw createAuthError(400, "VALIDATION_ERROR", "horizonDays must be 30, 60, or 90.");
  if (input.tz !== undefined && input.tz !== "Asia/Manila") throw createAuthError(400, "VALIDATION_ERROR", "tz must be Asia/Manila in v1.");
  if (input.sourceMode !== undefined && !["live", "preview"].includes(input.sourceMode)) throw createAuthError(400, "VALIDATION_ERROR", "sourceMode must be live or preview.");
  if (input.forceRefresh !== undefined && typeof input.forceRefresh !== "boolean") throw createAuthError(400, "VALIDATION_ERROR", "forceRefresh must be a boolean.");
  return { horizonDays: Number(input.horizonDays), tz: "Asia/Manila", sourceMode: input.sourceMode || "live", forceRefresh: Boolean(input.forceRefresh) };
}

function completedHistoryRange(today) {
  const end = addDays(today, -((weekday(today) + 6) % 7 + 1)); // previous Sunday
  return { start: addDays(end, -83), end };
}
function eventAdjustment(events, date) {
  return events.filter((event) => event.startsOn <= date && event.endsOn >= date).reduce((sum, event) => sum + number(event.demandAdjustmentPct), 0);
}

export async function computePlanningFacts({ horizonDays, tz }) {
  const today = todayInTimezone(tz);
  const history = completedHistoryRange(today);
  const historyFrom = dateString(history.start);
  const historyToExclusive = dateString(addDays(history.end, 1));
  const horizonEnd = dateString(addDays(today, horizonDays - 1));
  const [sales, eventsResult, menuResult, recipeResult, ingredientsResult, ordersResult, adjustmentResult] = await Promise.all([
    getPaidMenuItemSales({ from: `${historyFrom}T00:00:00.000Z`, to: `${historyToExclusive}T00:00:00.000Z`, timeZone: tz }),
    listPlanningEvents({ from: dateString(today), to: horizonEnd }),
    supabase.from("menu_items").select("id,name,cost_price,is_active").eq("is_active", true).order("name"),
    supabase.from("menu_item_recipes").select("menu_item_id,ingredient_id,quantity_per_serving"),
    supabase.from("ingredients").select("id,name,base_unit,on_hand_quantity,par_level_quantity,unit_cost,supplier_id,lead_time_days,is_active,created_at,suppliers(id,name)").eq("is_active", true),
    supabase.from("orders").select("id,confirmed_at").eq("payment_status", "paid").not("order_status", "in", "(cancelled,expired)").gte("confirmed_at", `${historyFrom}T00:00:00.000Z`).lt("confirmed_at", `${historyToExclusive}T00:00:00.000Z`),
    supabase.from("inventory_adjustments").select("ingredient_id,quantity_delta,reason,recorded_at").gte("recorded_at", addDays(today, -28).toISOString()),
  ]);
  for (const result of [menuResult, recipeResult, ingredientsResult, ordersResult, adjustmentResult]) if (result.error) throw result.error;
  const menuItems = menuResult.data || [];
  const events = eventsResult;
  const observedDays = 84;
  const salesByItem = new Map();
  for (const sale of sales) {
    const current = salesByItem.get(sale.menuItemId) || { total: 0, sales: 0, cogs: 0, count: 0, weekday: new Map() };
    current.total += sale.quantity; current.sales += sale.grossSales; current.cogs += sale.cogs; current.count += sale.orderItemCount;
    current.weekday.set(weekday(new Date(`${sale.date}T00:00:00Z`)), (current.weekday.get(weekday(new Date(`${sale.date}T00:00:00Z`))) || 0) + sale.quantity);
    salesByItem.set(sale.menuItemId, current);
  }
  const dailyPrep = [];
  const forecasts = [];
  for (let offset = 0; offset < horizonDays; offset += 1) {
    const date = dateString(addDays(today, offset)); const adjustment = Math.max(-100, eventAdjustment(events, date));
    const rows = [];
    for (const item of menuItems) {
      const stats = salesByItem.get(item.id); const dow = weekday(new Date(`${date}T00:00:00Z`));
      const base = stats ? (stats.weekday.get(dow) ?? stats.total / observedDays) / (stats.weekday.has(dow) ? 12 : 1) : 0;
      const quantity = Math.max(0, base * (1 + adjustment / 100));
      if (quantity || adjustment > 0) rows.push({ menuItemId: item.id, itemName: item.name, forecastQuantity: quantity, prepTarget: Math.max(0, Math.round(quantity)), direction: adjustment >= 15 ? "prepare_more" : adjustment <= -15 ? "reduce_prep" : "maintain", baseUnitForecast: base });
      forecasts.push({ date, menuItemId: item.id, quantity, item });
    }
    dailyPrep.push({ date, eventAdjustmentPct: adjustment, items: rows });
  }
  const totals = forecasts.reduce((total, forecast) => {
    const stats = salesByItem.get(forecast.menuItemId); const price = stats?.total ? stats.sales / stats.total : 0; const cost = stats?.total ? stats.cogs / stats.total : number(forecast.item.cost_price);
    total.units += forecast.quantity; total.sales += forecast.quantity * price; total.cogs += forecast.quantity * cost; return total;
  }, { units: 0, sales: 0, cogs: 0 });
  const recipesByItem = new Map(); for (const recipe of recipeResult.data || []) { const lines = recipesByItem.get(recipe.menu_item_id) || []; lines.push(recipe); recipesByItem.set(recipe.menu_item_id, lines); }
  const ingredientForecasts = new Map();
  for (const forecast of forecasts) for (const recipe of recipesByItem.get(forecast.menuItemId) || []) ingredientForecasts.set(recipe.ingredient_id, (ingredientForecasts.get(recipe.ingredient_id) || 0) + forecast.quantity * number(recipe.quantity_per_serving));
  const recentAdjustmentsByIngredient = new Map();
  for (const adjustment of adjustmentResult.data || []) { const lines = recentAdjustmentsByIngredient.get(adjustment.ingredient_id) || []; lines.push(adjustment); recentAdjustmentsByIngredient.set(adjustment.ingredient_id, lines); }
  const restockBySupplier = new Map(); const alerts = []; const setupWarnings = [];
  for (const ingredient of ingredientsResult.data || []) {
    const stock = await getIngredientStock(ingredient.id, ingredient); const dailyUse = (ingredientForecasts.get(ingredient.id) || 0) / horizonDays; const leadUse = dailyUse * number(ingredient.lead_time_days); const required = leadUse + number(ingredient.par_level_quantity); const buy = Math.max(0, required - stock.calculatedOnHand);
    const urgency = stock.calculatedOnHand < 0 || stock.calculatedOnHand - leadUse <= 0 ? "critical" : buy > 0 ? "high" : stock.calculatedOnHand < dailyUse * 30 + number(ingredient.par_level_quantity) ? "monitor" : null;
    if (!ingredient.supplier_id) setupWarnings.push({ type: "missing_supplier", entityId: ingredient.id, message: `${ingredient.name} needs a supplier.` });
    if (!number(ingredient.par_level_quantity)) setupWarnings.push({ type: "missing_par_level", entityId: ingredient.id, message: `${ingredient.name} has no par level.` });
    if (!stock.latestPhysicalCountAt || new Date(stock.latestPhysicalCountAt) < addDays(today, -7)) setupWarnings.push({ type: "stale_count", entityId: ingredient.id, message: `${ingredient.name} needs a physical count.` });
    const recentAdjustments = recentAdjustmentsByIngredient.get(ingredient.id) || [];
    const wastage = recentAdjustments.filter((entry) => entry.reason === "wastage").reduce((sum, entry) => sum + Math.abs(number(entry.quantity_delta)), 0);
    const recordedOutgoing = recentAdjustments.filter((entry) => number(entry.quantity_delta) < 0).reduce((sum, entry) => sum + Math.abs(number(entry.quantity_delta)), 0) + dailyUse * 28;
    if (recordedOutgoing > 0 && wastage / recordedOutgoing >= 0.1) alerts.push({ type: "waste_watch", severity: "monitor", recommendationKey: keyFor("waste", ingredient.id, wastage), message: `${ingredient.name} has elevated recorded wastage.` });
    if (dailyUse > 0 && stock.calculatedOnHand > dailyUse * 30) alerts.push({ type: "slow_moving_stock", severity: "monitor", recommendationKey: keyFor("slow", ingredient.id, stock.calculatedOnHand), message: `${ingredient.name} exceeds 30 days of projected use.` });
    if (urgency) { const row = { ingredientId: ingredient.id, ingredientName: ingredient.name, baseUnit: ingredient.base_unit, calculatedOnHand: stock.calculatedOnHand, projectedLeadTimeUse: leadUse, parLevelQuantity: number(ingredient.par_level_quantity), recommendedPurchaseQuantity: buy, leadTimeDays: ingredient.lead_time_days, estimatedCost: buy * number(ingredient.unit_cost), urgency, recommendationKey: keyFor("restock", ingredient.id, dateString(today), stock.calculatedOnHand, buy) }; const supplierKey = ingredient.supplier_id || "missing"; const group = restockBySupplier.get(supplierKey) || { supplierId: ingredient.supplier_id, supplierName: ingredient.suppliers?.name || "Needs supplier setup", items: [] }; group.items.push(row); restockBySupplier.set(supplierKey, group); alerts.push({ type: "stock", severity: urgency, recommendationKey: row.recommendationKey, message: `${urgency === "critical" ? "Buy" : "Plan"} ${Math.ceil(buy)} ${ingredient.base_unit} ${ingredient.name}.` }); }
  }
  for (const item of menuItems) if (!recipesByItem.has(item.id)) setupWarnings.push({ type: "missing_recipe", entityId: item.id, message: `${item.name} has no recipe.` });
  const expectedOrders = (ordersResult.data || []).length / 12 * (horizonDays / 7);
  const grossProfit = totals.sales - totals.cogs;
  return { forecast: { horizonDays, expectedOrders: Math.round(expectedOrders), expectedGrossSales: totals.sales, expectedCOGS: totals.cogs, expectedGrossProfit: grossProfit, expectedGrossMarginPct: totals.sales ? grossProfit / totals.sales * 100 : 0, confidence: sales.length >= 8 ? "high" : sales.length >= 4 ? "medium" : "low", lookbackStart: historyFrom, observedDays }, dailyPrep, restockBySupplier: [...restockBySupplier.values()], alerts: alerts.sort((a, b) => (a.severity === "critical" ? -1 : 1)), setupWarnings };
}

export async function getPlanning(input) {
  const request = validatePlanningInput(input); const cacheKey = `${request.horizonDays}:${request.tz}:${request.sourceMode}`; const cached = cache.get(cacheKey);
  if (!request.forceRefresh && cached && cached.expiresAt > Date.now()) return { ...cached.value, meta: { ...cached.value.meta, cached: true } };
  const facts = await computePlanningFacts(request);
  const ai = await aiService.interpretPlanning(facts);
  const value = { facts, interpretation: ai.interpretation, meta: { ...ai.meta, generatedAt: new Date().toISOString(), cached: false, sourceMode: request.sourceMode } };
  cache.set(cacheKey, { expiresAt: Date.now() + TTL_MS, value }); return value;
}
