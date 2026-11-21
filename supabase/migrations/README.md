# Supabase Migrations

## Naming convention

Use `YYYYMMDDHHMMSS_short_snake_case_description.sql`.

Examples:

- `20261122100000_extensions_enums_and_helpers.sql`
- `20261122100100_staff_and_tables.sql`

## Applying migrations

Apply migrations in numeric filename order by opening the Supabase SQL Editor, selecting the complete file contents, and running it once. Paste and execute migrations only after reviewing the SQL.

Do not apply a migration that has already been applied.

## Never edit an applied migration

An applied migration is part of the database history. Never edit or rewrite it. If it needs correction or additional database objects, create a new migration with a later timestamp.

## Adding a new migration

1. Choose a new timestamp later than all existing migrations.
2. Add the required header comments and a manual rollback block.
3. Make the migration a single logical change.
4. Update `docs/DATABASE.md` with the new migration, description, author, created date, and Pending status.
5. Review and paste the migration into the Supabase SQL Editor in dependency order.
6. Update the migration status and applied date in `docs/DATABASE.md` after successful application.
