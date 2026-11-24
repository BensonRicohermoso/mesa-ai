import {
  getAllCategories,
  createCategory,
  updateCategory,
  setCategoryStatus,
  getAllMenuItems,
  createMenuItem,
  updateMenuItem,
  setItemAvailability,
  setItemActiveStatus,
} from "./menu.service.js";
import {
  validateCategory,
  validateMenuItem,
  validateAvailabilityToggle,
  validateItemStatusToggle,
  validateCategoryStatusToggle,
} from "./menu.validators.js";

// ── Categories ───────────────────────────────────────────────────────────────

export async function getCategories(_req, res, next) {
  try {
    res.json({ categories: await getAllCategories() });
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
    const validated = validateCategory(req.body);
    const category = await updateCategory(req.params.id, validated);
    res.json(category);
  } catch (error) {
    next(error);
  }
}

export async function patchCategoryStatus(req, res, next) {
  try {
    const { isActive } = validateCategoryStatusToggle(req.body);
    const category = await setCategoryStatus(req.params.id, isActive);
    res.json(category);
  } catch (error) {
    next(error);
  }
}

// ── Menu Items ───────────────────────────────────────────────────────────────

export async function getMenuItems(req, res, next) {
  try {
    const categoryId = req.query.categoryId || undefined;
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
    const item = await createMenuItem(validated);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
}

export async function putMenuItem(req, res, next) {
  try {
    const validated = validateMenuItem(req.body);
    const item = await updateMenuItem(req.params.id, validated);
    res.json(item);
  } catch (error) {
    next(error);
  }
}

export async function patchAvailability(req, res, next) {
  try {
    const { isAvailable } = validateAvailabilityToggle(req.body);
    const item = await setItemAvailability(req.params.id, isAvailable);
    res.json(item);
  } catch (error) {
    next(error);
  }
}

export async function patchStatus(req, res, next) {
  try {
    const { isActive } = validateItemStatusToggle(req.body);
    const item = await setItemActiveStatus(req.params.id, isActive);
    res.json(item);
  } catch (error) {
    next(error);
  }
}
