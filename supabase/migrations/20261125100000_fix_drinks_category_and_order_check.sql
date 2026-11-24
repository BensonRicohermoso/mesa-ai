/*
migration: 20261125100000_fix_drinks_category_and_order_check.sql
purpose:
  1. Reactivate the Drinks category that was incorrectly deactivated while its items remained active.
  2. Update create_order() to also reject items whose parent category is inactive,
     closing the gap where create_order only checked menu_items.is_active.
date: 2026-11-25
depends on: 20261122100600_create_order_function.sql
affected tables: menu_categories, menu_items (via create_order function)
*/

-- 1. Fix existing data: reactivate the Drinks category
UPDATE public.menu_categories
SET    is_active = true
WHERE  name = 'Drinks'
  AND  is_active = false;

-- 2. Replace create_order to also check menu_categories.is_active
CREATE OR REPLACE FUNCTION public.create_order(
  p_table_code text,
  p_idempotency_key text,
  p_customer_notes text,
  p_items jsonb,
  p_expiry_minutes integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_table_id uuid;
  v_table_label text;
  v_existing_order record;
  v_order_id uuid;
  v_order_ref text;
  v_subtotal numeric(10,2) := 0;
  v_order_item jsonb;
  v_merged_item record;
  v_menu_item record;
  v_category_active boolean;
  v_line_total numeric(10,2);
  v_expiry timestamptz;
  v_order_items jsonb := '[]'::jsonb;
BEGIN
  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RETURN jsonb_build_object(
      'errorCode', 'INVALID_REQUEST',
      'message', 'Idempotency key is required.'
    );
  END IF;

  SELECT o.*, t.table_code, t.label
  INTO v_existing_order
  FROM public.orders o
  JOIN public.dining_tables t ON t.id = o.table_id
  WHERE o.idempotency_key = p_idempotency_key
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'isNew', false,
      'orderRef', v_existing_order.order_ref,
      'orderStatus', v_existing_order.order_status,
      'paymentStatus', v_existing_order.payment_status,
      'subtotal', v_existing_order.subtotal,
      'total', v_existing_order.total,
      'expiresAt', v_existing_order.expires_at,
      'createdAt', v_existing_order.created_at,
      'confirmedAt', v_existing_order.confirmed_at,
      'preparingAt', v_existing_order.preparing_at,
      'readyAt', v_existing_order.ready_at,
      'completedAt', v_existing_order.completed_at,
      'table', jsonb_build_object(
        'code', v_existing_order.table_code,
        'label', v_existing_order.label
      ),
      'items', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'name', oi.item_name,
              'quantity', oi.quantity,
              'unitPrice', oi.unit_price,
              'lineTotal', oi.line_total,
              'notes', oi.notes
            )
          )
          FROM public.order_items oi
          WHERE oi.order_id = v_existing_order.id
        ),
        '[]'::jsonb
      )
    );
  END IF;

  SELECT id, label
  INTO v_table_id, v_table_label
  FROM public.dining_tables
  WHERE table_code = p_table_code
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'errorCode', 'TABLE_INVALID',
      'message', 'Unknown or inactive table.'
    );
  END IF;

  IF p_items IS NULL
    OR jsonb_typeof(p_items) <> 'array'
    OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object(
      'errorCode', 'INVALID_REQUEST',
      'message', 'At least one item is required.'
    );
  END IF;

  IF jsonb_array_length(p_items) > 30 THEN
    RETURN jsonb_build_object(
      'errorCode', 'INVALID_REQUEST',
      'message', 'A maximum of 30 item lines is allowed.'
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_items) AS input(item)
    WHERE coalesce(item->>'menuItemId', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      OR coalesce(item->>'quantity', '') !~ '^[0-9]+$'
  ) THEN
    RETURN jsonb_build_object(
      'errorCode', 'INVALID_REQUEST',
      'message', 'Each item must have a valid menuItemId and quantity.'
    );
  END IF;

  FOR v_merged_item IN
    WITH merged AS (
      SELECT
        (item->>'menuItemId')::uuid AS menu_item_id,
        sum((item->>'quantity')::integer) AS quantity,
        (
          array_agg(item->>'notes' ORDER BY ordinality)
          FILTER (WHERE coalesce(item->>'notes', '') <> '')
        )[1] AS notes
      FROM jsonb_array_elements(p_items) WITH ORDINALITY AS input(item, ordinality)
      GROUP BY (item->>'menuItemId')::uuid
    )
    SELECT * FROM merged
  LOOP
    IF v_merged_item.quantity < 1 OR v_merged_item.quantity > 20 THEN
      RETURN jsonb_build_object(
        'errorCode', 'INVALID_REQUEST',
        'message', 'Merged quantity must be from 1 to 20.'
      );
    END IF;

    SELECT id, name, price, cost_price, is_active, is_available, category_id
    INTO v_menu_item
    FROM public.menu_items
    WHERE id = v_merged_item.menu_item_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'errorCode', 'ITEM_MISSING',
        'message', 'Menu item not found.',
        'menuItemId', v_merged_item.menu_item_id
      );
    END IF;

    IF v_menu_item.is_active = false THEN
      RETURN jsonb_build_object(
        'errorCode', 'ITEM_INACTIVE',
        'message', 'Menu item is inactive: ' || v_menu_item.name,
        'itemName', v_menu_item.name
      );
    END IF;

    -- Also check that the item's parent category is active
    SELECT mc.is_active INTO v_category_active
    FROM public.menu_categories mc
    WHERE mc.id = v_menu_item.category_id;

    IF v_category_active = false THEN
      RETURN jsonb_build_object(
        'errorCode', 'ITEM_INACTIVE',
        'message', 'Menu item belongs to an inactive category: ' || v_menu_item.name,
        'itemName', v_menu_item.name
      );
    END IF;

    IF v_menu_item.is_available = false THEN
      RETURN jsonb_build_object(
        'errorCode', 'ITEM_SOLD_OUT',
        'message', 'Menu item is sold out: ' || v_menu_item.name,
        'itemName', v_menu_item.name
      );
    END IF;

    v_line_total := v_menu_item.price * v_merged_item.quantity;
    v_subtotal := v_subtotal + v_line_total;

    v_order_item := jsonb_build_object(
      'menuItemId', v_merged_item.menu_item_id,
      'name', v_menu_item.name,
      'quantity', v_merged_item.quantity,
      'unitPrice', v_menu_item.price,
      'unitCost', v_menu_item.cost_price,
      'lineTotal', v_line_total,
      'notes', v_merged_item.notes
    );

    v_order_items := v_order_items || v_order_item;
  END LOOP;

  v_expiry := CURRENT_TIMESTAMP + make_interval(mins => GREATEST(p_expiry_minutes, 1));
  v_order_ref := public.generate_order_ref();

  INSERT INTO public.orders (
    order_ref,
    table_id,
    idempotency_key,
    order_status,
    payment_status,
    subtotal,
    total,
    customer_notes,
    expires_at
  )
  VALUES (
    v_order_ref,
    v_table_id,
    p_idempotency_key,
    'pending',
    'unpaid',
    v_subtotal,
    v_subtotal,
    p_customer_notes,
    v_expiry
  )
  RETURNING id INTO v_order_id;

  FOR v_order_item IN
    SELECT value
    FROM jsonb_array_elements(v_order_items)
  LOOP
    INSERT INTO public.order_items (
      order_id,
      menu_item_id,
      item_name,
      quantity,
      unit_price,
      unit_cost,
      line_total,
      notes
    )
    VALUES (
      v_order_id,
      (v_order_item->>'menuItemId')::uuid,
      v_order_item->>'name',
      (v_order_item->>'quantity')::integer,
      (v_order_item->>'unitPrice')::numeric,
      (v_order_item->>'unitCost')::numeric,
      (v_order_item->>'lineTotal')::numeric,
      NULLIF(v_order_item->>'notes', '')
    );
  END LOOP;

  INSERT INTO public.order_status_history (
    order_id,
    from_status,
    to_status,
    changed_by,
    note
  )
  VALUES (
    v_order_id,
    NULL,
    'pending',
    NULL,
    'Order submitted'
  );

  RETURN jsonb_build_object(
    'isNew', true,
    'orderRef', v_order_ref,
    'orderStatus', 'pending',
    'paymentStatus', 'unpaid',
    'subtotal', v_subtotal,
    'total', v_subtotal,
    'expiresAt', v_expiry,
    'createdAt', CURRENT_TIMESTAMP,
    'confirmedAt', NULL,
    'preparingAt', NULL,
    'readyAt', NULL,
    'completedAt', NULL,
    'table', jsonb_build_object(
      'code', p_table_code,
      'label', v_table_label
    ),
    'items', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'name', item->>'name',
          'quantity', (item->>'quantity')::integer,
          'unitPrice', (item->>'unitPrice')::numeric,
          'lineTotal', (item->>'lineTotal')::numeric,
          'notes', NULLIF(item->>'notes', '')
        )
      )
      FROM jsonb_array_elements(
        v_order_items
      ) AS snapshot(item)
    )
  );
END;
$$;

-- DOWN (manual rollback)
-- Restore the original create_order function without category check from 20261122100600
