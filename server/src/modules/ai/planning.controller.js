import { supabase } from "../../config/supabase.js";
import { createAuthError } from "../../lib/errors.js";
import { getPlanning } from "./planning.service.js";

const csv = (rows) => rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
export async function postPlanning(req, res, next) { try { res.json(await getPlanning(req.body || {})); } catch (error) { next(error); } }
export async function acknowledgeRecommendation(req, res, next) { try {
  const key = typeof req.params.key === "string" ? req.params.key.trim() : "";
  if (!key || key.length > 300) throw createAuthError(400, "VALIDATION_ERROR", "recommendation key is required.");
  const note = req.body?.note === undefined ? null : typeof req.body.note === "string" ? req.body.note.trim() || null : (() => { throw createAuthError(400, "VALIDATION_ERROR", "note must be text."); })();
  const { data, error } = await supabase.from("advisor_recommendation_acknowledgements").upsert({ recommendation_key: key, acknowledged_by: req.auth.staff.id, note }, { onConflict: "recommendation_key,acknowledged_by" }).select("id,recommendation_key,acknowledged_by,acknowledged_at,note").single();
  if (error) throw error;
  res.status(201).json({ id: data.id, recommendationKey: data.recommendation_key, acknowledgedBy: data.acknowledged_by, acknowledgedAt: data.acknowledged_at, note: data.note });
} catch (error) { next(error); } }
export async function exportPlanning(req, res, next) { try {
  const type = req.query.type; const date = req.query.date;
  if (!["prep", "purchase"].includes(type)) throw createAuthError(400, "VALIDATION_ERROR", "type must be prep or purchase.");
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw createAuthError(400, "VALIDATION_ERROR", "date must use YYYY-MM-DD.");
  const planning = await getPlanning({ horizonDays: 30, tz: "Asia/Manila", sourceMode: "live" });
  let rows;
  if (type === "prep") { const day = planning.facts.dailyPrep.find((entry) => entry.date === date); rows = [["Menu item", "Forecast portions", "Prep target", "Direction"], ...(day?.items || []).map((item) => [item.itemName, item.forecastQuantity.toFixed(2), item.prepTarget, item.direction])]; }
  else rows = [["Supplier", "Ingredient", "Unit", "On hand", "Lead-time use", "Par level", "Buy", "Lead time days", "Estimated cost"], ...planning.facts.restockBySupplier.flatMap((group) => group.items.map((item) => [group.supplierName, item.ingredientName, item.baseUnit, item.calculatedOnHand, item.projectedLeadTimeUse, item.parLevelQuantity, item.recommendedPurchaseQuantity, item.leadTimeDays, item.estimatedCost]))];
  res.type("text/csv").attachment(`${type}-${date}.csv`).send(csv(rows));
} catch (error) { next(error); } }
