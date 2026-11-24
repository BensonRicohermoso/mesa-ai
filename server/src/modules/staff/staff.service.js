import { supabase } from "../../config/supabase.js";
import { createAuthError } from "../../lib/errors.js";

const STAFF_SELECT =
  "id,full_name,role,is_active,created_at,updated_at";

function formatStaffRecord(profile, authUser, activeAdminCount) {
  const hasPin = Boolean(authUser?.user_metadata?.pin_code);
  const isLastActiveAdmin =
    profile.role === "admin" && profile.is_active && activeAdminCount <= 1;

  return {
    id: profile.id,
    fullName: profile.full_name,
    email: authUser?.email ?? null,
    role: profile.role,
    isActive: profile.is_active,
    hasPin,
    isLastActiveAdmin,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  };
}

/**
 * Load all Supabase Auth users indexed by user id.
 */
async function listAuthUsersMap() {
  const userMap = new Map();
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw error;

    const users = data?.users || [];
    for (const user of users) {
      userMap.set(user.id, user);
    }

    if (users.length < perPage) break;
    page += 1;
  }

  return userMap;
}

async function getStaffProfileById(id) {
  const { data, error } = await supabase
    .from("staff_profiles")
    .select(STAFF_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw createAuthError(404, "STAFF_NOT_FOUND", "Staff member not found.");
  }
  return data;
}

async function countActiveAdmins(excludeId = null) {
  let query = supabase
    .from("staff_profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("is_active", true);

  if (excludeId) {
    query = query.neq("id", excludeId);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

function buildLastAdminError(nextActive) {
  if (!nextActive) {
    return createAuthError(
      400,
      "LAST_ADMIN_CANNOT_BE_DEACTIVATED",
      "Cannot deactivate the last active administrator. At least one active admin must remain."
    );
  }
  return createAuthError(
    400,
    "CANNOT_DEMOTE_LAST_ADMIN",
    "Cannot change role: at least one active administrator must remain."
  );
}

/**
 * Enforce that deactivating or demoting an active admin never leaves zero active admins.
 */
async function assertNotLastActiveAdmin(currentProfile, nextRole, nextActive) {
  const isRemovingAdmin =
    currentProfile.role === "admin" &&
    currentProfile.is_active &&
    (nextRole !== "admin" || !nextActive);

  if (!isRemovingAdmin) return;

  const remainingAdmins = await countActiveAdmins(currentProfile.id);
  if (remainingAdmins === 0) {
    throw buildLastAdminError(nextActive);
  }
}

/**
 * Post-update invariant check that restores the prior admin state on concurrent removal.
 */
async function verifyActiveAdminInvariant(previousProfile, nextRole, nextActive) {
  const wasRemovingAdmin =
    previousProfile.role === "admin" &&
    previousProfile.is_active &&
    (nextRole !== "admin" || !nextActive);

  if (!wasRemovingAdmin) return;

  const totalActiveAdmins = await countActiveAdmins();
  if (totalActiveAdmins === 0) {
    await supabase
      .from("staff_profiles")
      .update({
        role: previousProfile.role,
        is_active: previousProfile.is_active,
      })
      .eq("id", previousProfile.id);

    throw buildLastAdminError(nextActive);
  }
}

function isDuplicateEmailError(error) {
  const message = (error?.message || "").toLowerCase();
  return (
    error?.code === "email_exists" ||
    error?.status === 422 ||
    message.includes("already been registered") ||
    message.includes("already exists")
  );
}

/**
 * List all staff profiles joined with Supabase Auth email and PIN status.
 */
export async function getAllStaff() {
  const [{ data: profiles, error }, authUsersMap] = await Promise.all([
    supabase
      .from("staff_profiles")
      .select(STAFF_SELECT)
      .order("full_name", { ascending: true }),
    listAuthUsersMap(),
  ]);

  if (error) throw error;

  const rows = profiles || [];
  const activeAdminCount = rows.filter(
    (row) => row.role === "admin" && row.is_active
  ).length;

  return rows.map((row) =>
    formatStaffRecord(row, authUsersMap.get(row.id), activeAdminCount)
  );
}

/**
 * Provision a new staff account in Supabase Auth and staff_profiles.
 */
export async function provisionStaff({
  fullName,
  email,
  password,
  role,
  pinCode,
  isActive = true,
}) {
  const userMetadata = { full_name: fullName };
  if (pinCode) {
    userMetadata.pin_code = pinCode;
  }

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    });

  if (authError || !authData?.user) {
    if (isDuplicateEmailError(authError)) {
      throw createAuthError(
        409,
        "STAFF_EMAIL_EXISTS",
        `A staff account with email "${email}" already exists.`
      );
    }
    throw createAuthError(
      400,
      "STAFF_PROVISION_FAILED",
      authError?.message || "Failed to provision staff account."
    );
  }

  const createdUser = authData.user;

  const { data: profile, error: profileError } = await supabase
    .from("staff_profiles")
    .insert({
      id: createdUser.id,
      full_name: fullName,
      role,
      is_active: isActive,
    })
    .select(STAFF_SELECT)
    .single();

  if (profileError) {
    await supabase.auth.admin.deleteUser(createdUser.id).catch(() => {});
    throw profileError;
  }

  const activeAdminCount = await countActiveAdmins();
  return formatStaffRecord(profile, createdUser, activeAdminCount);
}

/**
 * Update a staff member's profile, role, active state, PIN, or password.
 */
export async function updateStaff(id, updates) {
  const current = await getStaffProfileById(id);

  const nextRole = updates.role ?? current.role;
  const nextActive =
    updates.isActive !== undefined ? updates.isActive : current.is_active;

  await assertNotLastActiveAdmin(current, nextRole, nextActive);

  const profileUpdates = {};
  if (updates.fullName !== undefined) profileUpdates.full_name = updates.fullName;
  if (updates.role !== undefined) profileUpdates.role = updates.role;
  if (updates.isActive !== undefined) profileUpdates.is_active = updates.isActive;

  let updatedProfile = current;
  if (Object.keys(profileUpdates).length > 0) {
    const { data, error } = await supabase
      .from("staff_profiles")
      .update(profileUpdates)
      .eq("id", id)
      .select(STAFF_SELECT)
      .single();

    if (error) throw error;
    updatedProfile = data;

    await verifyActiveAdminInvariant(current, nextRole, nextActive);
  }

  const { data: existingAuth, error: fetchAuthError } =
    await supabase.auth.admin.getUserById(id);
  if (fetchAuthError || !existingAuth?.user) {
    throw createAuthError(
      404,
      "STAFF_NOT_FOUND",
      "Linked authentication account was not found."
    );
  }

  let authUser = existingAuth.user;
  const needsAuthUpdate =
    updates.password !== undefined ||
    updates.pinCode !== undefined ||
    updates.fullName !== undefined;

  if (needsAuthUpdate) {
    const nextMeta = { ...(authUser.user_metadata || {}) };
    if (updates.fullName !== undefined) {
      nextMeta.full_name = updates.fullName;
    }
    if (updates.pinCode !== undefined) {
      nextMeta.pin_code = updates.pinCode;
    }

    const authPayload = { user_metadata: nextMeta };
    if (updates.password !== undefined) {
      authPayload.password = updates.password;
    }

    const { data: updatedAuth, error: authUpdateError } =
      await supabase.auth.admin.updateUserById(id, authPayload);

    if (authUpdateError || !updatedAuth?.user) {
      throw createAuthError(
        400,
        "STAFF_AUTH_UPDATE_FAILED",
        authUpdateError?.message || "Failed to update staff authentication settings."
      );
    }
    authUser = updatedAuth.user;
  }

  const activeAdminCount = await countActiveAdmins();
  return formatStaffRecord(updatedProfile, authUser, activeAdminCount);
}

/**
 * Activate or deactivate a staff account while protecting the last active admin.
 */
export async function setStaffStatus(id, isActive) {
  const current = await getStaffProfileById(id);
  await assertNotLastActiveAdmin(current, current.role, isActive);

  const { data: updatedProfile, error } = await supabase
    .from("staff_profiles")
    .update({ is_active: isActive })
    .eq("id", id)
    .select(STAFF_SELECT)
    .single();

  if (error) throw error;

  await verifyActiveAdminInvariant(current, current.role, isActive);

  const { data: authData } = await supabase.auth.admin.getUserById(id);
  const activeAdminCount = await countActiveAdmins();

  return formatStaffRecord(updatedProfile, authData?.user, activeAdminCount);
}
