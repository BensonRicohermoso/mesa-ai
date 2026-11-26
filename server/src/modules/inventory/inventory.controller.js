import * as inventory from "./inventory.service.js";
import { validateAdjustment, validateIngredient, validateRecipe, validateSupplier, validateUuidParam } from "./inventory.validators.js";

export async function getSuppliers(req, res, next) { try { res.json({ suppliers: await inventory.listSuppliers({ includeInactive: req.query.includeInactive === "true" }) }); } catch (error) { next(error); } }
export async function postSupplier(req, res, next) { try { res.status(201).json(await inventory.createSupplier(validateSupplier(req.body))); } catch (error) { next(error); } }
export async function patchSupplier(req, res, next) { try { res.json(await inventory.updateSupplier(validateUuidParam(req.params.id, "supplierId"), validateSupplier(req.body, { partial: true }))); } catch (error) { next(error); } }
export async function getIngredients(req, res, next) { try { res.json({ ingredients: await inventory.listIngredients({ includeInactive: req.query.includeInactive === "true" }) }); } catch (error) { next(error); } }
export async function postIngredient(req, res, next) { try { res.status(201).json(await inventory.createIngredient(validateIngredient(req.body))); } catch (error) { next(error); } }
export async function patchIngredient(req, res, next) { try { res.json(await inventory.updateIngredient(validateUuidParam(req.params.id, "ingredientId"), validateIngredient(req.body, { partial: true }))); } catch (error) { next(error); } }
export async function getRecipe(req, res, next) { try { res.json(await inventory.getRecipe(validateUuidParam(req.params.menuItemId, "menuItemId"))); } catch (error) { next(error); } }
export async function putRecipe(req, res, next) { try { res.json(await inventory.replaceRecipe(validateUuidParam(req.params.menuItemId, "menuItemId"), validateRecipe(req.body))); } catch (error) { next(error); } }
export async function postAdjustment(req, res, next) { try { res.status(201).json(await inventory.createAdjustment(validateUuidParam(req.params.id, "ingredientId"), validateAdjustment(req.body), req.auth.staff.id)); } catch (error) { next(error); } }
export async function getAdjustments(req, res, next) { try { const ingredientId = validateUuidParam(req.params.id, "ingredientId"); res.json({ adjustments: await inventory.listAdjustments(ingredientId), stock: await inventory.getIngredientStock(ingredientId) }); } catch (error) { next(error); } }
