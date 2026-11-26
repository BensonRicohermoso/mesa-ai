import express from "express";
import { authenticate, requireRoles } from "../../middleware/auth.js";
import { getAdjustments, getConsumptionAudit, getIngredients, getRecipe, getSuppliers, patchIngredient, patchSupplier, postAdjustment, postIngredient, postSupplier, putRecipe } from "./inventory.controller.js";

const router = express.Router();
router.use(authenticate, requireRoles("admin"));
router.get("/suppliers", getSuppliers);
router.post("/suppliers", postSupplier);
router.patch("/suppliers/:id", patchSupplier);
router.get("/ingredients", getIngredients);
router.post("/ingredients", postIngredient);
router.patch("/ingredients/:id", patchIngredient);
router.get("/consumption", getConsumptionAudit);
router.get("/menu-items/:menuItemId/recipe", getRecipe);
router.put("/menu-items/:menuItemId/recipe", putRecipe);
router.post("/ingredients/:id/adjustments", postAdjustment);
router.get("/ingredients/:id/adjustments", getAdjustments);
export default router;
