import assert from "node:assert/strict";
import test from "node:test";
import { calculateStockLedger } from "../src/modules/inventory/inventory.service.js";
import { validateAdjustment, validateRecipe } from "../src/modules/inventory/inventory.validators.js";

test("stock ledger reconciles a count, adjustments, and only supplied paid-sale consumption", () => {
  const stock = calculateStockLedger({
    openingQuantity: 100,
    adjustments: [
      { id: "count", quantityDelta: 20, reason: "physical_count", recordedAt: "2026-01-02T00:00:00Z" },
      { id: "waste", quantityDelta: -5, reason: "wastage", recordedAt: "2026-01-03T00:00:00Z" },
    ],
    sales: [{ id: "sale", quantity: 15, confirmedAt: "2026-01-04T00:00:00Z" }],
  });
  assert.equal(stock.calculatedOnHand, 100);
  assert.equal(stock.countBaselineQuantity, 120);
  assert.equal(stock.adjustmentsAfterCount, -5);
  assert.equal(stock.paidSalesConsumptionAfterCount, 15);
});

test("recipe validation rejects duplicate ingredients and adjustment validation enforces direction", () => {
  assert.throws(() => validateRecipe({ items: [{ ingredientId: "11111111-1111-4111-8111-111111111111", quantityPerServing: 1 }, { ingredientId: "11111111-1111-4111-8111-111111111111", quantityPerServing: 2 }] }));
  assert.throws(() => validateAdjustment({ reason: "wastage", quantityDelta: 1 }));
  assert.deepEqual(validateAdjustment({ reason: "delivery_correction", quantityDelta: "2.5" }), { reason: "delivery_correction", quantityDelta: 2.5, note: null });
  assert.deepEqual(validateAdjustment({ reason: "physical_count", countedQuantity: 12 }), { reason: "physical_count", countedQuantity: 12, note: null });
});
