# Inventory Advisor release guide

## Configuration order

1. Add suppliers.
2. Add ingredients with their normalized base unit.
3. Build every active menu item's complete recipe.
4. Record an initial physical count for each ingredient.
5. Set par levels, unit cost, supplier, and lead time.
6. Add dated promotions, closures, holidays, or large orders.
7. Open Planning and resolve its setup warnings before relying on restock actions.

Planning is decision support only. It never places an order or changes stock.

## Development fixture and manual verification

After applying migrations through `20261127110000_inventory_recipe_replacement.sql`, run these in order in a development database:

1. `supabase/seed/001_dev_menu_and_tables.sql`
2. `supabase/seed/002_dev_inventory_advisor_fixture.sql`

Sign in as an admin and open AI Advisor → Planning. Verify a 30-day plan, the fixture promotion and closure, prep CSV, purchase CSV, acknowledgement, and a physical count. Temporarily remove a recipe only in a disposable database to confirm the setup warning appears.

## Production release gate

- Apply migrations in order and take a backup/PITR checkpoint first.
- Keep the feature owner/admin-only until recipe and count setup is sufficiently complete.
- Smoke-test `POST /api/ai/planning`, planning-event CRUD, acknowledgement, and both exports with an admin token. Confirm a non-admin receives `403`.
- Confirm that Planning remains usable with `GEMINI_API_KEY` removed: `meta.source` must become `fallback` and verified facts must still be present.
- Monitor planning latency, five-minute cache hit rate, setup-warning count, critical/high actions, acknowledgements, recipe coverage, recent-count coverage, and forecast-vs-actual gross profit after 30 days.

## Rollback

Disable access to the owner Planning subview if setup quality is unsafe. Do not delete adjustments or planning events; they are audit records. Schema rollback follows the commented manual rollback sections in the migrations.
