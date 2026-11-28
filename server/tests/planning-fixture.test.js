import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(here, "../../supabase/seed/002_dev_inventory_advisor_fixture.sql");

test("Inventory Advisor development fixture is repeatable and includes the acceptance inputs", () => {
  const sql = fs.readFileSync(fixturePath, "utf8");
  for (const required of [
    "MESA Poultry Supply",
    "Chicken thighs",
    "menu_item_recipes",
    "physical_count",
    "wastage",
    "payment_status",
    "'paid'",
    "Weekend chicken promotion",
    "Fixture closure",
    "ON CONFLICT",
  ]) {
    assert.ok(sql.includes(required), `fixture must include ${required}`);
  }
  const orderItemsInsert = sql.indexOf("INSERT INTO public.order_items");
  const paidTransition = sql.indexOf("UPDATE public.orders\nSET payment_status = 'paid'");
  assert.ok(orderItemsInsert >= 0 && paidTransition > orderItemsInsert, "fixture must transition orders to paid only after order items are inserted");
  assert.ok(!sql.includes("production data".toUpperCase()));
});
