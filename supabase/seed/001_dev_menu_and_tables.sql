/*
purpose: Development seed for MESA-AI menu categories, menu items, and dining tables.
DEV ONLY, never run on production data.
date: 2026-11-22
*/

BEGIN;

INSERT INTO public.menu_categories (name, sort_order, is_active)
VALUES
  ('Meals', 1, true),
  ('Sides', 2, true),
  ('Drinks', 3, true),
  ('Desserts', 4, true)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.menu_items (
  category_id,
  name,
  description,
  image_url,
  price,
  cost_price,
  is_available,
  is_active
)
SELECT category.id, seed.name, seed.description, NULL, seed.price, seed.cost_price, true, true
FROM (
  VALUES
    ('Meals', 'Chicken Adobo Rice Meal', 'Classic chicken adobo served with steamed rice.', 150.00, 55.00),
    ('Meals', 'Pork Sisig', 'Sizzling chopped pork with a savory, tangy seasoning.', 170.00, 65.00),
    ('Meals', 'Beef Tapa', 'Tender beef tapa served with seasoned rice.', 180.00, 80.00),
    ('Meals', 'Burger Steak Meal', 'Beef patties topped with savory mushroom gravy and rice.', 140.00, 60.00),
    ('Meals', 'Fried Chicken (2 pcs)', 'Two pieces of crispy fried chicken with rice.', 160.00, 70.00),
    ('Meals', 'Pancit Canton', 'Stir-fried noodles with vegetables and savory sauce.', 120.00, 35.00),
    ('Sides', 'French Fries', 'Golden, crisp potato fries.', 90.00, 25.00),
    ('Drinks', 'Iced Latte', 'Iced espresso with chilled milk.', 110.00, 28.00),
    ('Drinks', 'Iced Tea', 'Refreshing chilled tea.', 60.00, 8.00),
    ('Drinks', 'Mango Shake', 'Creamy mango drink blended with ice.', 100.00, 38.00),
    ('Drinks', 'Bottled Water', 'Chilled bottled drinking water.', 30.00, 12.00),
    ('Desserts', 'Halo-halo', 'A chilled mix of sweet toppings, beans, ice, and leche flan.', 99.00, 40.00),
    ('Desserts', 'Leche Flan', 'Classic smooth and creamy caramel custard.', 70.00, 22.00)
) AS seed(category_name, name, description, price, cost_price)
JOIN public.menu_categories AS category
  ON category.name = seed.category_name
WHERE NOT EXISTS (
  SELECT 1
  FROM public.menu_items AS item
  WHERE item.name = seed.name
);

INSERT INTO public.dining_tables (table_code, label, is_active)
VALUES
  ('T01', 'Table 1', true),
  ('T02', 'Table 2', true),
  ('T03', 'Table 3', true),
  ('T04', 'Table 4', true),
  ('T05', 'Table 5', true),
  ('T06', 'Table 6', true),
  ('T07', 'Table 7', true),
  ('T08', 'Table 8', true),
  ('T09', 'Table 9', true),
  ('T10', 'Table 10', true)
ON CONFLICT (table_code) DO NOTHING;

SELECT
  (SELECT count(*) FROM public.menu_categories) AS categories,
  (SELECT count(*) FROM public.menu_items) AS items,
  (SELECT count(*) FROM public.dining_tables) AS tables;

COMMIT;
