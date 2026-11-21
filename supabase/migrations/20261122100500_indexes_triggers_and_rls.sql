/*
migration: 20261122100500_indexes_triggers_and_rls.sql
purpose: Add analytics and operations indexes, updated-at triggers, and deny-by-default RLS.
author: TBD
created date: 2026-11-22
depends on: 20261122100400_payments.sql
affected tables: staff_profiles, dining_tables, menu_categories, menu_items, order_counters, orders, order_items, order_status_history, payments
*/

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON public.orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON public.orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_unpaid_expires_at
  ON public.orders(expires_at)
  WHERE payment_status = 'unpaid';
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON public.order_items(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_created
  ON public.order_status_history(order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_confirmed_at ON public.payments(confirmed_at);
CREATE INDEX IF NOT EXISTS idx_payments_method ON public.payments(method);

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'staff_profiles',
    'dining_tables',
    'menu_categories',
    'menu_items',
    'orders'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS set_updated_at ON public.%I',
      table_name
    );
    EXECUTE format(
      'CREATE TRIGGER set_updated_at
       BEFORE UPDATE ON public.%I
       FOR EACH ROW
       EXECUTE FUNCTION public.set_updated_at()',
      table_name
    );
  END LOOP;
END;
$$;

-- The Express backend uses the Supabase service role and enforces application roles itself.
-- RLS is enabled on every table, but no anon/public policies are granted.
-- The anon key must never be given table access.
DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'staff_profiles',
    'dining_tables',
    'menu_categories',
    'menu_items',
    'order_counters',
    'orders',
    'order_items',
    'order_status_history',
    'payments'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END;
$$;

COMMENT ON TABLE public.staff_profiles IS 'Application staff profiles; RLS is deny-by-default because the Express service role is the data-access boundary.';
COMMENT ON TABLE public.dining_tables IS 'Dining tables; RLS is deny-by-default because the Express service role is the data-access boundary.';
COMMENT ON TABLE public.menu_categories IS 'Menu categories; RLS is deny-by-default because the Express service role is the data-access boundary.';
COMMENT ON TABLE public.menu_items IS 'Menu items; RLS is deny-by-default because the Express service role is the data-access boundary.';
COMMENT ON TABLE public.order_counters IS 'Daily order reference counters; RLS is deny-by-default because the Express service role is the data-access boundary.';
COMMENT ON TABLE public.orders IS 'Orders; RLS is deny-by-default because the Express service role is the data-access boundary.';
COMMENT ON TABLE public.order_items IS 'Order item snapshots; RLS is deny-by-default because the Express service role is the data-access boundary.';
COMMENT ON TABLE public.order_status_history IS 'Order status history; RLS is deny-by-default because the Express service role is the data-access boundary.';
COMMENT ON TABLE public.payments IS 'Payment records; RLS is deny-by-default because the Express service role is the data-access boundary.';

-- DOWN (manual rollback)
-- DROP INDEX IF EXISTS public.idx_payments_method;
-- DROP INDEX IF EXISTS public.idx_payments_confirmed_at;
-- DROP INDEX IF EXISTS public.idx_order_status_history_order_created;
-- DROP INDEX IF EXISTS public.idx_order_items_menu_item_id;
-- DROP INDEX IF EXISTS public.idx_order_items_order_id;
-- DROP INDEX IF EXISTS public.idx_orders_unpaid_expires_at;
-- DROP INDEX IF EXISTS public.idx_orders_table_id;
-- DROP INDEX IF EXISTS public.idx_orders_payment_status;
-- DROP INDEX IF EXISTS public.idx_orders_order_status;
-- DROP INDEX IF EXISTS public.idx_orders_created_at;
-- DROP TRIGGER IF EXISTS set_updated_at ON public.staff_profiles;
-- DROP TRIGGER IF EXISTS set_updated_at ON public.dining_tables;
-- DROP TRIGGER IF EXISTS set_updated_at ON public.menu_categories;
-- DROP TRIGGER IF EXISTS set_updated_at ON public.menu_items;
-- DROP TRIGGER IF EXISTS set_updated_at ON public.orders;
-- ALTER TABLE public.staff_profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.dining_tables DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.menu_categories DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.menu_items DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.order_counters DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.orders DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.order_items DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.order_status_history DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
