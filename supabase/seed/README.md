# Seed Data

Seed files must never run against production data.

| Seed file | Purpose | Safe to re-run |
| --- | --- | --- |
| `001_dev_menu_and_tables.sql` | Development seed for menu categories, menu items, and ten dining tables. Applied on 2026-11-22: 4 categories, 13 menu items, 10 tables. | Yes |
| `002_dev_inventory_advisor_fixture.sql` | DEV-only suppliers, ingredients, recipes, counts, wastage, paid sales history, and planning events. Run after seed 001 and migrations 11–12. | Yes |
