import * as inventory from "./inventory.service.js";
import { getPaidIngredientConsumption } from "./paid-sales.service.js";
import { invalidatePlanningCache } from "../ai/planning.service.js";
import { validateAdjustment, validateIngredient, validateRecipe, validateSupplier, validateUuidParam } from "./inventory.validators.js";

export async function getSuppliers(req, res, next) { try { res.json({ suppliers: await inventory.listSuppliers({ includeInactive: req.query.includeInactive === "true" }) }); } catch (error) { next(error); } }
export async function postSupplier(req, res, next) { try { const result = await inventory.createSupplier(validateSupplier(req.body)); invalidatePlanningCache(); res.status(201).json(result); } catch (error) { next(error); } }
export async function patchSupplier(req, res, next) { try { const result = await inventory.updateSupplier(validateUuidParam(req.params.id, "supplierId"), validateSupplier(req.body, { partial: true })); invalidatePlanningCache(); res.json(result); } catch (error) { next(error); } }
export async function getIngredients(req, res, next) { try { res.json({ ingredients: await inventory.listIngredients({ includeInactive: req.query.includeInactive === "true" }) }); } catch (error) { next(error); } }
export async function postIngredient(req, res, next) { try { const result = await inventory.createIngredient(validateIngredient(req.body)); invalidatePlanningCache(); res.status(201).json(result); } catch (error) { next(error); } }
export async function patchIngredient(req, res, next) { try { const result = await inventory.updateIngredient(validateUuidParam(req.params.id, "ingredientId"), validateIngredient(req.body, { partial: true })); invalidatePlanningCache(); res.json(result); } catch (error) { next(error); } }
export async function getRecipe(req, res, next) { try { res.json(await inventory.getRecipe(validateUuidParam(req.params.menuItemId, "menuItemId"))); } catch (error) { next(error); } }
export async function putRecipe(req, res, next) { try { const result = await inventory.replaceRecipe(validateUuidParam(req.params.menuItemId, "menuItemId"), validateRecipe(req.body)); invalidatePlanningCache(); res.json(result); } catch (error) { next(error); } }
export async function postAdjustment(req, res, next) { try { const result = await inventory.createAdjustment(validateUuidParam(req.params.id, "ingredientId"), validateAdjustment(req.body), req.auth.staff.id); invalidatePlanningCache(); res.status(201).json(result); } catch (error) { next(error); } }
export async function getAdjustments(req, res, next) { try { const ingredientId = validateUuidParam(req.params.id, "ingredientId"); res.json({ adjustments: await inventory.listAdjustments(ingredientId), stock: await inventory.getIngredientStock(ingredientId) }); } catch (error) { next(error); } }
export async function getConsumptionAudit(req, res, next) { try {
  const from = typeof req.query.from === "string" ? req.query.from : new Date(0).toISOString();
  const to = typeof req.query.to === "string" ? req.query.to : undefined;
  res.json(await getPaidIngredientConsumption({ from, to }));
} catch (error) { next(error); } }
