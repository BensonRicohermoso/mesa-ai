/*
migration: 20261122100400_payments.sql
purpose: Create payment records for counter and future online payment methods.
author: TBD
created date: 2026-11-22
depends on: 20261122100300_orders.sql
affected tables: payments
*/

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id),
  method public.payment_method NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount >= 0),
  amount_tendered numeric(10,2) CHECK (amount_tendered >= 0),
  change_given numeric(10,2) CHECK (change_given >= 0),
  reference_number text,
  confirmed_by uuid NOT NULL REFERENCES public.staff_profiles(id),
  scanned_at timestamptz,
  confirmed_at timestamptz,
  handling_seconds integer CHECK (handling_seconds >= 0),
  provider text,
  provider_reference text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.payments IS 'Successful payment records; online providers are supported through nullable provider fields for future use.';
COMMENT ON COLUMN public.payments.amount IS 'Payment amount in PHP.';
COMMENT ON COLUMN public.payments.amount_tendered IS 'Cash amount received from the customer; nullable for non-cash payments.';
COMMENT ON COLUMN public.payments.change_given IS 'Cash change returned to the customer.';
COMMENT ON COLUMN public.payments.reference_number IS 'GCash or other external reference number.';
COMMENT ON COLUMN public.payments.scanned_at IS 'Timestamp when the cashier loaded or scanned the order.';
COMMENT ON COLUMN public.payments.confirmed_at IS 'Timestamp when payment was confirmed.';
COMMENT ON COLUMN public.payments.handling_seconds IS 'Backend-calculated cashier handling time in seconds from scan to confirmation; a headline queue-reduction metric.';
COMMENT ON COLUMN public.payments.provider IS 'Future online payment provider name.';
COMMENT ON COLUMN public.payments.provider_reference IS 'Future provider transaction identifier.';

-- DOWN (manual rollback)
-- DROP TABLE IF EXISTS public.payments;
