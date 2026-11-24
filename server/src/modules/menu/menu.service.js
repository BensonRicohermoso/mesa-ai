import { supabase } from "../../config/supabase.js";
import { createAuthError } from "../../lib/errors.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

function toNumber(value) {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

function formatCategory(row) {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    itemCount: row.item_count ?? 0,
  };
}

function formatMenuItem(row) {
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.menu_categories?.name ?? null,
    name: row.name,
    description: row.description,
    imageUrl: row.image_url,
    price: toNumber(row.price),
    costPrice: toNumber(row.cost_price),
    isAvailable: row.is_available,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Categories ───────────────────────────────────────────────────────────────

export async function getAllCategories({ includeInactive = false } = {}) {
  // Load categories with a count of linked menu items.
  let query = supabase
    .from("menu_categories")
    .select("id,name,sort_order,is_active,created_at,updated_at,menu_items(count)")
    .order("sort_order", { ascending: true });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row) => ({
    ...formatCategory(row),
    itemCount: row.menu_items?.[0]?.count ?? 0,
  }));
}

export async function getCategoryById(id) {
  const { data, error } = await supabase
    .from("menu_categories")
    .select("id,name,sort_order,is_active,created_at,updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? formatCategory(data) : null;
}

export async function createCategory({ name, sortOrder, isActive }) {
  // Check if a soft-deactivated category with the same name exists so it can be restored.
  const { data: existing, error: lookupError } = await supabase
    .from("menu_categories")
    .select("id,is_active")
    .eq("name", name)
    .maybeSingle();

  if (lookupError) throw lookupError;

  if (existing) {
    if (existing.is_active) {
      throw createAuthError(
        409,
        "CATEGORY_DUPLICATE",
        `A category named "${name}" already exists.`
      );
    }

    const { data: restored, error: restoreError } = await supabase
      .from("menu_categories")
      .update({
        sort_order: sortOrder,
        is_active: true,
      })
      .eq("id", existing.id)
      .select("id,name,sort_order,is_active,created_at,updated_at")
      .single();

    if (restoreError) throw restoreError;
    return formatCategory(restored);
  }

  const { data, error } = await supabase
    .from("menu_categories")
    .insert({
      name,
      sort_order: sortOrder,
      is_active: isActive !== undefined ? isActive : true,
    })
    .select("id,name,sort_order,is_active,created_at,updated_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw createAuthError(
        409,
        "CATEGORY_DUPLICATE",
        `A category named "${name}" already exists.`
      );
    }
    throw error;
  }

  return formatCategory(data);
}

export async function deleteCategory(id) {
  const category = await getCategoryById(id);
  if (!category) {
    throw createAuthError(404, "CATEGORY_NOT_FOUND", "Category not found.");
  }

  const { data: linkedItems, error: itemsError } = await supabase
    .from("menu_items")
    .select("id,is_active")
    .eq("category_id", id);

  if (itemsError) throw itemsError;

  const hasActiveItems = (linkedItems || []).some((item) => item.is_active);
  if (hasActiveItems) {
    throw createAuthError(
      409,
      "CATEGORY_IN_USE",
      `Archive or move all active items in "${category.name}" before removing it.`
    );
  }

  // If archived items still reference this category, soft-deactivate to preserve order history.
  if ((linkedItems || []).length > 0) {
    const { error: softError } = await supabase
      .from("menu_categories")
      .update({ is_active: false })
      .eq("id", id);

    if (softError) throw softError;
    return { ok: true, id, softDeleted: true };
  }

  const { error: deleteError } = await supabase
    .from("menu_categories")
    .delete()
    .eq("id", id);

  if (deleteError) throw deleteError;
  return { ok: true, id, softDeleted: false };
}

async function assertNoActiveItemsInCategory(categoryId, categoryName, action) {
  const { data: activeItems, error } = await supabase
    .from("menu_items")
    .select("id")
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .limit(1);

  if (error) throw error;

  if ((activeItems || []).length > 0) {
    throw createAuthError(
      409,
      "CATEGORY_IN_USE",
      `Archive or move all active items in "${categoryName}" before ${action} it.`
    );
  }
}

export async function updateCategory(id, { name, sortOrder, isActive }) {
  if (isActive === false) {
    const existing = await getCategoryById(id);
    if (!existing) {
      throw createAuthError(404, "CATEGORY_NOT_FOUND", "Category not found.");
    }
    await assertNoActiveItemsInCategory(id, existing.name, "deactivating");
  }

  const updates = {};
  if (name !== undefined) updates.name = name;
  if (sortOrder !== undefined) updates.sort_order = sortOrder;
  if (isActive !== undefined) updates.is_active = isActive;

  const { data, error } = await supabase
    .from("menu_categories")
    .update(updates)
    .eq("id", id)
    .select("id,name,sort_order,is_active,created_at,updated_at")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw createAuthError(404, "CATEGORY_NOT_FOUND", "Category not found.");
    }
    if (error.code === "23505") {
      throw createAuthError(
        409,
        "CATEGORY_DUPLICATE",
        `A category named "${name}" already exists.`
      );
    }
    throw error;
  }

  return formatCategory(data);
}

export async function setCategoryStatus(id, isActive) {
  if (!isActive) {
    const existing = await getCategoryById(id);
    if (!existing) {
      throw createAuthError(404, "CATEGORY_NOT_FOUND", "Category not found.");
    }
    await assertNoActiveItemsInCategory(id, existing.name, "deactivating");
  }

  const { data, error } = await supabase
    .from("menu_categories")
    .update({ is_active: isActive })
    .eq("id", id)
    .select("id,name,sort_order,is_active,created_at,updated_at")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw createAuthError(404, "CATEGORY_NOT_FOUND", "Category not found.");
    }
    throw error;
  }

  return formatCategory(data);
}

// ── Menu Items ───────────────────────────────────────────────────────────────

export async function getAllMenuItems({ categoryId, includeInactive = true } = {}) {
  let query = supabase
    .from("menu_items")
    .select(
      "id,category_id,name,description,image_url,price,cost_price,is_available,is_active,created_at,updated_at,menu_categories(name)"
    )
    .order("name", { ascending: true });

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(formatMenuItem);
}

export async function getMenuItemById(id) {
  const { data, error } = await supabase
    .from("menu_items")
    .select(
      "id,category_id,name,description,image_url,price,cost_price,is_available,is_active,created_at,updated_at,menu_categories(name)"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? formatMenuItem(data) : null;
}

export async function createMenuItem({
  categoryId,
  name,
  description,
  imageUrl,
  price,
  costPrice,
  isAvailable,
  isActive,
}) {
  const { data, error } = await supabase
    .from("menu_items")
    .insert({
      category_id: categoryId,
      name,
      description: description ?? null,
      image_url: imageUrl ?? null,
      price,
      cost_price: costPrice,
      is_available: isAvailable !== undefined ? isAvailable : true,
      is_active: isActive !== undefined ? isActive : true,
    })
    .select(
      "id,category_id,name,description,image_url,price,cost_price,is_available,is_active,created_at,updated_at,menu_categories(name)"
    )
    .single();

  if (error) {
    if (error.code === "23503") {
      throw createAuthError(
        400,
        "INVALID_CATEGORY",
        "The specified category does not exist."
      );
    }
    throw error;
  }

  return formatMenuItem(data);
}

export async function updateMenuItem(id, {
  categoryId,
  name,
  description,
  imageUrl,
  price,
  costPrice,
  isAvailable,
  isActive,
}) {
  const updates = {};
  if (categoryId !== undefined) updates.category_id = categoryId;
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (imageUrl !== undefined) updates.image_url = imageUrl;
  if (price !== undefined) updates.price = price;
  if (costPrice !== undefined) updates.cost_price = costPrice;
  if (isAvailable !== undefined) updates.is_available = isAvailable;
  if (isActive !== undefined) updates.is_active = isActive;

  const { data, error } = await supabase
    .from("menu_items")
    .update(updates)
    .eq("id", id)
    .select(
      "id,category_id,name,description,image_url,price,cost_price,is_available,is_active,created_at,updated_at,menu_categories(name)"
    )
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw createAuthError(404, "ITEM_NOT_FOUND", "Menu item not found.");
    }
    if (error.code === "23503") {
      throw createAuthError(
        400,
        "INVALID_CATEGORY",
        "The specified category does not exist."
      );
    }
    throw error;
  }

  return formatMenuItem(data);
}

export async function setItemAvailability(id, isAvailable) {
  const { data, error } = await supabase
    .from("menu_items")
    .update({ is_available: isAvailable })
    .eq("id", id)
    .select(
      "id,category_id,name,description,image_url,price,cost_price,is_available,is_active,created_at,updated_at,menu_categories(name)"
    )
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw createAuthError(404, "ITEM_NOT_FOUND", "Menu item not found.");
    }
    throw error;
  }

  return formatMenuItem(data);
}

export async function setItemActiveStatus(id, isActive) {
  const { data, error } = await supabase
    .from("menu_items")
    .update({ is_active: isActive })
    .eq("id", id)
    .select(
      "id,category_id,name,description,image_url,price,cost_price,is_available,is_active,created_at,updated_at,menu_categories(name)"
    )
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw createAuthError(404, "ITEM_NOT_FOUND", "Menu item not found.");
    }
    throw error;
  }

  return formatMenuItem(data);
}
