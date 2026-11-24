# MESA-AI Progress

**Last updated:** 2026-11-24

MESA-AI currently has the repository structure, Supabase setup, seven applied database migrations, a development menu-and-table seed, and a fully tested customer ordering API for menu lookup, table lookup, order creation, idempotency, validation failures, and order retrieval. Customer UI and the remaining fulfillment, analytics, management, and deployment work are still ahead.

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
| Dashboard and AI (Dev 2) | Not started |
| QA and seed scenarios (Member 3) | In progress |
| Deployment | Not started |
| Documentation and presentation | In progress |

## Developer 1 Checklist

- [x] Folder structure and repo setup
- [x] Supabase setup and connection
- [x] Database migrations (7 applied)
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
- [ ] Verify live sign-in and authorization paths with configured Supabase credentials.

### Management pages and APIs — Not started

- [ ] Menu management: category and item CRUD, availability toggles, soft deactivation, and admin UI.
- [ ] Table management: table CRUD, active state, customer QR URLs, and print-friendly QR output.
- [ ] Staff management: provision users, assign roles, activate/deactivate accounts, and prevent removal of the last active admin.

### Owner dashboard and reports — Not started

- [ ] Owner dashboard: date filters, KPI cards, sales/peak-hour charts, top items, recent orders, and responsive states.
- [ ] Analytics and reports UI: comparisons, menu engineering, performance views, filters, exports, empty/error states.
- [ ] Consume Dev 1 analytics APIs; do not duplicate analytics calculations in Dev 2 code.
- [ ] Use only **gross profit** and **gross margin** terminology.

### Gemini and AI features — Not started

- [ ] Gemini server integration using `GEMINI_API_KEY`; never expose the key to the client.
- [ ] Daily briefing and anomaly alerts with verified backend metrics and a demo fallback.
- [ ] Forecast and recommendation UI backed by analytics data; AI explains results but does not automatically modify records.
- [ ] Owner-only AI Q&A with bounded follow-up context and a clear separation of facts from interpretation.

### Dev 2 Branch Plan

- [ ] `feature/dev2-auth-rbac`
- [ ] `feature/dev2-menu-management`
- [ ] `feature/dev2-table-management`
- [ ] `feature/dev2-staff-management`
- [ ] `feature/dev2-owner-dashboard`
- [ ] `feature/dev2-analytics-reports-ui`
- [ ] `feature/dev2-gemini-integration`
- [ ] `feature/dev2-ai-daily-insights`
- [ ] `feature/dev2-ai-forecast-recommendations`
- [ ] `feature/dev2-ai-qna`

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

### 2026-11-24

- Added the Dev 2 Management, Dashboard, and AI checklist and branch plan.
- Implemented the server authentication foundation: Supabase login, current-user lookup, active-staff validation, and reusable role guards.

## How to Update This File

Update the date, tick only completed task checkboxes, and add a dated changelog line whenever a task finishes. Keep unverified work as `Unverified` rather than guessing its status.
