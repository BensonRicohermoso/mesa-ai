/*
migration: 20261124100000_staff_pin.sql
purpose: Add pin_code support to staff_profiles for rapid POS terminal staff switching.
date: 2026-11-24
depends on: 20261122100100_staff_and_tables.sql
affected tables: staff_profiles
*/

ALTER TABLE public.staff_profiles
ADD COLUMN IF NOT EXISTS pin_code text;

COMMENT ON COLUMN public.staff_profiles.pin_code IS 'Optional 4-to-6 digit numeric PIN for quick floor shift switching on shared POS terminals.';
