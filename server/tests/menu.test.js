import { supabase } from "../src/config/supabase.js";

const API_URL = process.env.API_URL || "http://localhost:5000/api";

async function runTests() {
  console.log("=== STARTING MENU MANAGEMENT API TESTS ===\n");

  let adminToken = "";
  let cashierToken = "";
  let createdCategoryId = null;
  let createdItemId = null;
  let emptyCategoryId = null;

  // 1. Sign in as Admin
  console.log("1. Authenticating as Admin...");
  const adminLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@gmail.com", password: "weareithink" }),
  });
  const adminLogin = await adminLoginRes.json();
  if (!adminLoginRes.ok || !adminLogin.accessToken) {
    throw new Error(`Admin login failed: ${JSON.stringify(adminLogin)}`);
  }
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
  if (!cashierLoginRes.ok || !cashierLogin.accessToken) {
    throw new Error(`Cashier login failed: ${JSON.stringify(cashierLogin)}`);
  }
  cashierToken = cashierLogin.accessToken;
  console.log("✓ Cashier authenticated successfully.");

  try {
    // 3. Test RBAC: Cashier should receive 403 on Menu Management routes
    console.log("\n3. Testing RBAC (Cashier attempting to access /api/menu/categories)...");
    const forbiddenRes = await fetch(`${API_URL}/menu/categories`, {
      headers: { Authorization: `Bearer ${cashierToken}` },
    });
    const forbiddenBody = await forbiddenRes.json();
    if (forbiddenRes.status === 403 && forbiddenBody?.error?.code === "ROLE_FORBIDDEN") {
      console.log("✓ RBAC enforced: Cashier correctly rejected with 403 ROLE_FORBIDDEN.");
    } else {
      throw new Error(`Expected 403 ROLE_FORBIDDEN but got ${forbiddenRes.status}: ${JSON.stringify(forbiddenBody)}`);
    }

    // 4. Test Category Listing
    console.log("\n4. Admin fetching categories...");
    const catListRes = await fetch(`${API_URL}/menu/categories`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const catList = await catListRes.json();
    if (!catListRes.ok || !Array.isArray(catList.categories)) {
      throw new Error(`Failed to fetch categories: ${JSON.stringify(catList)}`);
    }
    console.log(`✓ Fetched ${catList.categories.length} existing categories.`);

    // 5. Test Category Creation
    const testCategoryName = `Test Category ${Date.now()}`;
    console.log(`\n5. Creating category: "${testCategoryName}"...`);
    const createCatRes = await fetch(`${API_URL}/menu/categories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name: testCategoryName, sortOrder: 99 }),
    });
    const newCat = await createCatRes.json();
    if (!createCatRes.ok || !newCat.id) {
      throw new Error(`Failed to create category: ${JSON.stringify(newCat)}`);
    }
    createdCategoryId = newCat.id;
    console.log(`✓ Category created with ID: ${newCat.id}`);

    // 6. Test Category Update
    console.log("\n6. Updating category name and sort order...");
    const updatedCategoryName = `${testCategoryName} (Updated)`;
    const updateCatRes = await fetch(`${API_URL}/menu/categories/${newCat.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name: updatedCategoryName, sortOrder: 100 }),
    });
    const updatedCat = await updateCatRes.json();
    if (!updateCatRes.ok || updatedCat.name !== updatedCategoryName) {
      throw new Error(`Failed to update category: ${JSON.stringify(updatedCat)}`);
    }
    console.log("✓ Category updated successfully.");

    // 7. Test Menu Item Creation
    const testItemName = `Test Item ${Date.now()}`;
    console.log(`\n7. Creating menu item: "${testItemName}"...`);
    const createItemRes = await fetch(`${API_URL}/menu/items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        categoryId: newCat.id,
        name: testItemName,
        description: "A delicious gourmet test dish",
        price: 185.5,
        costPrice: 72.0,
        isAvailable: true,
      }),
    });
    const newItem = await createItemRes.json();
    if (!createItemRes.ok || !newItem.id) {
      throw new Error(`Failed to create menu item: ${JSON.stringify(newItem)}`);
    }
    createdItemId = newItem.id;
    console.log(`✓ Menu item created with ID: ${newItem.id}, price: ₱${newItem.price}, cost: ₱${newItem.costPrice}`);

    // 8. Test Fast Availability Toggle (Sold Out / In Stock)
    console.log("\n8. Toggling item availability to SOLD OUT (isAvailable: false)...");
    const soldOutRes = await fetch(`${API_URL}/menu/items/${newItem.id}/availability`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isAvailable: false }),
    });
    const soldOutItem = await soldOutRes.json();
    if (!soldOutRes.ok || soldOutItem.isAvailable !== false) {
      throw new Error(`Failed to toggle availability: ${JSON.stringify(soldOutItem)}`);
    }
    console.log("✓ Item availability toggled to false (Sold Out).");

    // Verify Customer Menu reflects isAvailable: false
    console.log("Verifying customer menu reflects isAvailable: false...");
    const custMenuRes1 = await fetch(`${API_URL}/customer/menu`);
    const custMenu1 = await custMenuRes1.json();
    const foundInCust1 = (custMenu1.categories || [])
      .flatMap((c) => c.items)
      .find((i) => i.id === newItem.id);
    if (!foundInCust1 || foundInCust1.isAvailable !== false) {
      throw new Error(`Customer menu did not reflect sold-out status: ${JSON.stringify(foundInCust1)}`);
    }
    console.log("✓ Customer menu correctly shows item with isAvailable: false.");

    // 9. Test Soft Deactivation (isActive: false)
    console.log("\n9. Testing soft deactivation (isActive: false)...");
    const deactRes = await fetch(`${API_URL}/menu/items/${newItem.id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isActive: false }),
    });
    const deactItem = await deactRes.json();
    if (!deactRes.ok || deactItem.isActive !== false) {
      throw new Error(`Failed to soft-deactivate item: ${JSON.stringify(deactItem)}`);
    }
    console.log("✓ Item soft-deactivated (isActive: false).");

    // Verify Customer Menu excludes deactivated item
    console.log("Verifying customer menu hides soft-deactivated item...");
    const custMenuRes2 = await fetch(`${API_URL}/customer/menu`);
    const custMenu2 = await custMenuRes2.json();
    const foundInCust2 = (custMenu2.categories || [])
      .flatMap((c) => c.items)
      .find((i) => i.id === newItem.id);
    if (foundInCust2) {
      throw new Error(`Inactive item should NOT appear in customer menu, but was found: ${JSON.stringify(foundInCust2)}`);
    }
    console.log("✓ Deactivated item is completely hidden from customer menu.");

    // Verify Admin endpoint STILL returns the deactivated item when requested
    console.log("Verifying admin menu item endpoint still includes archived item...");
    const adminItemsRes = await fetch(`${API_URL}/menu/items?includeInactive=true`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminItems = await adminItemsRes.json();
    const foundInAdmin = (adminItems.items || []).find((i) => i.id === newItem.id);
    if (!foundInAdmin || foundInAdmin.isActive !== false) {
      throw new Error(`Admin endpoint should include inactive item: ${JSON.stringify(foundInAdmin)}`);
    }
    console.log("✓ Admin endpoint returns inactive item in archived list.");

    // 10. Reactivate Item
    console.log("\n10. Restoring/reactivating item (isActive: true)...");
    const restoreRes = await fetch(`${API_URL}/menu/items/${newItem.id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isActive: true }),
    });
    const restoredItem = await restoreRes.json();
    if (!restoreRes.ok || restoredItem.isActive !== true) {
      throw new Error(`Failed to reactivate item: ${JSON.stringify(restoredItem)}`);
    }
    console.log("✓ Item restored (isActive: true).");

    // 11. Attempt to remove category with active item -> should reject with 409 CATEGORY_IN_USE
    console.log("\n11. Testing Category removal protection when active items exist...");
    const blockedDeleteRes = await fetch(`${API_URL}/menu/categories/${newCat.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const blockedDelete = await blockedDeleteRes.json();
    if (blockedDeleteRes.status !== 409 || blockedDelete?.error?.code !== "CATEGORY_IN_USE") {
      throw new Error(`Expected 409 CATEGORY_IN_USE, got ${blockedDeleteRes.status}: ${JSON.stringify(blockedDelete)}`);
    }
    console.log("✓ Removal blocked while active items exist (409 CATEGORY_IN_USE).");

    // 12. Archive item again, then remove category (soft-deactivates because archived item exists)
    console.log("\n12. Archiving item then removing category...");
    await fetch(`${API_URL}/menu/items/${newItem.id}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ isActive: false }),
    });

    const deleteCatRes = await fetch(`${API_URL}/menu/categories/${newCat.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const deleteCat = await deleteCatRes.json();
    if (!deleteCatRes.ok || !deleteCat.ok) {
      throw new Error(`Failed to remove category: ${JSON.stringify(deleteCat)}`);
    }
    console.log(`✓ Category removed (softDeleted: ${deleteCat.softDeleted}).`);

    // 13. Create an empty category and delete it -> should hard delete
    console.log("\n13. Testing hard removal of an empty category...");
    const emptyCatRes = await fetch(`${API_URL}/menu/categories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name: `Empty Cat ${Date.now()}`, sortOrder: 101 }),
    });
    const emptyCat = await emptyCatRes.json();
    emptyCategoryId = emptyCat.id;
    const deleteEmptyRes = await fetch(`${API_URL}/menu/categories/${emptyCat.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const deleteEmpty = await deleteEmptyRes.json();
    if (!deleteEmptyRes.ok || deleteEmpty.softDeleted !== false) {
      throw new Error(`Expected hard delete of empty category, got: ${JSON.stringify(deleteEmpty)}`);
    }
    emptyCategoryId = null; // successfully deleted
    console.log("✓ Empty category hard-deleted.");

    console.log("\n===========================================");
    console.log("🎉 ALL MENU MANAGEMENT API TESTS PASSED! 🎉");
    console.log("===========================================\n");
  } finally {
    // ── Cleanup: remove all test data from the live database ──────────────
    console.log("\n🧹 Cleaning up test data...");

    if (createdItemId) {
      await supabase.from("menu_items").delete().eq("id", createdItemId).catch(() => {});
    }
    if (createdCategoryId) {
      await supabase.from("menu_categories").delete().eq("id", createdCategoryId).catch(() => {});
    }
    if (emptyCategoryId) {
      await supabase.from("menu_categories").delete().eq("id", emptyCategoryId).catch(() => {});
    }

    // Also clean up any orphaned test data from previous unclean runs
    const { data: orphanedItems } = await supabase
      .from("menu_items")
      .select("id")
      .like("name", "Test Item %");

    if (orphanedItems?.length) {
      const ids = orphanedItems.map((i) => i.id);
      await supabase.from("menu_items").delete().in("id", ids).catch(() => {});
      console.log(`  Cleaned ${ids.length} orphaned test item(s).`);
    }

    const { data: orphanedCats } = await supabase
      .from("menu_categories")
      .select("id")
      .or("name.like.Test Category %,name.like.Empty Cat %");

    if (orphanedCats?.length) {
      const ids = orphanedCats.map((c) => c.id);
      // Delete items in orphaned test categories first (FK constraint)
      await supabase.from("menu_items").delete().in("category_id", ids).catch(() => {});
      await supabase.from("menu_categories").delete().in("id", ids).catch(() => {});
      console.log(`  Cleaned ${ids.length} orphaned test category/ies.`);
    }

    console.log("✓ Cleanup complete.");
  }
}

runTests().catch((err) => {
  console.error("\n❌ TEST FAILED:", err);
  process.exit(1);
});
