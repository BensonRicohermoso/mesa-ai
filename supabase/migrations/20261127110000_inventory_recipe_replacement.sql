/*
migration: 20261127110000_inventory_recipe_replacement.sql
purpose: Provide an atomic, validated recipe replacement operation for inventory setup.
*/

CREATE OR REPLACE FUNCTION public.replace_menu_item_recipe(
  p_menu_item_id uuid,
  p_items jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.menu_items WHERE id = p_menu_item_id) THEN
    RAISE EXCEPTION 'MENU_ITEM_NOT_FOUND';
  END IF;

  IF jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'INVALID_RECIPE_ITEMS';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_items) AS item(ingredient_id uuid, quantity_per_serving numeric)
    LEFT JOIN public.ingredients ingredient ON ingredient.id = item.ingredient_id
    WHERE ingredient.id IS NULL
  ) THEN
    RAISE EXCEPTION 'INGREDIENT_NOT_FOUND';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_items) AS item(ingredient_id uuid, quantity_per_serving numeric)
    JOIN public.ingredients ingredient ON ingredient.id = item.ingredient_id
    WHERE NOT ingredient.is_active
  ) THEN
    RAISE EXCEPTION 'INGREDIENT_INACTIVE';
  END IF;

  DELETE FROM public.menu_item_recipes WHERE menu_item_id = p_menu_item_id;
  INSERT INTO public.menu_item_recipes (menu_item_id, ingredient_id, quantity_per_serving)
  SELECT p_menu_item_id, item.ingredient_id, item.quantity_per_serving
  FROM jsonb_to_recordset(p_items) AS item(ingredient_id uuid, quantity_per_serving numeric);
END;
$$;

REVOKE ALL ON FUNCTION public.replace_menu_item_recipe(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_menu_item_recipe(uuid, jsonb) TO service_role;
