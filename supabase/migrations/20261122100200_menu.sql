/*
migration: 20261122100200_menu.sql
purpose: Create menu categories and menu items with historical order-safe soft deletion.
author: TBD
created date: 2026-11-22
depends on: 20261122100100_staff_and_tables.sql
affected tables: menu_categories, menu_items
*/

CREATE TABLE IF NOT EXISTS public.menu_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.menu_categories IS 'Menu category definitions used to organize customer-facing items.';
COMMENT ON COLUMN public.menu_categories.sort_order IS 'Display order for menu categories.';
COMMENT ON COLUMN public.menu_categories.is_active IS 'Whether the category is available in the customer menu.';

CREATE TABLE IF NOT EXISTS public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.menu_categories(id),
  name text NOT NULL,
  description text,
  image_url text,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  cost_price numeric(10,2) NOT NULL CHECK (cost_price >= 0),
  is_available boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.menu_items IS 'Sellable menu items. Items use soft deletion so order item snapshots remain valid.';
COMMENT ON COLUMN public.menu_items.price IS 'Current selling price in PHP.';
COMMENT ON COLUMN public.menu_items.cost_price IS 'Estimated cost per serving in PHP used for gross profit calculations.';
COMMENT ON COLUMN public.menu_items.is_available IS 'Manual sold-out toggle for customer-facing availability.';
COMMENT ON COLUMN public.menu_items.is_active IS 'Soft-delete flag; inactive items must not be displayed or hard-deleted.';

-- DOWN (manual rollback)
-- DROP TABLE IF EXISTS public.menu_items;
-- DROP TABLE IF EXISTS public.menu_categories;
