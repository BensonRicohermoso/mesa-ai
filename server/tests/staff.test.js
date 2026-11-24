import assert from "node:assert/strict";
import { supabase } from "../src/config/supabase.js";

const API_URL = process.env.API_URL || "http://localhost:5000/api";

async function runTests() {
  console.log("=== STARTING STAFF MANAGEMENT API TESTS ===\n");

  let adminToken = "";
  let cashierToken = "";
  let adminStaffId = "";
  let createdStaffId = null;

  try {
    // 1. Sign in as Admin
    console.log("1. Authenticating as Admin...");
    const adminLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "admin@gmail.com",
        password: "weareithink",
      }),
    });
    const adminLogin = await adminLoginRes.json();
    assert.ok(
      adminLoginRes.ok && adminLogin.accessToken,
      `Admin login failed: ${JSON.stringify(adminLogin)}`
    );
    adminToken = adminLogin.accessToken;
    adminStaffId = adminLogin.staff.id;
    console.log("✓ Admin authenticated successfully.");

    // 2. Sign in as Cashier
    console.log("\n2. Authenticating as Cashier...");
    const cashierLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "cashier@gmail.com",
        password: "weareithink",
      }),
    });
    const cashierLogin = await cashierLoginRes.json();
    assert.ok(
      cashierLoginRes.ok && cashierLogin.accessToken,
      `Cashier login failed: ${JSON.stringify(cashierLogin)}`
    );
    cashierToken = cashierLogin.accessToken;
    console.log("✓ Cashier authenticated successfully.");

    // 3. Test RBAC: Cashier should receive 403 on Staff Management routes
    console.log("\n3. Testing RBAC (Cashier attempting to access /api/staff)...");
    const forbiddenRes = await fetch(`${API_URL}/staff`, {
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    const forbiddenBody = await forbiddenRes.json();
    assert.equal(forbiddenRes.status, 403);
    assert.equal(forbiddenBody?.error?.code, "ROLE_FORBIDDEN");
    console.log("✓ RBAC enforced: Cashier rejected with 403 ROLE_FORBIDDEN.");

    // 4. Test Listing Staff
    console.log("\n4. Admin fetching staff roster...");
    const listRes = await fetch(`${API_URL}/staff`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const listBody = await listRes.json();
    assert.ok(
      listRes.ok && Array.isArray(listBody.staff),
      `Failed to list staff: ${JSON.stringify(listBody)}`
    );
    const adminRecord = listBody.staff.find((s) => s.id === adminStaffId);
    assert.ok(adminRecord, "Admin record not found in /api/staff response.");
    assert.equal(adminRecord.email, "admin@gmail.com");
    assert.equal(adminRecord.role, "admin");
    assert.equal(adminRecord.isActive, true);
    console.log(`✓ Fetched ${listBody.staff.length} staff profiles.`);

    // 5. Test Validation Errors
    console.log("\n5. Testing validation on invalid provision payload...");
    const invalidRes = await fetch(`${API_URL}/staff`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        fullName: "X",
        email: "not-an-email",
        password: "123",
        role: "manager",
      }),
    });
    const invalidBody = await invalidRes.json();
    assert.equal(invalidRes.status, 400);
    assert.equal(invalidBody?.error?.code, "VALIDATION_ERROR");
    console.log("✓ Invalid payload rejected with 400 VALIDATION_ERROR.");

    // 6. Test Provisioning a New Staff Member
    const uniqueSuffix = String(Date.now()).slice(-6);
    const testEmail = `staff.test.${uniqueSuffix}@mesa.local`;
    const initialPin = "4821";
    console.log(`\n6. Provisioning new cashier (${testEmail})...`);
    const createRes = await fetch(`${API_URL}/staff`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        fullName: "Test Cashier",
        email: testEmail,
        password: "testpassword123",
        role: "cashier",
        pinCode: initialPin,
      }),
    });
    const created = await createRes.json();
    assert.equal(
      createRes.status,
      201,
      `Create failed: ${JSON.stringify(created)}`
    );
    assert.equal(created.fullName, "Test Cashier");
    assert.equal(created.email, testEmail);
    assert.equal(created.role, "cashier");
    assert.equal(created.isActive, true);
    assert.equal(created.hasPin, true);
    createdStaffId = created.id;
    console.log(`✓ Provisioned staff ${created.fullName} (${created.id}).`);

    // 7. Test Duplicate Email Rejection
    console.log("\n7. Testing duplicate email rejection...");
    const dupRes = await fetch(`${API_URL}/staff`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        fullName: "Duplicate Staff",
        email: testEmail,
        password: "testpassword123",
        role: "kitchen",
      }),
    });
    const dupBody = await dupRes.json();
    assert.equal(dupRes.status, 409);
    assert.equal(dupBody?.error?.code, "STAFF_EMAIL_EXISTS");
    console.log("✓ Duplicate email rejected with 409 STAFF_EMAIL_EXISTS.");

    // 8. Verify Provisioned Staff Can Sign In & Switch by PIN
    console.log("\n8. Verifying provisioned staff login & PIN switch...");
    const staffLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: "testpassword123",
      }),
    });
    const staffLogin = await staffLoginRes.json();
    assert.equal(
      staffLoginRes.status,
      200,
      `Provisioned staff login failed: ${JSON.stringify(staffLogin)}`
    );
    assert.equal(staffLogin.staff.role, "cashier");

    const pinRes = await fetch(`${API_URL}/auth/pin-switch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: initialPin, staffId: createdStaffId }),
    });
    assert.equal(pinRes.status, 200, "PIN switch failed for provisioned staff.");
    console.log("✓ Provisioned staff login and PIN switch succeeded.");

    // 9. Test Updating Staff Role, Name, and PIN
    const updatedPin = "9134";
    console.log("\n9. Updating provisioned staff to kitchen with new PIN...");
    const updateRes = await fetch(`${API_URL}/staff/${createdStaffId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        fullName: "Chef Test Staff",
        role: "kitchen",
        pinCode: updatedPin,
      }),
    });
    const updated = await updateRes.json();
    assert.equal(
      updateRes.status,
      200,
      `Update failed: ${JSON.stringify(updated)}`
    );
    assert.equal(updated.fullName, "Chef Test Staff");
    assert.equal(updated.role, "kitchen");
    assert.equal(updated.hasPin, true);
    console.log("✓ Staff details updated successfully.");

    // 10. Test Deactivating Staff & Verifying Login Blocked
    console.log("\n10. Deactivating provisioned staff (isActive: false)...");
    const deactRes = await fetch(`${API_URL}/staff/${createdStaffId}/status`, {
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

    const blockedLoginRes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: "testpassword123",
      }),
    });
    const blockedLoginBody = await blockedLoginRes.json();
    assert.equal(blockedLoginRes.status, 403);
    assert.equal(blockedLoginBody?.error?.code, "STAFF_ACCOUNT_INACTIVE");
    console.log("✓ Deactivated staff blocked from login with 403 STAFF_ACCOUNT_INACTIVE.");

    // 11. Test Last Active Admin Protection
    console.log("\n11. Testing Last Active Admin Protection...");
    const activeAdmins = listBody.staff.filter(
      (s) => s.role === "admin" && s.isActive
    );

    if (activeAdmins.length === 1) {
      // Attempt to deactivate sole active admin
      const lastDeactRes = await fetch(`${API_URL}/staff/${adminStaffId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ isActive: false }),
      });
      const lastDeactBody = await lastDeactRes.json();
      assert.equal(lastDeactRes.status, 400);
      assert.equal(
        lastDeactBody?.error?.code,
        "LAST_ADMIN_CANNOT_BE_DEACTIVATED"
      );
      console.log(
        "✓ Sole admin deactivation blocked with 400 LAST_ADMIN_CANNOT_BE_DEACTIVATED."
      );

      // Attempt to demote sole active admin
      const lastDemoteRes = await fetch(`${API_URL}/staff/${adminStaffId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ role: "cashier" }),
      });
      const lastDemoteBody = await lastDemoteRes.json();
      assert.equal(lastDemoteRes.status, 400);
      assert.equal(lastDemoteBody?.error?.code, "CANNOT_DEMOTE_LAST_ADMIN");
      console.log(
        "✓ Sole admin demotion blocked with 400 CANNOT_DEMOTE_LAST_ADMIN."
      );

      // Promote & reactivate test staff to admin (now 2 active admins)
      console.log("Promoting test staff to active admin (2 active admins)...");
      const promoteRes = await fetch(`${API_URL}/staff/${createdStaffId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ role: "admin", isActive: true }),
      });
      assert.equal(promoteRes.status, 200);

      // Now demoting test staff back to cashier succeeds (1 active admin left)
      const demoteSecondRes = await fetch(`${API_URL}/staff/${createdStaffId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ role: "cashier" }),
      });
      assert.equal(demoteSecondRes.status, 200);
      console.log(
        "✓ Second admin demotion allowed while primary admin remains active."
      );
    } else {
      console.log(
        `ℹ Skipping sole-admin failure check (${activeAdmins.length} active admins already exist in DB).`
      );
    }

    console.log("\n==========================================");
    console.log("🎉 ALL STAFF MANAGEMENT API TESTS PASSED! 🎉");
    console.log("==========================================\n");
  } finally {
    if (createdStaffId) {
      await supabase.from("staff_profiles").delete().eq("id", createdStaffId);
      await supabase.auth.admin.deleteUser(createdStaffId).catch(() => {});
    }
  }
}

runTests().catch((err) => {
  console.error("\n❌ TEST FAILED:", err);
  process.exit(1);
});
