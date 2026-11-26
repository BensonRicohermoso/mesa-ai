/*
migration: 20261127100000_inventory_advisor_foundation.sql
purpose: Create inventory, recipe, planning-event, and recommendation acknowledgement foundations for the Owner Advisor.
author: Codex
created date: 2026-11-27
depends on: 20261126120000_security_and_order_workflow.sql
affected tables: suppliers, ingredients, menu_item_recipes, inventory_adjustments, planning_events, advisor_recommendation_acknowledgements
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_adjustment_reason') THEN
    CREATE TYPE public.inventory_adjustment_reason AS ENUM (
      'physical_count', 'wastage', 'delivery_correction', 'manual_correction'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'planning_event_type') THEN
    CREATE TYPE public.planning_event_type AS ENUM (
      'promotion', 'holiday', 'closure', 'large_order'
    );
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  contact_name text,
  phone text,
  email text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  base_unit text NOT NULL CHECK (base_unit IN ('g', 'ml', 'piece', 'pack', 'portion')),
  on_hand_quantity numeric(12,3) NOT NULL DEFAULT 0 CHECK (on_hand_quantity >= 0),
  par_level_quantity numeric(12,3) NOT NULL DEFAULT 0 CHECK (par_level_quantity >= 0),
  unit_cost numeric(12,2) NOT NULL DEFAULT 0 CHECK (unit_cost >= 0),
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  lead_time_days integer NOT NULL DEFAULT 0 CHECK (lead_time_days >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.menu_item_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
  quantity_per_serving numeric(12,3) NOT NULL CHECK (quantity_per_serving > 0),
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT menu_item_recipes_menu_item_ingredient_key UNIQUE (menu_item_id, ingredient_id)
);

CREATE TABLE IF NOT EXISTS public.inventory_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id uuid NOT NULL REFERENCES public.ingredients(id) ON DELETE RESTRICT,
  quantity_delta numeric(12,3) NOT NULL,
  reason public.inventory_adjustment_reason NOT NULL,
  note text,
  recorded_by uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  recorded_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.planning_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(btrim(title)) > 0),
  event_type public.planning_event_type NOT NULL,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  demand_adjustment_pct numeric(7,2) NOT NULL CHECK (demand_adjustment_pct BETWEEN -100 AND 500),
  note text,
  created_by uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT planning_events_valid_date_range CHECK (ends_on >= starts_on),
  CONSTRAINT planning_events_closure_adjustment CHECK (event_type <> 'closure' OR demand_adjustment_pct = -100)
);

CREATE TABLE IF NOT EXISTS public.advisor_recommendation_acknowledgements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_key text NOT NULL CHECK (char_length(btrim(recommendation_key)) > 0),
  acknowledged_by uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  acknowledged_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  note text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT advisor_recommendation_acknowledgements_key_staff_key
    UNIQUE NULLS NOT DISTINCT (recommendation_key, acknowledged_by)
);

COMMENT ON TABLE public.suppliers IS 'Ingredient suppliers used to group Advisor purchase recommendations.';
COMMENT ON TABLE public.ingredients IS 'Purchasable ingredients and their inventory-planning settings.';
COMMENT ON COLUMN public.ingredients.base_unit IS 'Normalized inventory unit: g, ml, piece, pack, or portion.';
COMMENT ON COLUMN public.ingredients.on_hand_quantity IS 'Initial/current counted quantity. Later services reconcile this with immutable adjustments and paid-sales consumption.';
COMMENT ON COLUMN public.ingredients.par_level_quantity IS 'Minimum safety buffer retained after lead-time forecast consumption.';
COMMENT ON COLUMN public.ingredients.unit_cost IS 'Estimated PHP cost of one base unit for purchase-list cost estimates.';
COMMENT ON COLUMN public.ingredients.lead_time_days IS 'Supplier lead time in whole days used by restock calculations.';
COMMENT ON TABLE public.menu_item_recipes IS 'Ingredient quantity consumed by one serving of a menu item.';
COMMENT ON TABLE public.inventory_adjustments IS 'Immutable inventory audit ledger for physical counts, wastage, delivery, and manual corrections.';
COMMENT ON COLUMN public.inventory_adjustments.quantity_delta IS 'Signed base-unit change; physical-count reconciliation may be zero.';
COMMENT ON TABLE public.planning_events IS 'Owner-entered future demand changes such as promotions, holidays, closures, and large orders.';
COMMENT ON TABLE public.advisor_recommendation_acknowledgements IS 'Owner acknowledgement audit for read-only Advisor recommendations.';

CREATE INDEX IF NOT EXISTS idx_ingredients_active_supplier ON public.ingredients(is_active, supplier_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_recipes_menu_item_id ON public.menu_item_recipes(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_recipes_ingredient_id ON public.menu_item_recipes(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_inventory_adjustments_ingredient_recorded_at ON public.inventory_adjustments(ingredient_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_planning_events_date_range ON public.planning_events(starts_on, ends_on);
CREATE INDEX IF NOT EXISTS idx_advisor_recommendation_acknowledgements_key ON public.advisor_recommendation_acknowledgements(recommendation_key);

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['suppliers', 'ingredients', 'menu_item_recipes', 'planning_events']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', table_name);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', table_name);
  END LOOP;
END;
$$;

-- The Express backend uses its service role and independently enforces admin
-- authorization. Direct Supabase access is additionally restricted to active admins.
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
$$;

REVOKE ALL ON FUNCTION public.is_current_user_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;

DO $$
DECLARE table_name text; policy_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'suppliers', 'ingredients', 'menu_item_recipes', 'inventory_adjustments',
    'planning_events', 'advisor_recommendation_acknowledgements'
  ]
  LOOP
    policy_name := table_name || '_admin_access';
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, table_name);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_current_user_admin()) WITH CHECK (public.is_current_user_admin())',
      policy_name, table_name
    );
  END LOOP;
END;
$$;

-- DOWN (manual rollback)
-- DROP POLICY IF EXISTS advisor_recommendation_acknowledgements_admin_access ON public.advisor_recommendation_acknowledgements;
-- DROP POLICY IF EXISTS planning_events_admin_access ON public.planning_events;
-- DROP POLICY IF EXISTS inventory_adjustments_admin_access ON public.inventory_adjustments;
-- DROP POLICY IF EXISTS menu_item_recipes_admin_access ON public.menu_item_recipes;
-- DROP POLICY IF EXISTS ingredients_admin_access ON public.ingredients;
-- DROP POLICY IF EXISTS suppliers_admin_access ON public.suppliers;
-- DROP FUNCTION IF EXISTS public.is_current_user_admin();
-- DROP TABLE IF EXISTS public.advisor_recommendation_acknowledgements;
-- DROP TABLE IF EXISTS public.planning_events;
-- DROP TABLE IF EXISTS public.inventory_adjustments;
-- DROP TABLE IF EXISTS public.menu_item_recipes;
-- DROP TABLE IF EXISTS public.ingredients;
-- DROP TABLE IF EXISTS public.suppliers;
-- DROP TYPE IF EXISTS public.planning_event_type;
-- DROP TYPE IF EXISTS public.inventory_adjustment_reason;
