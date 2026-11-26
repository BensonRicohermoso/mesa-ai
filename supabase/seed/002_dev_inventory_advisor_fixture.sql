/*
purpose: Repeatable DEV ONLY fixture for inventory, recipes, paid sales, and Advisor planning.
depends on: 001_dev_menu_and_tables.sql and inventory Advisor migrations.
never run on production data.
*/

BEGIN;

INSERT INTO public.suppliers (id, name, contact_name, phone, email, is_active)
VALUES
  ('a1000000-0000-4000-8000-000000000001', 'MESA Poultry Supply', 'Rina Santos', '09170000001', 'orders@mesapoultry.test', true),
  ('a1000000-0000-4000-8000-000000000002', 'MESA Dry Goods', 'Noel Cruz', '09170000002', 'orders@mesadrygoods.test', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, contact_name = EXCLUDED.contact_name, phone = EXCLUDED.phone, email = EXCLUDED.email, is_active = EXCLUDED.is_active;

INSERT INTO public.ingredients (id, name, base_unit, on_hand_quantity, par_level_quantity, unit_cost, supplier_id, lead_time_days, is_active, created_at)
VALUES
  ('b1000000-0000-4000-8000-000000000001', 'Chicken thighs', 'g', 12000, 5000, 0.18, 'a1000000-0000-4000-8000-000000000001', 2, true, CURRENT_TIMESTAMP - interval '90 days'),
  ('b1000000-0000-4000-8000-000000000002', 'Steamed rice', 'g', 18000, 6000, 0.06, 'a1000000-0000-4000-8000-000000000002', 1, true, CURRENT_TIMESTAMP - interval '90 days'),
  ('b1000000-0000-4000-8000-000000000003', 'Pork sisig mix', 'g', 9000, 3500, 0.22, 'a1000000-0000-4000-8000-000000000002', 2, true, CURRENT_TIMESTAMP - interval '90 days'),
  ('b1000000-0000-4000-8000-000000000004', 'Cooking oil', 'ml', 15000, 3000, 0.09, NULL, 0, true, CURRENT_TIMESTAMP - interval '90 days')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, base_unit = EXCLUDED.base_unit, on_hand_quantity = EXCLUDED.on_hand_quantity, par_level_quantity = EXCLUDED.par_level_quantity, unit_cost = EXCLUDED.unit_cost, supplier_id = EXCLUDED.supplier_id, lead_time_days = EXCLUDED.lead_time_days, is_active = EXCLUDED.is_active;

INSERT INTO public.menu_item_recipes (menu_item_id, ingredient_id, quantity_per_serving)
SELECT item.id, recipe.ingredient_id, recipe.quantity_per_serving
FROM (VALUES
  ('Chicken Adobo Rice Meal', 'b1000000-0000-4000-8000-000000000001'::uuid, 180::numeric),
  ('Chicken Adobo Rice Meal', 'b1000000-0000-4000-8000-000000000002'::uuid, 220::numeric),
  ('Pork Sisig', 'b1000000-0000-4000-8000-000000000003'::uuid, 170::numeric),
  ('Pork Sisig', 'b1000000-0000-4000-8000-000000000002'::uuid, 180::numeric),
  ('Fried Chicken (2 pcs)', 'b1000000-0000-4000-8000-000000000001'::uuid, 320::numeric),
  ('Fried Chicken (2 pcs)', 'b1000000-0000-4000-8000-000000000002'::uuid, 220::numeric),
  ('Fried Chicken (2 pcs)', 'b1000000-0000-4000-8000-000000000004'::uuid, 35::numeric)
) AS recipe(item_name, ingredient_id, quantity_per_serving)
JOIN public.menu_items item ON item.name = recipe.item_name
ON CONFLICT (menu_item_id, ingredient_id) DO UPDATE SET quantity_per_serving = EXCLUDED.quantity_per_serving;

INSERT INTO public.inventory_adjustments (id, ingredient_id, quantity_delta, reason, note, recorded_at)
VALUES
  ('c1000000-0000-4000-8000-000000000001', 'b1000000-0000-4000-8000-000000000001', 0, 'physical_count', 'Fixture count', CURRENT_TIMESTAMP - interval '3 days'),
  ('c1000000-0000-4000-8000-000000000002', 'b1000000-0000-4000-8000-000000000001', -650, 'wastage', 'Fixture trim loss', CURRENT_TIMESTAMP - interval '2 days'),
  ('c1000000-0000-4000-8000-000000000003', 'b1000000-0000-4000-8000-000000000002', 0, 'physical_count', 'Fixture count', CURRENT_TIMESTAMP - interval '3 days'),
  ('c1000000-0000-4000-8000-000000000004', 'b1000000-0000-4000-8000-000000000003', 0, 'physical_count', 'Fixture count', CURRENT_TIMESTAMP - interval '3 days')
ON CONFLICT (id) DO UPDATE SET quantity_delta = EXCLUDED.quantity_delta, reason = EXCLUDED.reason, note = EXCLUDED.note, recorded_at = EXCLUDED.recorded_at;

WITH fixture_dates AS (
  SELECT service_date::date FROM generate_series(CURRENT_DATE - 84, CURRENT_DATE - 1, interval '1 day') AS service_date
), fixture_orders AS (
  SELECT md5('mesa-inventory-fixture-order-' || service_date)::uuid AS id, service_date FROM fixture_dates
)
INSERT INTO public.orders (id, order_ref, table_id, idempotency_key, order_status, payment_status, subtotal, total, created_at, confirmed_at, completed_at)
SELECT fixture.id, 'FIX-' || to_char(fixture.service_date, 'YYYYMMDD'), table_row.id, 'mesa-inventory-fixture-' || fixture.service_date, 'completed', 'paid', 320, 320, fixture.service_date + interval '12 hours', fixture.service_date + interval '12 hours', fixture.service_date + interval '12 hours 15 minutes'
FROM fixture_orders fixture CROSS JOIN LATERAL (SELECT id FROM public.dining_tables ORDER BY table_code LIMIT 1) table_row
ON CONFLICT (id) DO UPDATE SET order_status = EXCLUDED.order_status, payment_status = EXCLUDED.payment_status, subtotal = EXCLUDED.subtotal, total = EXCLUDED.total, confirmed_at = EXCLUDED.confirmed_at, completed_at = EXCLUDED.completed_at;

WITH fixture_orders AS (
  SELECT id FROM public.orders WHERE order_ref LIKE 'FIX-%'
), fixture_items AS (
  SELECT order_row.id AS order_id, item.id AS menu_item_id, item.name, item.price, item.cost_price, 1 AS quantity
  FROM fixture_orders order_row JOIN public.menu_items item ON item.name IN ('Chicken Adobo Rice Meal', 'Pork Sisig')
)
INSERT INTO public.order_items (id, order_id, menu_item_id, item_name, quantity, unit_price, unit_cost, line_total)
SELECT md5('mesa-inventory-fixture-item-' || fixture.order_id || fixture.menu_item_id)::uuid, fixture.order_id, fixture.menu_item_id, fixture.name, fixture.quantity, fixture.price, fixture.cost_price, fixture.price * fixture.quantity
FROM fixture_items fixture
ON CONFLICT (id) DO UPDATE SET quantity = EXCLUDED.quantity, unit_price = EXCLUDED.unit_price, unit_cost = EXCLUDED.unit_cost, line_total = EXCLUDED.line_total;

INSERT INTO public.planning_events (id, title, event_type, starts_on, ends_on, demand_adjustment_pct, note)
VALUES
  ('d1000000-0000-4000-8000-000000000001', 'Weekend chicken promotion', 'promotion', CURRENT_DATE + 7, CURRENT_DATE + 8, 30, 'Fixture: +30% demand'),
  ('d1000000-0000-4000-8000-000000000002', 'Fixture closure', 'closure', CURRENT_DATE + 21, CURRENT_DATE + 21, -100, 'Fixture: closed')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, event_type = EXCLUDED.event_type, starts_on = EXCLUDED.starts_on, ends_on = EXCLUDED.ends_on, demand_adjustment_pct = EXCLUDED.demand_adjustment_pct, note = EXCLUDED.note;

SELECT (SELECT count(*) FROM public.ingredients WHERE id::text LIKE 'b1000000%') AS fixture_ingredients, (SELECT count(*) FROM public.orders WHERE order_ref LIKE 'FIX-%') AS fixture_paid_orders, (SELECT count(*) FROM public.planning_events WHERE id::text LIKE 'd1000000%') AS fixture_events;
COMMIT;
