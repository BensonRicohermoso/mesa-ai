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
