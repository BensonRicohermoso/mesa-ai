import {
  getAllCategories,
  createCategory,
  updateCategory,
  setCategoryStatus,
  deleteCategory,
  getAllMenuItems,
  createMenuItem,
  updateMenuItem,
  setItemAvailability,
  setItemActiveStatus,
} from "./menu.service.js";
import {
  validateUuidParam,
  validateCategory,
  validateMenuItem,
  validateAvailabilityToggle,
  validateItemStatusToggle,
  validateCategoryStatusToggle,
} from "./menu.validators.js";
import { invalidatePlanningCache } from "../ai/planning.service.js";

// ── Categories ───────────────────────────────────────────────────────────────

export async function getCategories(req, res, next) {
  try {
    const includeInactive = req.query.includeInactive === "true";
    res.json({ categories: await getAllCategories({ includeInactive }) });
  } catch (error) {
    next(error);
  }
}

export async function postCategory(req, res, next) {
  try {
    const validated = validateCategory(req.body);
    const category = await createCategory(validated);
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
}

export async function putCategory(req, res, next) {
  try {
    const id = validateUuidParam(req.params.id, "categoryId");
    const validated = validateCategory(req.body);
    const category = await updateCategory(id, validated);
    res.json(category);
  } catch (error) {
    next(error);
  }
}

export async function patchCategoryStatus(req, res, next) {
  try {
    const id = validateUuidParam(req.params.id, "categoryId");
    const { isActive } = validateCategoryStatusToggle(req.body);
    const category = await setCategoryStatus(id, isActive);
    res.json(category);
  } catch (error) {
    next(error);
  }
}

export async function removeCategory(req, res, next) {
  try {
    const id = validateUuidParam(req.params.id, "categoryId");
    const result = await deleteCategory(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// ── Menu Items ───────────────────────────────────────────────────────────────

export async function getMenuItems(req, res, next) {
  try {
    const categoryId = req.query.categoryId
      ? validateUuidParam(req.query.categoryId, "categoryId")
      : undefined;
    const includeInactive = req.query.includeInactive !== "false";
    const items = await getAllMenuItems({ categoryId, includeInactive });
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export async function postMenuItem(req, res, next) {
  try {
    const validated = validateMenuItem(req.body);
    const item = await createMenuItem(validated); invalidatePlanningCache();
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
}

export async function putMenuItem(req, res, next) {
  try {
    const id = validateUuidParam(req.params.id, "itemId");
    const validated = validateMenuItem(req.body);
    const item = await updateMenuItem(id, validated); invalidatePlanningCache();
    res.json(item);
  } catch (error) {
    next(error);
  }
}

export async function patchAvailability(req, res, next) {
  try {
    const id = validateUuidParam(req.params.id, "itemId");
    const { isAvailable } = validateAvailabilityToggle(req.body);
    const item = await setItemAvailability(id, isAvailable); invalidatePlanningCache();
    res.json(item);
  } catch (error) {
    next(error);
  }
}

export async function patchStatus(req, res, next) {
  try {
    const id = validateUuidParam(req.params.id, "itemId");
    const { isActive } = validateItemStatusToggle(req.body);
    const item = await setItemActiveStatus(id, isActive); invalidatePlanningCache();
    res.json(item);
  } catch (error) {
    next(error);
  }
}
