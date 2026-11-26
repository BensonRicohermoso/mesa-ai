# MESA-AI Progress

**Last updated:** 2026-11-25

MESA-AI currently has the repository structure, Supabase setup, seven applied database migrations (plus two pending migrations: `20261124100000_staff_pin.sql` and `20261125100000_fix_drinks_category_and_order_check.sql`), a development menu-and-table seed, and a fully tested customer ordering API for menu lookup, table lookup, order creation, idempotency, validation failures, and order retrieval. Customer UI and the remaining fulfillment, analytics, management, and deployment work are still ahead.

## Summary

| Area | Status |
| --- | --- |
| Setup | Done |
| Database | Done |
| Ordering API | Done |
| Customer UI | Not started |
| Cashier POS | Not started |
| Kitchen Display | Not started |
| Order tracking | Not started |
| Analytics functions | Not started |
| Auth and management (Dev 2) | In progress |
| Dashboard and AI (Dev 2) | In progress |
| QA and seed scenarios (Member 3) | In progress |
| Deployment | Not started |
| Documentation and presentation | In progress |

## Developer 1 Checklist

- [x] Folder structure and repo setup
- [x] Supabase setup and connection
- [x] Database migrations (7 applied; 2 pending in `supabase/migrations/`: `20261124100000_staff_pin.sql`, `20261125100000_fix_drinks_category_and_order_check.sql`)
- [x] Dev seed (menu and tables)
- [x] Order API: POST `/api/orders`, GET menu, GET table, GET order by ref
- [ ] Customer menu and cart UI
- [ ] Order confirmation page with order QR
- [ ] Cashier API and POS (scan QR, cash and GCash, handling time)
- [ ] Socket.IO and Kitchen Display
- [ ] Customer order tracking (live)
- [ ] Auto-expire unpaid orders job
- [ ] Analytics functions (sales, gross profit, peak hours, cashier metrics, kitchen performance)
- [ ] Polish: estimated wait time, add-on suggestions, error handling

## Developer 2 Checklist — Management, Dashboard & AI

### Authentication and role permissions — In progress

- [x] Define the Supabase Auth login and session flow.
- [x] Add `POST /api/auth/login` for staff sign-in and `GET /api/auth/me` for current-user lookup.
- [x] Add Bearer-token authentication middleware that loads the linked active `staff_profiles` record.
- [x] Add reusable role guards for `admin`, `cashier`, and `kitchen`.
- [x] Build the staff login UI and protected client routes.
- [x] Apply the role guard to the current staff-only route; future staff modules must add their role policy as they are implemented.
- [x] Verify live sign-in and authorization paths with configured Supabase credentials.
- [ ] UI finalization (in progress).

### Management pages and APIs — Done

- [x] Menu management: category and item CRUD, availability toggles, soft deactivation, and admin UI.
- [x] Table management: table CRUD, active state, customer QR URLs, and print-friendly QR output.
- [x] Staff management: provision users, assign roles, activate/deactivate accounts, and prevent removal of the last active admin.

### Owner dashboard and reports — Done

- [x] Owner dashboard: date filters, KPI cards, sales/peak-hour charts, top items, recent orders, and responsive states.
- [x] Analytics and reports UI: comparisons, menu engineering, performance views, filters, exports, empty/error states.
- [x] Consume Dev 1 analytics APIs; do not duplicate analytics calculations in Dev 2 code. _(Live API integration pending Dev 1; preview fixtures available via toggle.)_
- [x] Use only **gross profit** and **gross margin** terminology.

### Gemini and AI features — Not started

- [ ] Gemini server integration using `GEMINI_API_KEY`; never expose the key to the client.
- [ ] Daily briefing and anomaly alerts with verified backend metrics and a demo fallback.
- [ ] Forecast and recommendation UI backed by analytics data; AI explains results but does not automatically modify records.
- [ ] Owner-only AI Q&A with bounded follow-up context and a clear separation of facts from interpretation.

### Dev 2 Branch Plan

- [x] `feature/dev2-auth-rbac`
- [x] `feature/dev2-menu-management`
- [x] `feature/dev2-table-management`
- [x] `feature/dev2-staff-management`
- [x] `feature/dev2-owner-dashboard` (includes analytics & reports UI)
- [ ] `feature/dev2-ai` (combines Gemini integration, daily insights, forecast & recommendations, and AI Q&A)

## Next Up

Customer menu and cart UI at `/t/:tableCode`.

## Key Dates

- Project period: December 1-5, 2026
- Google Sheet submission: December 5, 2026

## Changelog

### 2026-11-22

- Created and applied seven Supabase migrations, including the atomic `create_order` RPC.
- Applied the development seed: 4 categories, 13 menu items, and 10 dining tables.
- Added and tested the customer menu, table lookup, create-order, idempotent repeat, validation, and order lookup API endpoints.
- Added API, database, seed, and repository progress documentation.

### 2026-11-25

- Implemented and verified Menu Management APIs (`/api/menu/categories`, `/api/menu/items`) with admin RBAC, category CRUD/status/removal protection (`409 CATEGORY_IN_USE`), item CRUD, availability toggling (`PATCH /api/menu/items/:id/availability`), and soft deactivation/restoration (`PATCH /api/menu/items/:id/status`).
- Built the Owner `02 · Menu Atelier` UI (`MenuManagement`, `CategoryModal`, `MenuItemModal`) with category filtering, Active/Archived segmented views, search, margin calculation, stock toggles, and category removal confirmation.
- Added automated Menu Management API tests with live-DB cleanup in `server/tests/menu.test.js`.
- Implemented and verified Staff Management APIs (`/api/staff`) with admin RBAC, Supabase Auth user provisioning, role/PIN/password updates, active-state toggling, and last active admin deactivation/demotion protection.
- Built the Owner `04 · Staff Roster` UI (`StaffManagement`, `StaffModal`) with role/status filtering, PIN management, and sole-admin UI safeguards.
- Added automated Staff Management API tests in `server/tests/staff.test.js`.
- Implemented and verified Table Management APIs (`/api/tables`) with admin RBAC, alphanumeric code validation, duplicate rejection, and active-state toggling.
- Built the Owner `03 · Table Suite` UI (`TableManagement`, `TableModal`, `PrintTableQrModal`) with local vector SVG QR generation (`qrcode`) and print-ready table tent cards.
- Added automated Table Management API tests in `server/tests/tables.test.js`.

### 2026-11-25 (continued)

- Implemented the Owner Executive Dashboard (`01 · Overview`) with 4 KPI cards (Gross Sales, Gross Profit, Gross Margin, AOV), Recharts sales trend (Area + Line) and peak hours (Bar) charts, top 5 items table, and 8 recent orders table.
- Added `05 · Analytics & Reports` tab with three sub-views: Comparisons & Mix (delta matrix, comparison chart, payment breakdown, order outcomes, paginated orders audit), Menu Engineering (quadrant scatter chart, sortable table, CSV export), and Floor & Kitchen Performance (cashier KPIs, per-cashier table, kitchen pipeline, table performance).
- Built shared `AnalyticsToolbar` with date presets (Today/7D/30D/This Month/Custom), custom date inputs, category and payment method filters, compare toggle, refresh, and Live/Preview source toggle.
- Refactored station session/PIN settings from inline Overview into dismissible `StationSettingsModal`.
- Added analytics API client (`analyticsApi.js`), display formatters (`analyticsFormatters.js`), RFC-4180 CSV export with formula injection protection (`csvExport.js`), and static preview fixtures (`analyticsPreviewData.js`).
- Added `@media print` editorial report styles scoped to `.analytics-print-report` without breaking existing tent card print styles.
- Documented the proposed Analytics API contract (5 endpoints) in `docs/API.md`.
- Zero analytics calculations in client code — all KPIs, deltas, quadrant classifications, and benchmarks come from backend (or preview fixtures).
- Exclusively uses "Gross Profit" and "Gross Margin" terminology throughout.

### 2026-11-24

- Added the Dev 2 Management, Dashboard, and AI checklist and branch plan.
- Implemented and verified the server authentication foundation: Supabase login, current-user lookup, active-staff validation, token refresh, and reusable role guards.
- Implemented the 6-Hour Shift POS Lifecycle: hard 6-hour shift expiration, proactive token refresh interceptor, and 10-minute inactivity auto-lock screen.
- Implemented Quick PIN-based Staff Switching (`/api/auth/pin-switch`) with 4-digit tactile touch numpad UI.
- Provisioned and verified active staff accounts (`Admin`, `Cashier`, `Kitchen Staff`) in Supabase Auth and `staff_profiles`.
- Created documentation in `docs/STAFF_CREDENTIALS.md`.
- Redesigned the UI and established project-wide Modern Monochrome Luxury Editorial design standards in `docs/DESIGN_SYSTEM.md`.

## How to Update This File

Update the date, tick only completed task checkboxes, and add a dated changelog line whenever a task finishes. Keep unverified work as `Unverified` rather than guessing its status.
