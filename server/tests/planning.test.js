import assert from "node:assert/strict";
import test from "node:test";
import { validatePlanningInput } from "../src/modules/ai/planning.service.js";
import { validatePlanningEvent } from "../src/modules/advisor/planning-events.validators.js";

test("planning request accepts supported horizon and enforces Manila timezone", () => {
  assert.deepEqual(validatePlanningInput({ horizonDays: 30, tz: "Asia/Manila", sourceMode: "live", forceRefresh: true }), { horizonDays: 30, tz: "Asia/Manila", sourceMode: "live", forceRefresh: true });
  assert.throws(() => validatePlanningInput({ horizonDays: 7 }));
  assert.throws(() => validatePlanningInput({ horizonDays: 30, tz: "UTC" }));
});

test("planning events validate closure and date rules", () => {
  assert.deepEqual(validatePlanningEvent({ title: "Store closed", eventType: "closure", startsOn: "2026-12-25", endsOn: "2026-12-25", demandAdjustmentPct: -100 }), { title: "Store closed", eventType: "closure", startsOn: "2026-12-25", endsOn: "2026-12-25", demandAdjustmentPct: -100 });
  assert.throws(() => validatePlanningEvent({ title: "Bad closure", eventType: "closure", startsOn: "2026-12-25", endsOn: "2026-12-25", demandAdjustmentPct: -20 }));
  assert.throws(() => validatePlanningEvent({ title: "Reverse", eventType: "promotion", startsOn: "2026-12-26", endsOn: "2026-12-25", demandAdjustmentPct: 20 }));
});
