/*
migration: 20261122100300_orders.sql
purpose: Create order counters, orders, order items, and status history.
author: TBD
created date: 2026-11-22
depends on: 20261122100200_menu.sql
affected tables: order_counters, orders, order_items, order_status_history
*/

CREATE TABLE IF NOT EXISTS public.order_counters (
  counter_date date PRIMARY KEY,
  last_number integer NOT NULL CHECK (last_number >= 0)
);

COMMENT ON TABLE public.order_counters IS 'Atomic daily sequence storage for unique human-readable order references.';
COMMENT ON COLUMN public.order_counters.last_number IS 'Last generated sequence number for this counter_date.';

CREATE OR REPLACE FUNCTION public.generate_order_ref()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_number integer;
  today date := CURRENT_DATE;
BEGIN
  INSERT INTO public.order_counters AS counter (counter_date, last_number)
  VALUES (today, 1)
  ON CONFLICT (counter_date)
  DO UPDATE SET last_number = counter.last_number + 1
  RETURNING last_number INTO next_number;

  RETURN 'ORD-' || to_char(today, 'YYYYMMDD') || '-' || lpad(next_number::text, 4, '0');
END;
$$;

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_ref text NOT NULL UNIQUE DEFAULT public.generate_order_ref(),
  table_id uuid NOT NULL REFERENCES public.dining_tables(id),
  idempotency_key text NOT NULL UNIQUE,
  order_status public.order_status NOT NULL DEFAULT 'pending',
  payment_status public.payment_status NOT NULL DEFAULT 'unpaid',
  subtotal numeric(10,2) NOT NULL CHECK (subtotal >= 0),
  total numeric(10,2) NOT NULL CHECK (total >= 0),
  customer_notes text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmed_at timestamptz,
  preparing_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.orders IS 'Customer orders, with separate order lifecycle and payment lifecycle statuses.';
COMMENT ON COLUMN public.orders.order_ref IS 'Daily sequential human-readable reference in ORD-YYYYMMDD-0001 format.';
COMMENT ON COLUMN public.orders.idempotency_key IS 'Client-generated key that prevents duplicate order submissions.';
COMMENT ON COLUMN public.orders.order_status IS 'Kitchen and fulfillment lifecycle status.';
COMMENT ON COLUMN public.orders.payment_status IS 'Payment lifecycle status kept separate from order_status.';
COMMENT ON COLUMN public.orders.subtotal IS 'Sum of order item line totals before any future adjustments.';
COMMENT ON COLUMN public.orders.total IS 'Final amount due in PHP; no tax is currently applied.';
COMMENT ON COLUMN public.orders.expires_at IS 'Timestamp when an unpaid pending order may be automatically expired.';

CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id),
  item_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  unit_cost numeric(10,2) NOT NULL CHECK (unit_cost >= 0),
  line_total numeric(10,2) NOT NULL CHECK (line_total >= 0),
  notes text
);

COMMENT ON TABLE public.order_items IS 'Immutable-at-order-time item snapshots for pricing and gross profit calculations.';
COMMENT ON COLUMN public.order_items.item_name IS 'Menu item name snapshot taken when the order was submitted.';
COMMENT ON COLUMN public.order_items.unit_price IS 'Selling price snapshot in PHP for this order.';
COMMENT ON COLUMN public.order_items.unit_cost IS 'Estimated item cost snapshot in PHP for gross profit calculations.';
COMMENT ON COLUMN public.order_items.line_total IS 'Quantity multiplied by the snapshot unit price.';

CREATE TABLE IF NOT EXISTS public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_status public.order_status,
  to_status public.order_status NOT NULL,
  changed_by uuid REFERENCES public.staff_profiles(id),
  note text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.order_status_history IS 'Append-only audit trail of order status transitions.';
COMMENT ON COLUMN public.order_status_history.from_status IS 'Previous order status; null for the initial status.';
COMMENT ON COLUMN public.order_status_history.changed_by IS 'Staff profile that caused the transition, if applicable.';

-- DOWN (manual rollback)
-- DROP TABLE IF EXISTS public.order_status_history;
-- DROP TABLE IF EXISTS public.order_items;
-- DROP TABLE IF EXISTS public.orders;
-- DROP FUNCTION IF EXISTS public.generate_order_ref();
-- DROP TABLE IF EXISTS public.order_counters;
