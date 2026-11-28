/*
migration: 20261127120000_inventory_consumption_snapshots.sql
purpose: Preserve the recipe quantities used when a paid order is confirmed.
depends on: 20261127110000_inventory_recipe_replacement.sql
*/

CREATE TABLE IF NOT EXISTS public.order_item_ingredient_consumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
  quantity numeric(12,3) NOT NULL CHECK (quantity > 0),
  confirmed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT order_item_ingredient_consumptions_unique UNIQUE (order_item_id, ingredient_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_consumptions_ingredient_confirmed
  ON public.order_item_ingredient_consumptions(ingredient_id, confirmed_at);

CREATE OR REPLACE FUNCTION public.snapshot_paid_order_recipe_consumption()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND OLD.payment_status IS DISTINCT FROM 'paid' AND NEW.confirmed_at IS NOT NULL THEN
    INSERT INTO public.order_item_ingredient_consumptions (order_item_id, ingredient_id, quantity, confirmed_at)
    SELECT item.id, recipe.ingredient_id, item.quantity * recipe.quantity_per_serving, NEW.confirmed_at
    FROM public.order_items item
    JOIN public.menu_item_recipes recipe ON recipe.menu_item_id = item.menu_item_id
    WHERE item.order_id = NEW.id
    ON CONFLICT (order_item_id, ingredient_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS snapshot_paid_order_recipe_consumption ON public.orders;
CREATE TRIGGER snapshot_paid_order_recipe_consumption
AFTER UPDATE OF payment_status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.snapshot_paid_order_recipe_consumption();

-- One-time baseline for orders paid before this migration. Future recipe edits
-- cannot alter these rows; their historical quantities are now fixed.
INSERT INTO public.order_item_ingredient_consumptions (order_item_id, ingredient_id, quantity, confirmed_at)
SELECT item.id, recipe.ingredient_id, item.quantity * recipe.quantity_per_serving, orders.confirmed_at
FROM public.order_items item
JOIN public.orders orders ON orders.id = item.order_id
JOIN public.menu_item_recipes recipe ON recipe.menu_item_id = item.menu_item_id
WHERE orders.payment_status = 'paid'
  AND orders.order_status NOT IN ('cancelled', 'expired')
  AND orders.confirmed_at IS NOT NULL
ON CONFLICT (order_item_id, ingredient_id) DO NOTHING;

ALTER TABLE public.order_item_ingredient_consumptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS order_item_ingredient_consumptions_admin_access ON public.order_item_ingredient_consumptions;
CREATE POLICY order_item_ingredient_consumptions_admin_access ON public.order_item_ingredient_consumptions
  FOR ALL TO authenticated USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin());

REVOKE ALL ON FUNCTION public.snapshot_paid_order_recipe_consumption() FROM PUBLIC;

-- DOWN (manual rollback)
-- DROP TRIGGER IF EXISTS snapshot_paid_order_recipe_consumption ON public.orders;
-- DROP FUNCTION IF EXISTS public.snapshot_paid_order_recipe_consumption();
-- DROP TABLE IF EXISTS public.order_item_ingredient_consumptions;
