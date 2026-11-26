# MESA-AI Customer and Order API

All endpoints are under `/api`. Responses and errors use JSON.

**Test status:** The following endpoints are tested and passing.

## GET `/api/customer/tables/:tableCode` — **Tested**

Returns an active dining table.

**Success:** `200`

```json
{
  "tableCode": "T01",
  "label": "Table 1"
}
```

**Error:** `404 TABLE_NOT_FOUND`

## GET `/api/customer/menu` — **Tested**

Returns active categories in display order and active menu items. Sold-out items remain visible with `isAvailable: false`. Cost and staff fields are never returned.

**Success:** `200`

```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "Meals",
      "sortOrder": 1,
      "items": [
        {
          "id": "uuid",
          "name": "Chicken Adobo Rice Meal",
          "description": "Classic chicken adobo served with steamed rice.",
          "imageUrl": null,
          "price": 150,
          "isAvailable": true
        }
      ]
    }
  ]
}
```

## POST `/api/orders` — **Tested**

Creates a new order or returns the existing order for a repeated `idempotencyKey`.

**Body**

```json
{
  "tableCode": "T01",
  "idempotencyKey": "dev-order-001",
  "customerNotes": "No onions",
  "items": [
    {
      "menuItemId": "00000000-0000-4000-8000-000000000001",
      "quantity": 2,
      "notes": "Extra rice"
    }
  ]
}
```

Duplicate `menuItemId` lines are merged. Quantity is limited to 20 per merged menu item.

**Success:** `201` for a new order, `200` for an idempotent repeat

```json
{
  "orderRef": "ORD-20261122-0001",
  "orderStatus": "pending",
  "paymentStatus": "unpaid",
  "subtotal": 300,
  "total": 300,
  "expiresAt": "2026-11-22T03:00:00Z",
  "table": {
    "code": "T01",
    "label": "Table 1"
  },
  "items": [
    {
      "name": "Chicken Adobo Rice Meal",
      "quantity": 2,
      "unitPrice": 150,
      "lineTotal": 300,
      "notes": "Extra rice"
    }
  ]
}
```

**Errors**

- `400 VALIDATION_ERROR`: Invalid body or field value.
- `400 INVALID_REQUEST`: RPC-level invalid item or quantity structure.
- `404 TABLE_INVALID`: Table is unknown or inactive.
- `404 ITEM_MISSING`: A menu item no longer exists.
- `409 ITEM_INACTIVE`: A menu item is inactive.
- `409 ITEM_SOLD_OUT`: A menu item is sold out.
- `500 INTERNAL_ERROR`: Unexpected server failure.

## GET `/api/orders/:orderRef` — **Tested**

Returns the same customer-safe order shape plus status timestamps.

**Success:** `200`

```json
{
  "orderRef": "ORD-20261122-0001",
  "orderStatus": "pending",
  "paymentStatus": "unpaid",
  "subtotal": 300,
  "total": 300,
  "expiresAt": "2026-11-22T03:00:00Z",
  "table": {
    "code": "T01",
    "label": "Table 1"
  },
  "items": [
    {
      "name": "Chicken Adobo Rice Meal",
      "quantity": 2,
      "unitPrice": 150,
      "lineTotal": 300,
      "notes": "Extra rice"
    }
  ],
  "createdAt": "2026-11-22T02:40:00Z",
  "confirmedAt": null,
  "preparingAt": null,
  "readyAt": null,
  "completedAt": null
}
```

**Error:** `404 ORDER_NOT_FOUND`

## Error Shape

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "quantity must be an integer from 1 to 20."
  }
}
```


---

## Proposed Analytics Endpoints (Pending Dev 1 Implementation)

> These endpoints are **not yet implemented** on the backend. The contract below defines the shapes that the Dev 2 owner dashboard and reports UI consume. Dev 1 owns `server/src/modules/analytics/` and will build these endpoints. Until then, the client UI uses static preview fixtures (`analyticsPreviewData.js`).

**Common query parameters** (all endpoints):

| Param | Type | Required | Notes |
| --- | --- | --- | --- |
| `from` | `YYYY-MM-DD` | Yes | Inclusive start date (Asia/Manila) |
| `to` | `YYYY-MM-DD` | Yes | Inclusive end date |
| `tz` | string | Auto | Always `Asia/Manila` (injected by client) |
| `categoryId` | UUID | No | Filter by menu category |
| `paymentMethod` | `cash`\|`gcash`\|`online` | No | Filter by payment method |

**Business rules:**
- Only orders with `payment_status = 'paid'` and `order_status != 'cancelled'` are included in monetary KPIs.
- "Gross Profit" = `line_total - (unit_cost × quantity)` per order item. Never use "net profit."
- All date bucketing uses Asia/Manila timezone (`UTC+8`).

### GET `/api/analytics/summary`

Returns KPI aggregates and period-over-period deltas.

**Additional params:** `compare=true` to include comparison period deltas.

**Response `200`:**

```json
{
  "range": { "from": "2026-11-19", "to": "2026-11-25", "timezone": "Asia/Manila" },
  "comparisonRange": { "from": "2026-11-12", "to": "2026-11-18" },
  "kpis": {
    "grossSales": 84250.00,
    "grossProfit": 52180.00,
    "grossMarginPct": 61.93,
    "cogs": 32070.00,
    "paidOrdersCount": 248,
    "averageOrderValue": 339.72,
    "cancelledOrExpiredCount": 11
  },
  "deltasPct": {
    "grossSales": 12.4,
    "grossProfit": 14.1,
    "grossMarginPct": 0.92,
    "paidOrdersCount": 8.3,
    "averageOrderValue": 3.8
  },
  "paymentBreakdown": [
    { "method": "cash", "orderCount": 146, "amount": 47950.00, "sharePct": 56.91 },
    { "method": "gcash", "orderCount": 102, "amount": 36300.00, "sharePct": 43.09 }
  ]
}
```

### GET `/api/analytics/trends`

Returns time-bucketed sales series and peak-hour distribution.

**Additional params:** `granularity=day|hour` (default: `day`; auto-switches to `hour` when `from === to`).

**Response `200`:**

```json
{
  "granularity": "day",
  "salesSeries": [
    {
      "bucket": "2026-11-19",
      "label": "Nov 19",
      "grossSales": 11200.00,
      "grossProfit": 6940.00,
      "grossMarginPct": 61.96,
      "orderCount": 34,
      "previousGrossSales": 9850.00,
      "previousGrossProfit": 6010.00
    }
  ],
  "peakHours": [
    { "hour": 12, "hourLabel": "12:00", "orderCount": 42, "grossSales": 14280.00, "grossProfit": 8840.00, "isPeak": true }
  ]
}
```

### GET `/api/analytics/menu-engineering`

Returns menu performance matrix with BCG-style quadrant classification.

**Additional params:** `limit=N` (top N items), `includeArchived=true`.

**Quadrant rules:**
- **Star:** popularity ≥ avg AND unit gross profit ≥ avg
- **Plowhorse:** popularity ≥ avg AND unit gross profit < avg
- **Puzzle:** popularity < avg AND unit gross profit ≥ avg
- **Dog:** popularity < avg AND unit gross profit < avg

**Response `200`:**

```json
{
  "benchmarks": {
    "avgPopularityUnits": 28.5,
    "avgUnitGrossProfit": 86.4,
    "avgGrossMarginPct": 62.1,
    "totalUnitsSold": 371,
    "totalGrossSales": 84250.00,
    "totalGrossProfit": 52180.00
  },
  "quadrantCounts": { "star": 4, "plowhorse": 3, "puzzle": 3, "dog": 3 },
  "items": [
    {
      "menuItemId": "uuid",
      "itemName": "Chicken Adobo Rice Meal",
      "categoryId": "uuid",
      "categoryName": "Meals",
      "isActive": true,
      "isAvailable": true,
      "unitsSold": 68,
      "grossSales": 10200.00,
      "cogs": 3740.00,
      "grossProfit": 6460.00,
      "unitGrossProfit": 95.00,
      "grossMarginPct": 63.33,
      "quadrant": "star"
    }
  ]
}
```

### GET `/api/analytics/performance`

Returns cashier, kitchen pipeline, and table performance metrics.

**Response `200`:**

```json
{
  "cashier": {
    "avgHandlingSeconds": 42,
    "medianHandlingSeconds": 38,
    "paymentsConfirmedCount": 248,
    "byCashier": [
      {
        "staffId": "uuid",
        "fullName": "Cashier Staff",
        "confirmedCount": 248,
        "totalAmount": 84250.00,
        "avgHandlingSeconds": 42,
        "cashCount": 146,
        "gcashCount": 102,
        "onlineCount": 0
      }
    ]
  },
  "kitchen": {
    "avgQueueWaitSeconds": 65,
    "avgPrepSeconds": 480,
    "avgFulfillmentSeconds": 720,
    "completedOrdersCount": 237,
    "activeInKitchenCount": 3
  },
  "tables": {
    "byTable": [
      {
        "tableId": "uuid",
        "tableCode": "T01",
        "label": "Table 1",
        "orderCount": 32,
        "grossSales": 10860.00,
        "grossProfit": 6730.00,
        "averageOrderValue": 339.38
      }
    ]
  },
  "orderOutcomes": { "completed": 237, "cancelled": 5, "expired": 6, "inProgress": 11 }
}
```

### GET `/api/analytics/recent-orders`

Returns paginated recent orders for the audit table.

**Additional params:** `limit=N` (default 8), `offset=N`.

**Response `200`:**

```json
{
  "orders": [
    {
      "id": "uuid",
      "orderRef": "ORD-20261125-0038",
      "tableCode": "T03",
      "tableLabel": "Table 3",
      "orderStatus": "completed",
      "paymentStatus": "paid",
      "paymentMethod": "cash",
      "itemCount": 3,
      "total": 430.00,
      "grossProfit": 266.00,
      "grossMarginPct": 61.86,
      "handlingSeconds": 35,
      "createdAt": "2026-11-25T15:22:00+08:00",
      "confirmedAt": "2026-11-25T15:23:10+08:00",
      "completedAt": "2026-11-25T15:35:00+08:00"
    }
  ],
  "pagination": { "total": 38, "limit": 8, "offset": 0 }
}
```

### Error Codes

| Code | Meaning |
| --- | --- |
| `401` | Missing or expired authentication token |
| `403` | User does not have admin role |
| `404` / `501` | Analytics module not yet deployed (triggers preview offer in UI) |
| `400` | Invalid query parameters (bad dates, unknown filter) |
| `500` | Unexpected server error |

---

## Owner AI Advisor Endpoints (Dev 2)

All `/api/ai/*` endpoints require a valid Bearer token with `admin` role (`authenticate`, `requireRoles("admin")`) and are rate-limited to 30 requests/minute per staff account.

### `GET /api/ai/status`
Returns server AI readiness without exposing `GEMINI_API_KEY`.

**Response `200`:**
```json
{
  "configured": true,
  "model": "gemini-2.5-flash",
  "mode": "gemini",
  "cacheEntries": 2
}
```

### `POST /api/ai/briefing`
Returns verified backend KPIs, anomaly flags, and a Gemini-generated (or deterministic fallback) executive briefing.

**Request Body:**
```json
{
  "from": "2026-11-19",
  "to": "2026-11-25",
  "tz": "Asia/Manila",
  "compare": true,
  "categoryId": "all",
  "paymentMethod": "all",
  "sourceMode": "preview",
  "forceRefresh": false
}
```

**Response `200`:**
- `facts`: `{ range, kpis, deltasPct, anomalies: { cancellationRatePct, flags[] }, performance }`
- `interpretation`: `{ summary, alerts[], watchItems[] }`
- `meta`: `{ source: "gemini" | "fallback", model, generatedAt, cached, sourceMode }`

### `POST /api/ai/forecast`
Returns backend baseline projections (`horizonDays`: 1–30, default 7) and read-only menu/promo recommendations.

**Response `200`:**
- `facts`: `{ range, forecast: { horizonDays, observedDays, expectedOrders, expectedGrossSales, expectedGrossProfit, expectedGrossMarginPct, peakHours[] }, menuEngineering }`

### Inventory planning (admin only)

All planning and planning-event endpoints require an authenticated `admin`; other
staff roles receive `403 ROLE_FORBIDDEN`.

- `GET/POST /api/advisor/planning-events` lists overlapping events (`?from=YYYY-MM-DD&to=YYYY-MM-DD`) or creates `{ title, eventType, startsOn, endsOn, demandAdjustmentPct, note? }`.
- `PATCH/DELETE /api/advisor/planning-events/:id` updates or removes an event. `eventType` is `promotion`, `holiday`, `closure`, or `large_order`; demand adjustment is `-100` through `500`, and closures must use `-100`.
- `POST /api/ai/planning` accepts `{ horizonDays: 30|60|90, tz: "Asia/Manila", sourceMode?: "live"|"preview", forceRefresh?: boolean }`. It returns deterministic `facts` (forecast, daily prep, supplier-grouped restock, alerts, and setup warnings), a deterministic interpretation, and cache metadata.
- `POST /api/ai/planning/recommendations/:key/acknowledgements` records an optional `{ note }` without changing the recommendation or its calculation.
- `GET /api/ai/planning/export?type=prep|purchase&date=YYYY-MM-DD` returns CSV. Prep exports menu item, forecast, target, and direction; purchase exports supplier, quantities, lead-time requirements, and estimated cost.

Validation errors use `400 VALIDATION_ERROR`; unavailable event IDs use `404 PLANNING_EVENT_NOT_FOUND`. Missing inventory configuration is returned in `facts.setupWarnings`, not as a server error.
- `interpretation`: `{ outlookSummary, peakHourAdvice, recommendations[] }`
- `meta`: `{ source: "gemini" | "fallback", model, generatedAt, cached, sourceMode }`

### `POST /api/ai/qna`
Owner-only Q&A grounded in verified metrics. Validates `question` (required, max 500 chars) and caps `history` to the last 6 turns.

**Response `200`:**
- `answer`: Plain-text explanation using gross profit / gross margin terminology.
- `dataUsed`: Compact verified metrics snapshot used to answer.
- `meta`: `{ source: "gemini" | "fallback", model, generatedAt, sourceMode }`

### AI Error Codes
- `400 INVALID_DATE_RANGE` / `QUESTION_REQUIRED` / `QUESTION_TOO_LONG`
- `401 AUTH_TOKEN_MISSING` / `AUTH_TOKEN_INVALID`
- `403 ROLE_FORBIDDEN`
- `429 RATE_LIMITED`
- `501 ANALYTICS_NOT_READY` (returned when `sourceMode === "live"` before Dev 1's analytics module is implemented)
