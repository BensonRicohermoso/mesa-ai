import assert from "node:assert/strict";
import { supabase } from "../src/config/supabase.js";

const API_URL = process.env.API_URL || "http://localhost:5000/api";

async function runTests() {
  console.log("=== STARTING TABLE MANAGEMENT API TESTS ===\n");

  let adminToken = "";
  let cashierToken = "";
  let createdTableId = null;

  try {
    // 1. Sign in as Admin
    console.log("1. Authenticating as Admin...");
    const adminLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@gmail.com", password: "weareithink" }),
    });
    const adminLogin = await adminLoginRes.json();
    assert.ok(adminLoginRes.ok && adminLogin.accessToken, `Admin login failed: ${JSON.stringify(adminLogin)}`);
    adminToken = adminLogin.accessToken;
    console.log("✓ Admin authenticated successfully.");

    // 2. Sign in as Cashier
    console.log("\n2. Authenticating as Cashier...");
    const cashierLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "cashier@gmail.com", password: "weareithink" }),
    });
    const cashierLogin = await cashierLoginRes.json();
    assert.ok(cashierLoginRes.ok && cashierLogin.accessToken, `Cashier login failed: ${JSON.stringify(cashierLogin)}`);
    cashierToken = cashierLogin.accessToken;
    console.log("✓ Cashier authenticated successfully.");

    // 3. Test RBAC: Cashier should receive 403 on Table Management routes
    console.log("\n3. Testing RBAC (Cashier attempting to access /api/tables)...");
    const forbiddenRes = await fetch(`${API_URL}/tables`, {
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    const forbiddenBody = await forbiddenRes.json();
    assert.equal(forbiddenRes.status, 403);
    assert.equal(forbiddenBody?.error?.code, "ROLE_FORBIDDEN");
    console.log("✓ RBAC enforced: Cashier rejected with 403 ROLE_FORBIDDEN.");

    // 4. Test Listing Tables
    console.log("\n4. Admin fetching tables...");
    const listRes = await fetch(`${API_URL}/tables`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const listBody = await listRes.json();
    assert.ok(listRes.ok && Array.isArray(listBody.tables), `Failed to list tables: ${JSON.stringify(listBody)}`);
    console.log(`✓ Fetched ${listBody.tables.length} existing dining tables.`);

    // 5. Test Validation Error
    console.log("\n5. Testing validation on invalid tableCode...");
    const invalidRes = await fetch(`${API_URL}/tables`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ tableCode: "T-01!", label: "Invalid Table" }),
    });
    const invalidBody = await invalidRes.json();
    assert.equal(invalidRes.status, 400);
    assert.equal(invalidBody?.error?.code, "VALIDATION_ERROR");
    console.log("✓ Non-alphanumeric tableCode rejected with 400 VALIDATION_ERROR.");

    // 6. Test Table Creation (including auto-uppercasing & customerUrl)
    const rawCode = `tst${String(Date.now()).slice(-6)}`;
    const expectedCode = rawCode.toUpperCase();
    console.log(`\n6. Creating table "${rawCode}" (expects "${expectedCode}")...`);
    const createRes = await fetch(`${API_URL}/tables`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ tableCode: rawCode, label: "Patio Test Table" }),
    });
    const created = await createRes.json();
    assert.equal(createRes.status, 201, `Create failed: ${JSON.stringify(created)}`);
    assert.equal(created.tableCode, expectedCode);
    assert.equal(created.label, "Patio Test Table");
    assert.equal(created.isActive, true);
    assert.ok(created.customerUrl.endsWith(`/t/${expectedCode}`), `Unexpected customerUrl: ${created.customerUrl}`);
    createdTableId = created.id;
    console.log(`✓ Created table ${created.tableCode} (${created.id}) -> ${created.customerUrl}`);

    // 7. Test Duplicate Table Code Rejection
    console.log("\n7. Testing duplicate tableCode rejection...");
    const dupRes = await fetch(`${API_URL}/tables`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ tableCode: expectedCode, label: "Duplicate Table" }),
    });
    const dupBody = await dupRes.json();
    assert.equal(dupRes.status, 409);
    assert.equal(dupBody?.error?.code, "TABLE_DUPLICATE");
    console.log("✓ Duplicate tableCode rejected with 409 TABLE_DUPLICATE.");

    // 8. Test Table Update
    const updatedCode = `${expectedCode}U`;
    const updatedLabel = "VIP Patio Suite";
    console.log(`\n8. Updating table to "${updatedCode}" / "${updatedLabel}"...`);
    const updateRes = await fetch(`${API_URL}/tables/${createdTableId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ tableCode: updatedCode, label: updatedLabel, isActive: true }),
    });
    const updated = await updateRes.json();
    assert.equal(updateRes.status, 200, `Update failed: ${JSON.stringify(updated)}`);
    assert.equal(updated.tableCode, updatedCode);
    assert.equal(updated.label, updatedLabel);
    assert.ok(updated.customerUrl.endsWith(`/t/${updatedCode}`));
    console.log("✓ Table updated successfully.");

    // 9. Test Customer Table Endpoint while Active
    console.log("\n9. Verifying /api/customer/tables/:tableCode returns 200 when active...");
    const custActiveRes = await fetch(`${API_URL}/customer/tables/${updatedCode}`);
    const custActiveBody = await custActiveRes.json();
    assert.equal(custActiveRes.status, 200);
    assert.equal(custActiveBody.tableCode, updatedCode);
    assert.equal(custActiveBody.label, updatedLabel);
    console.log("✓ Customer lookup returns active table.");

    // 10. Test Deactivating Table & Customer Lookup Returns 404
    console.log("\n10. Deactivating table (isActive: false)...");
    const deactRes = await fetch(`${API_URL}/tables/${createdTableId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isActive: false }),
    });
    const deactBody = await deactRes.json();
    assert.equal(deactRes.status, 200);
    assert.equal(deactBody.isActive, false);
    console.log("✓ Table deactivated.");

    console.log("Verifying /api/customer/tables/:tableCode returns 404 when inactive...");
    const custInactiveRes = await fetch(`${API_URL}/customer/tables/${updatedCode}`);
    const custInactiveBody = await custInactiveRes.json();
    assert.equal(custInactiveRes.status, 404);
    assert.equal(custInactiveBody?.error?.code, "TABLE_NOT_FOUND");
    console.log("✓ Inactive table returns 404 TABLE_NOT_FOUND on customer endpoint.");

    // 11. Test Reactivating Table
    console.log("\n11. Reactivating table (isActive: true)...");
    const reactRes = await fetch(`${API_URL}/tables/${createdTableId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isActive: true }),
    });
    const reactBody = await reactRes.json();
    assert.equal(reactRes.status, 200);
    assert.equal(reactBody.isActive, true);
    console.log("✓ Table reactivated.");

    console.log("\n===========================================");
    console.log("🎉 ALL TABLE MANAGEMENT API TESTS PASSED! 🎉");
    console.log("===========================================\n");
  } finally {
    if (createdTableId) {
      await supabase.from("dining_tables").delete().eq("id", createdTableId);
    }
  }
}

runTests().catch((err) => {
  console.error("\n❌ TEST FAILED:", err);
  process.exit(1);
});
