/*
migration: 20261122100100_staff_and_tables.sql
purpose: Create staff profiles and dining table records.
author: TBD
created date: 2026-11-22
depends on: 20261122100000_extensions_enums_and_helpers.sql
affected tables: staff_profiles, dining_tables
*/

CREATE TABLE IF NOT EXISTS public.staff_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  role public.user_role NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.staff_profiles IS 'Restaurant staff identities and application roles linked to Supabase Auth users.';
COMMENT ON COLUMN public.staff_profiles.id IS 'Staff profile identifier and matching Supabase Auth user identifier.';
COMMENT ON COLUMN public.staff_profiles.role IS 'Application role used by the Express backend for authorization.';
COMMENT ON COLUMN public.staff_profiles.is_active IS 'Whether the staff account is currently permitted to use the system.';

CREATE TABLE IF NOT EXISTS public.dining_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_code text NOT NULL UNIQUE,
  label text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.dining_tables IS 'Physical dining tables identified by a unique table code embedded in QR URLs.';
COMMENT ON COLUMN public.dining_tables.table_code IS 'Unique code placed in the customer table QR URL.';
COMMENT ON COLUMN public.dining_tables.label IS 'Human-readable table name or number.';
COMMENT ON COLUMN public.dining_tables.is_active IS 'Whether the table is available for new customer orders.';

-- DOWN (manual rollback)
-- DROP TABLE IF EXISTS public.dining_tables;
-- DROP TABLE IF EXISTS public.staff_profiles;
