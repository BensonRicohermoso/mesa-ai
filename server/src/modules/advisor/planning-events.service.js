import { supabase } from "../../config/supabase.js";
import { createAuthError } from "../../lib/errors.js";

const fields = "id,title,event_type,starts_on,ends_on,demand_adjustment_pct,note,created_by,created_at,updated_at";
const number = (value) => Number(value ?? 0);
const format = (row) => ({ id: row.id, title: row.title, eventType: row.event_type, startsOn: row.starts_on, endsOn: row.ends_on, demandAdjustmentPct: number(row.demand_adjustment_pct), note: row.note, createdBy: row.created_by, createdAt: row.created_at, updatedAt: row.updated_at });

export async function listPlanningEvents({ from, to }) {
  let query = supabase.from("planning_events").select(fields).order("starts_on");
  if (from) query = query.gte("ends_on", from);
  if (to) query = query.lte("starts_on", to);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(format);
}
export async function createPlanningEvent(input, staffId) {
  const { data, error } = await supabase.from("planning_events").insert({ title: input.title, event_type: input.eventType, starts_on: input.startsOn, ends_on: input.endsOn, demand_adjustment_pct: input.demandAdjustmentPct, note: input.note ?? null, created_by: staffId }).select(fields).single();
  if (error) throw error;
  return format(data);
}
export async function updatePlanningEvent(id, input) {
  const updates = {};
  const columns = { title: "title", eventType: "event_type", startsOn: "starts_on", endsOn: "ends_on", demandAdjustmentPct: "demand_adjustment_pct", note: "note" };
  for (const [key, column] of Object.entries(columns)) if (input[key] !== undefined) updates[column] = input[key];
  const { data, error } = await supabase.from("planning_events").update(updates).eq("id", id).select(fields).single();
  if (error?.code === "PGRST116") throw createAuthError(404, "PLANNING_EVENT_NOT_FOUND", "Planning event not found.");
  if (error) throw error;
  return format(data);
}
export async function deletePlanningEvent(id) {
  const { error, count } = await supabase.from("planning_events").delete({ count: "exact" }).eq("id", id);
  if (error) throw error;
  if (!count) throw createAuthError(404, "PLANNING_EVENT_NOT_FOUND", "Planning event not found.");
  return { ok: true, id };
}
