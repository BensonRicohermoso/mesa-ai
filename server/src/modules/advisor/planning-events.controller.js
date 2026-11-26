import { validateEventId, validatePlanningEvent } from "./planning-events.validators.js";
import * as events from "./planning-events.service.js";
import { invalidatePlanningCache } from "../ai/planning.service.js";
export async function getPlanningEvents(req, res, next) { try { res.json({ events: await events.listPlanningEvents({ from: req.query.from, to: req.query.to }) }); } catch (error) { next(error); } }
export async function postPlanningEvent(req, res, next) { try { const event = await events.createPlanningEvent(validatePlanningEvent(req.body), req.auth.staff.id); invalidatePlanningCache(); res.status(201).json(event); } catch (error) { next(error); } }
export async function patchPlanningEvent(req, res, next) { try { const event = await events.updatePlanningEvent(validateEventId(req.params.id), validatePlanningEvent(req.body, { partial: true })); invalidatePlanningCache(); res.json(event); } catch (error) { next(error); } }
export async function removePlanningEvent(req, res, next) { try { const result = await events.deletePlanningEvent(validateEventId(req.params.id)); invalidatePlanningCache(); res.json(result); } catch (error) { next(error); } }
