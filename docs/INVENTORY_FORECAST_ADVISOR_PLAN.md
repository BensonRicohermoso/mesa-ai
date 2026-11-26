# MESA-AI: Inventory, Prep, and Profit Advisor Plan

**Status:** Proposed  
**Audience:** Product, engineering, and restaurant owners  
**Primary outcome:** Turn historical paid-order data into practical daily prep, ingredient-restock, and 30/60/90-day gross-profit guidance.

---

## 1. Product Decision

The Owner AI Advisor will become an operational planning workspace. It will answer four questions:

1. **What should we prepare today?** — forecast portions of each menu item by operational day.
2. **What should we restock now?** — calculate ingredient shortages from recipes, current stock, supplier lead time, and safety buffer.
3. **What should we reduce or watch?** — identify slow-moving/excess stock, waste, and low-demand dishes.
4. **What gross profit should we expect?** — project orders, gross sales, gross profit, and gross margin for the next 30, 60, and 90 days.

This is a decision-support feature. It may show a recommendation, a reason, and the supporting verified values, but it must not automatically edit stock, recipes, menu availability, pricing, or purchase orders.

### Agreed v1 scope

- Ingredients and recipes are tracked alongside existing menu items.
- Staff maintain inventory through manual counts and manual adjustments. Confirmed sales consume recipe quantities in the calculated stock ledger.
- Restocking uses **on-hand stock + forecast usage during supplier lead time + par-level buffer**.
- Forecasts use historical demand patterns plus owner-entered promotions, holidays, closures, and expected large orders.
- The Advisor provides 30-, 60-, and 90-day views, a daily prep sheet, and a supplier-grouped purchase list.
- Owners can acknowledge a recommendation and export/print the prep or purchase list.
- Critical stockout-risk and gross-margin alerts also appear as a concise owner-dashboard indicator.
- Forecasted financial results are **gross profit** and **gross margin**, not net profit or net margin.

### Explicitly deferred

- Automatic supplier ordering, purchase-order approval, delivery receiving, barcode scanning, and supplier-system integrations.
- Expiry and batch/lot tracking. The UI must not claim expiry risk until batch expiry data exists.
- Net-profit forecasting. Rent, payroll, utilities, delivery-platform commissions, and other operating expenses are not captured today.
- ML models or externally sourced weather/holiday data. The initial model remains deterministic and explainable.

---

## 2. Data Model and Inventory Workflow

The current data model contains menu item cost per serving and historical paid order items, but no ingredient, recipe, stock, supplier, or purchase data. Add the following entities in a new migration. Use UUID primary keys, `created_at`, `updated_at`, RLS, and updated-at triggers consistent with the existing schema.

### 2.1 Tables

| Entity | Required fields | Purpose |
| --- | --- | --- |
| `suppliers` | `id`, `name`, `contact_name`, `phone`, `email`, `is_active` | Groups replenishment recommendations. Contact fields are optional in v1. |
| `ingredients` | `id`, `name`, `base_unit`, `on_hand_quantity`, `par_level_quantity`, `unit_cost`, `supplier_id`, `lead_time_days`, `is_active` | One record per purchasable ingredient and its current planning settings. |
| `menu_item_recipes` | `id`, `menu_item_id`, `ingredient_id`, `quantity_per_serving` | Defines ingredient consumption for one menu-item serving. Unique on `(menu_item_id, ingredient_id)`. |
| `inventory_adjustments` | `id`, `ingredient_id`, `quantity_delta`, `reason`, `note`, `recorded_by`, `recorded_at` | Immutable audit ledger for opening/closing counts, wastage, delivery correction, and manual correction. |
| `planning_events` | `id`, `title`, `event_type`, `starts_on`, `ends_on`, `demand_adjustment_pct`, `note`, `created_by` | Owner-entered future demand factors. |
| `advisor_recommendation_acknowledgements` | `id`, `recommendation_key`, `acknowledged_by`, `acknowledged_at`, `note` | Records that an owner reviewed a recommendation without changing it. |

### 2.2 Units and constraints

- Each ingredient has exactly one normalized base unit: `g`, `ml`, `piece`, `pack`, or `portion`.
- Every recipe quantity uses its ingredient’s base unit. Cross-unit conversion is out of scope for v1; use separate ingredients if supplier packaging must be represented differently.
- `on_hand_quantity`, `par_level_quantity`, `unit_cost`, `lead_time_days`, and recipe quantities must be non-negative. Recipe quantity must be greater than zero.
- A supplier is optional only while an ingredient is being configured. Ingredients without a supplier receive a configuration warning and are excluded from a supplier purchase-list group.
- An adjustment can change calculated stock below zero only when explicitly marked as a correction; the Advisor must surface that as an urgent count-review warning.

### 2.3 Stock calculation

`calculatedOnHand = latest counted on-hand quantity + sum(manual positive/negative adjustments after count) - recipe consumption from paid/confirmed sales after count`.

To keep the v1 implementation auditable, a stock count is stored as an inventory adjustment whose reason is `physical_count` and whose delta reconciles the prior calculated balance to the entered count. The UI displays both the calculated balance and the date of its most recent physical count.

### 2.4 Roles

- **Admin:** full ingredient, supplier, recipe, planning-event, acknowledgement, and export access.
- **Authorized inventory staff:** may enter physical counts and wastage/manual adjustments if a later role permission is introduced. Until then, these routes remain admin-only.
- **Cashier/customer/kitchen:** no inventory or Advisor access.

---

## 3. Forecasting and Recommendation Rules

All arithmetic, thresholds, and forecast totals are computed on the server. Gemini may explain the results but never invent values or determine a purchase quantity.

### 3.1 Historical demand baseline

1. Query paid orders and order items for the selected historical observation window, excluding cancelled, expired, and unpaid orders.
2. Aggregate units sold, gross sales, and gross profit by menu item and day of week in `Asia/Manila` time.
3. For each future date, use the historical average for that weekday. If a menu item has insufficient weekday observations, use its all-days average; if it has no paid history, forecast zero and mark it as insufficient history.
4. Apply all planning events that cover that date. Multiple event percentages are additive, then clamp the combined change at `-100%` minimum so demand can never become negative.
5. Sum daily item forecasts into 30-, 60-, and 90-day totals. Round only at display/export boundaries; retain decimal precision internally.

Default historical lookback: **the latest 12 completed weeks**. The response must expose `observedDays`, `lookbackStart`, and a confidence label:

- `high`: at least 8 completed weeks and weekday coverage exists for the forecasted items.
- `medium`: at least 4 completed weeks.
- `low`: fewer than 4 completed weeks or material recipe/menu coverage is missing.

The user may later make this observation period configurable, but v1 uses the fixed 12-week lookback to keep results comparable.

### 3.2 Gross-profit forecast

- Forecast gross sales using predicted menu-item units multiplied by the historical average realized unit price for that item.
- Forecast cost of goods sold using predicted units multiplied by the historical average `unit_cost` snapshot. If no snapshot exists, fall back to the current menu-item cost price and flag the fallback in metadata.
- `expectedGrossProfit = expectedGrossSales - expectedCOGS`.
- `expectedGrossMarginPct = expectedGrossProfit / expectedGrossSales * 100`, or `0` when expected sales are zero.
- Show gross-profit uncertainty as a confidence label, not a fabricated currency range.

### 3.3 Prep recommendations

For each future operating day:

- Forecast portions for every active menu item.
- Recommend the whole-number prep target using normal rounding; never recommend a negative quantity.
- Label items as **prepare more**, **maintain**, or **reduce prep** by comparing the forecast to the equivalent historical weekday average:
  - `prepare_more`: forecast increase of 15% or more.
  - `reduce_prep`: forecast decrease of 15% or more.
  - `maintain`: change within ±15%.
- Omit items with zero historical sales unless they are affected by a positive owner-entered event adjustment; show them in a setup note rather than as an operational target.

### 3.4 Restock recommendations

For each ingredient with a recipe and active status:

1. Determine projected consumption from all recipe-linked menu-item forecasts through `today + lead_time_days`.
2. Calculate `requiredStock = projectedLeadTimeConsumption + par_level_quantity`.
3. Calculate `recommendedPurchaseQuantity = max(0, requiredStock - calculatedOnHand)`.
4. Classify urgency:
   - `critical`: calculated stock is already below zero, or projected stock reaches zero before supplier lead time can be satisfied.
   - `high`: available stock cannot cover lead-time consumption plus par level.
   - `monitor`: stock covers lead-time consumption but falls below par level in the next 30 days.
   - no recommendation: stock remains above required level.
5. Group buy quantities by supplier and show missing-supplier ingredients in a “Needs supplier setup” group.

The purchase list must show base unit, on-hand quantity, projected lead-time use, par level, purchase quantity, supplier lead time, and estimated cost (`quantity × unit_cost`) when a unit cost is present.

### 3.5 Waste and excess-stock alerts

- Flag ingredients whose recorded wastage in the last 28 days is at least 10% of recorded outgoing stock as `waste_watch`.
- Flag ingredients whose on-hand quantity exceeds 30 days of projected usage as `slow_moving_stock`.
- Do not call either condition “expiry risk” in v1.
- Flag active menu items without recipes, ingredients without a recent count (default: 7 days), ingredients without par levels, and ingredients without supplier/lead-time data as setup blockers.

### 3.6 AI interpretation safety

Extend the existing AI prompt with verified planning facts only: forecast totals, confidence, highest-priority alerts, prep changes, restock totals, waste flags, and menu profitability context. Instruct Gemini to:

- distinguish verified forecasts from suggested actions;
- never claim that stock was ordered, adjusted, or consumed;
- use gross-profit/gross-margin terminology only;
- refer to the exact product/ingredient names and supplied quantities;
- return a short executive summary plus no more than five prioritized actions.

If the model is unavailable or returns invalid output, return deterministic text built from the same verified facts.

---

## 4. API Contracts

All endpoints require authentication and the `admin` role. Validate request shapes at the controller boundary and use existing error formatting.

### 4.1 Inventory setup APIs

| Method and route | Purpose |
| --- | --- |
| `GET/POST /api/inventory/suppliers` | List and create suppliers. |
| `PATCH /api/inventory/suppliers/:id` | Update/deactivate a supplier. |
| `GET/POST /api/inventory/ingredients` | List and create ingredients. |
| `PATCH /api/inventory/ingredients/:id` | Update ingredient planning settings. |
| `GET/PUT /api/inventory/menu-items/:menuItemId/recipe` | Read or replace the complete recipe for a menu item. |
| `POST /api/inventory/ingredients/:id/adjustments` | Record physical count, wastage, delivery correction, or manual correction. |
| `GET /api/inventory/ingredients/:id/adjustments` | Retrieve adjustment audit history. |

`PUT .../recipe` accepts a complete list of `{ ingredientId, quantityPerServing }`. It validates duplicate ingredient IDs and replaces the recipe atomically so a menu item cannot be left partially updated.

### 4.2 Planning-event APIs

| Method and route | Purpose |
| --- | --- |
| `GET /api/advisor/planning-events?from&to` | Read events that overlap a date range. |
| `POST /api/advisor/planning-events` | Add a promotion, holiday, closure, or large-order adjustment. |
| `PATCH/DELETE /api/advisor/planning-events/:id` | Correct or remove an event. |

Event payload: `{ title, eventType, startsOn, endsOn, demandAdjustmentPct, note? }`. Allow adjustments from `-100` through `+500`; closures are stored as `-100`.

### 4.3 Advisor planning APIs

`POST /api/ai/planning` request:

```json
{
  "horizonDays": 30,
  "tz": "Asia/Manila",
  "sourceMode": "live",
  "forceRefresh": false
}
```

`horizonDays` is one of `30`, `60`, or `90`. The response contains:

```json
{
  "facts": {
    "forecast": {
      "horizonDays": 30,
      "expectedOrders": 0,
      "expectedGrossSales": 0,
      "expectedCOGS": 0,
      "expectedGrossProfit": 0,
      "expectedGrossMarginPct": 0,
      "confidence": "high",
      "lookbackStart": "YYYY-MM-DD",
      "observedDays": 84
    },
    "dailyPrep": [],
    "restockBySupplier": [],
    "alerts": [],
    "setupWarnings": []
  },
  "interpretation": {
    "summary": "...",
    "prioritizedActions": []
  },
  "meta": {
    "source": "gemini",
    "generatedAt": "ISO-8601",
    "cached": false,
    "sourceMode": "live"
  }
}
```

Use a 5-minute cache keyed by horizon, timezone, source mode, planning-event version, ingredient/recipe/adjustment update watermark, and menu/order metrics watermark. A stock adjustment, recipe change, event edit, or forced refresh must invalidate/re-key the relevant result.

### 4.4 Acknowledgement and export

- `POST /api/ai/planning/recommendations/:key/acknowledgements` stores the actor, timestamp, optional note, and stable recommendation key.
- `GET /api/ai/planning/export?type=prep|purchase&date=YYYY-MM-DD` returns CSV. The browser print view uses the same verified response payload; no server-side PDF generator is required in v1.

---

## 5. Owner Experience

Add a **Planning** subview to the existing Owner AI Advisor rather than creating a separate owner section.

### 5.1 Layout

1. **Planning header:** 30/60/90-day selector, generated time, confidence badge, refresh button, and a link/button to manage planning events.
2. **Projected performance:** expected orders, gross sales, gross profit, gross margin, and a compact day-by-day gross-profit trend.
3. **Priority actions:** top five ordered actions with severity, reason, quantity/currency impact, acknowledgement control, and a link to the relevant prep/restock card.
4. **Prepare today:** date selector; portions by menu item; prepare-more/maintain/reduce label; print/export action.
5. **Restock now:** supplier-grouped ingredients with critical/high/monitor state, on-hand and required quantities, estimated spend, export action, and no-supplier configuration group.
6. **Waste and setup watch:** waste/slow-moving signals, stale-count warning, missing recipe warning, and missing configuration warnings.
7. **Planning calendar:** owner-managed event list/calendar for demand adjustments.

### 5.2 UX rules

- Use concise, operational language: “Buy 12 kg chicken today” rather than abstract analytical prose.
- Always expose the calculation context in an expandable “Why this?” section.
- Label forecast output as `Forecast`, deterministic totals as `Verified calculation`, and Gemini prose as `AI interpretation`.
- Empty states must direct the owner to the next configuration task: add ingredients, build recipes, enter a count, set par/lead time, or accumulate more sales history.
- Acknowledging an item removes only its unread/badge state. It must not remove the underlying warning or affect calculations.
- Dashboard alerts show only critical/high issues and link into the Planning subview.

---

## 6. Implementation Sequence

1. Create database migration, RLS policies, indexes, and documentation for suppliers, ingredients, recipes, adjustments, planning events, and acknowledgements.
2. Build inventory service/controllers/routes with validation, atomic recipe replacement, stock-ledger calculation, and audit retrieval.
3. Build a deterministic planning service that queries paid historical order items, computes demand/profit forecasts, ingredient requirements, restock needs, and alerts.
4. Add planning-event CRUD and include events in forecast calculation/cache invalidation.
5. Add the protected planning endpoint, Gemini explanation/fallback, acknowledgement API, and CSV export.
6. Add owner inventory setup screens, recipe editor, adjustment/count workflow, planning calendar, and Advisor planning workspace.
7. Add dashboard alert summary and link behavior.
8. Update API/database documentation and release notes.

Migration and any shared middleware/client API work must follow the repository ownership process and be submitted by pull request.

---

## 7. Detailed Implementation Steps

### Step 1 — Establish the inventory schema

1. Create a migration for `suppliers`, `ingredients`, `menu_item_recipes`, `inventory_adjustments`, `planning_events`, and `advisor_recommendation_acknowledgements`.
2. Add the base-unit and adjustment-reason enums/check constraints, foreign keys, uniqueness constraints, non-negative quantity constraints, timestamps, and update triggers.
3. Add indexes for active ingredients, ingredient/supplier lookups, recipe lookups by menu item and ingredient, adjustment history by ingredient/date, and planning-event date overlap.
4. Add admin-only RLS policies and verify that unauthenticated, cashier, kitchen, and customer sessions cannot read or write inventory data.
5. Update `docs/DATABASE.md` with the new ERD relationships, column glossary, and stock-calculation definition.

**Exit criterion:** migrations apply cleanly to an empty database and to the current development schema; the database accepts valid inventory data and rejects invalid units, negative setup values, and duplicate recipe rows.

### Step 2 — Build inventory setup and ledger services

1. Create an inventory module with separate validators, service, controller, and routes.
2. Implement supplier and ingredient list/create/update/deactivate operations.
3. Implement recipe read and complete-replacement operations in a transaction. Validate that each referenced ingredient exists and is active before replacing the prior recipe.
4. Implement inventory-adjustment creation with the supported reasons: `physical_count`, `wastage`, `delivery_correction`, and `manual_correction`.
5. Calculate stock from the latest physical-count baseline, subsequent adjustments, and paid-order recipe consumption. Return the calculated balance, most-recent-count timestamp, and calculation inputs for audit visibility.
6. Never delete adjustments; corrections are new ledger rows linked by note/reference when needed.

**Exit criterion:** an admin can configure an ingredient and recipe, record a count and wastage, and retrieve an auditable calculated stock balance.

### Step 3 — Wire paid sales to recipe consumption

1. Define a single reusable query/service function that returns paid menu-item quantities by date and menu item, using existing order-item price and cost snapshots.
2. Ensure only paid/confirmed order outcomes count toward historical demand and inventory consumption; cancelled and expired orders do not.
3. Map each paid order item to its recipe. Preserve a report of menu-item units that could not be consumed because their current recipe is absent.
4. Make the stock calculation query-based in v1 rather than mutating stock during order processing. This prevents inventory drift if orders are corrected later.
5. Add a performance review threshold: if query cost becomes material at production volume, introduce a derived consumption ledger in a later migration without changing the public API.

**Exit criterion:** paid sales affect calculated ingredient stock, while cancelled/expired orders do not; missing recipes produce a visible setup warning instead of silent deductions.

### Step 4 — Add planning events

1. Build planning-event validators for title, type, date range, adjustment percentage, and optional note.
2. Implement date-overlap list, create, edit, and delete operations.
3. Build a planning-event editor in the Owner area with event types for promotion, holiday, closure, and large order.
4. Display adjustment direction clearly: positive values increase expected demand and `-100%` closes demand for the affected date.
5. Invalidate relevant planning cache entries after every create, edit, or delete action.

**Exit criterion:** an admin can create a dated promotion or closure and retrieve the event in the future-date planning view.

### Step 5 — Implement the deterministic planning engine

1. Create a planning service independent of Gemini and UI code.
2. Load the latest 12 completed weeks of paid-order history in Manila time and calculate menu-item weekday averages, all-days fallback averages, price snapshots, and cost snapshots.
3. Generate daily future demand for the selected 30-, 60-, or 90-day horizon, then apply overlapping planning-event adjustments.
4. Calculate forecast orders, sales, COGS, gross profit, gross margin, lookback metadata, and confidence level.
5. Convert daily menu-item quantities into daily ingredient consumption via recipes.
6. Calculate stockout date, required lead-time coverage, par-level buffer, purchase quantity, estimated purchase cost, and urgency for each active ingredient.
7. Calculate prep direction, waste/slow-moving-stock/stale-count alerts, and setup warnings.
8. Return stable recommendation keys derived from recommendation type, entity ID, relevant date, and forecast input watermark so acknowledgement can survive page refreshes but changes when the underlying recommendation materially changes.

**Exit criterion:** the planning service returns repeatable verified calculations for a fixed data fixture without any model/API call.

### Step 6 — Expose protected Advisor APIs

1. Add `POST /api/ai/planning` and validate the selected horizon, timezone, source mode, and refresh flag.
2. Add planning-event routes under `/api/advisor/planning-events` and inventory routes under `/api/inventory`.
3. Add recommendation acknowledgement and CSV export routes.
4. Cache planning results for five minutes using all forecast inputs and configuration update watermarks; bypass cache for explicit refresh.
5. Return structured errors for missing setup/configuration separately from server failures so the UI can show actionable next steps.
6. Update API documentation with example requests, response fields, roles, validation errors, and export columns.

**Exit criterion:** an authenticated admin can obtain a planning response, acknowledge an action, and export a daily prep/purchase list; all other roles receive a forbidden response.

### Step 7 — Add AI explanation with safe fallback

1. Pass the compact, pre-calculated planning response to the existing AI service only after deterministic calculations complete.
2. Ask Gemini for an executive summary and up to five prioritized actions; retain the current timeout, JSON validation, and fallback behavior.
3. Build deterministic fallback text from the top alerts, restock needs, and profit forecast.
4. Clearly label the deterministic facts and AI prose separately in the API response and UI.
5. Add prompt tests proving that unsupported claims such as automatic ordering, net profit, or fabricated quantities are rejected/fallback safely.

**Exit criterion:** planning remains fully usable when Gemini is unavailable, rate-limited, malformed, or disabled.

### Step 8 — Build owner setup screens

1. Add owner screens/tabs for suppliers, ingredients, and menu-item recipes.
2. Let admins search ingredients, edit par levels/lead times/costs, see current calculated stock, and record a physical count or adjustment.
3. Add a recipe editor inside or linked from each menu item, with ingredients, quantities, and base-unit labels.
4. Add validation and warnings before saving: missing supplier, zero/empty recipe, incompatible inactive ingredient, and stale stock count.
5. Ensure all mutations display a confirmation/error state and refresh only the affected data.

**Exit criterion:** an owner can complete the inventory setup for one menu item without direct database access.

### Step 9 — Build the Advisor planning workspace

1. Extend the existing AI Advisor with a Planning subview and 30/60/90-day selector.
2. Add projected-performance cards, confidence indicator, and gross-profit trend.
3. Add the priority-action list with acknowledgement state and expandable explanation of the calculation.
4. Add daily prep, supplier purchase-list, waste/setup watch, and planning-calendar sections.
5. Implement CSV export and a print stylesheet/view for the selected day’s prep or purchase list.
6. Add loading, empty, forbidden, low-confidence, and configuration-incomplete states that direct the owner to the exact next setup action.
7. Add a dashboard badge for only critical/high stockout or margin actions, linked directly into Planning.

**Exit criterion:** an owner can go from dashboard alert to a daily prep list or supplier purchase list in no more than two interactions.

### Step 10 — Verify, document, and release

1. Add database, service, API, and UI tests described below.
2. Seed a realistic restaurant fixture that includes shared ingredients, recipes, stock counts, wastage, suppliers, historical sales, and planning events.
3. Test manually in Preview mode before connecting live analytics; then run the live-data smoke test with an admin account.
4. Document configuration order: suppliers → ingredients → recipes → initial physical count → par/lead-time settings → planning events.
5. Release behind an owner/admin feature flag if production inventory setup is incomplete; monitor setup-warning counts, planning endpoint latency, and forecast-vs-actual accuracy.

**Exit criterion:** all acceptance scenarios pass, all new routes are protected, and the owner can use the feature without model availability.

---

## 8. Test and Acceptance Plan

### Service tests

- Forecast weekday averaging, all-days fallback, event uplift/reduction, closure, 30/60/90 horizons, rounding, and confidence levels.
- Gross sales, COGS, gross profit, and gross-margin calculations using historical price/cost snapshots.
- Recipe demand multiplication across multiple menu items sharing an ingredient.
- Reorder quantities for zero stock, sufficient stock, lead-time coverage, par buffer, missing cost, and no supplier.
- Stock-ledger reconciliation after physical counts, sales consumption, wastage, and manual corrections.
- Waste, slow-moving-stock, stale-count, missing-recipe, and missing-configuration alerts.
- Cache invalidation/re-key behavior after stock, recipe, event, and menu changes.
- Gemini fallback and malformed-response handling.

### API and permission tests

- Authentication and admin-only enforcement for every new route.
- Payload validation for units, quantities, duplicate recipe ingredients, dates, event ranges, adjustments, and horizon values.
- Atomic recipe replacement: invalid input must preserve the prior recipe.
- Recommendation acknowledgement idempotency and CSV export authorization.

### UI acceptance scenarios

1. An admin configures chicken, its supplier, par level, lead time, and recipes for two dishes; paid sales create a quantified chicken restock recommendation.
2. An owner enters a +30% promotion event; the affected dates increase daily prep, ingredient demand, sales, and gross-profit forecast.
3. An owner enters a closure; prep and demand are zero for the closure dates.
4. An ingredient with stock below lead-time demand becomes critical and appears on the dashboard and supplier purchase list.
5. A menu item without a recipe produces a setup warning rather than an invented inventory deduction.
6. A low-history restaurant displays the plan but visibly labels confidence as low and explains why.
7. An acknowledged recommendation remains visible in the data view but no longer counts as unread.

---

## 9. Success Metrics

- At least 95% of active menu-item sales have complete recipes within the first month of use.
- At least 90% of active ingredients have a recent count, supplier, par level, and lead time.
- Owners can produce a daily prep sheet and purchase list in under two minutes.
- Critical stockout alerts are acknowledged before the stated replenishment deadline.
- Actual 30-day gross profit is measured against projected gross profit after the feature has adequate history; forecast accuracy is reported transparently rather than assumed.

