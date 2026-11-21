/*
migration: 20261122100000_extensions_enums_and_helpers.sql
purpose: Enable PostgreSQL crypto support, define shared enums, and add a reusable updated-at trigger function.
author: TBD
created date: 2026-11-22
depends on: None
affected tables: None
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('admin', 'cashier', 'kitchen');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE public.order_status AS ENUM (
      'pending',
      'confirmed',
      'preparing',
      'ready',
      'completed',
      'cancelled',
      'expired'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE public.payment_status AS ENUM ('unpaid', 'paid', 'cancelled');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE public.payment_method AS ENUM ('cash', 'gcash', 'online');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- DOWN (manual rollback)
-- DROP FUNCTION IF EXISTS public.set_updated_at();
-- DROP TYPE IF EXISTS public.payment_method;
-- DROP TYPE IF EXISTS public.payment_status;
-- DROP TYPE IF EXISTS public.order_status;
-- DROP TYPE IF EXISTS public.user_role;
