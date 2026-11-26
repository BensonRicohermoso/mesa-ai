import { supabase, supabaseAuth } from "../../config/supabase.js";
import { createAuthError } from "../../lib/errors.js";

export function formatStaff(profile) {
  return {
    id: profile.id,
    fullName: profile.full_name,
    role: profile.role,
  };
}

// Shared: load and validate a staff profile by user id.
// Throws a structured auth error when the profile is missing or inactive.
export async function getActiveStaffProfile(userId) {
  const { data: profile, error } = await supabase
    .from("staff_profiles")
    .select("id,full_name,role,is_active")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;

  if (!profile) {
    throw createAuthError(
      403,
      "STAFF_PROFILE_NOT_FOUND",
      "This account is not assigned to a staff profile."
    );
  }

  if (!profile.is_active) {
    throw createAuthError(
      403,
      "STAFF_ACCOUNT_INACTIVE",
      "This staff account is inactive."
    );
  }

  return profile;
}

// Authenticate staff with Supabase and return only the session data the client needs.
export async function loginStaff({ email, password }) {
  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user || !data.session) {
    throw createAuthError(
      401,
      "INVALID_CREDENTIALS",
      "Invalid email or password."
    );
  }

  const staff = await getActiveStaffProfile(data.user.id);

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: new Date(data.session.expires_at * 1000).toISOString(),
    user: {
      id: data.user.id,
      email: data.user.email ?? null,
    },
    staff: formatStaff(staff),
  };
}

// Exchange a refresh token for a new Supabase session.
export async function refreshStaffSession(refreshToken) {
  const { data, error } = await supabaseAuth.auth.refreshSession({ refresh_token: refreshToken });

  if (error || !data.user || !data.session) {
    throw createAuthError(401, "REFRESH_FAILED", "Session could not be refreshed. Please sign in again.");
  }

  const staff = await getActiveStaffProfile(data.user.id);

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: new Date(data.session.expires_at * 1000).toISOString(),
    user: {
      id: data.user.id,
      email: data.user.email ?? null,
    },
    staff: formatStaff(staff),
  };
}

// Sign out a staff member by revoking their session server-side.
export async function logoutStaff(accessToken) {
  const { error } = await supabase.auth.admin.signOut(accessToken, "local");
  if (error) throw error;
}

// List active staff for POS terminal fast switching.
export async function getActiveStaffList() {
  const { data, error } = await supabase
    .from("staff_profiles")
    .select("id,full_name,role")
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (error) throw error;
  return (data || []).map(formatStaff);
}

/**
 * Ensure no other active staff member is already using the given PIN.
 */
// Quick PIN-based staff switching for shared POS terminals.
// Allows floor staff to switch active operator with a 4-digit PIN.
// Issues a new Supabase session so the Bearer token matches the switched-to user's role.
export async function switchStaffByPin({ pin, staffId, sourceIp = null }) {
  if (!pin || typeof pin !== "string" || !/^\d{4}$/.test(pin.trim())) {
    throw createAuthError(400, "INVALID_PIN", "PIN must be exactly 4 numeric digits.");
  }

  const { data: pinMatches, error: pinError } = await supabase.rpc("verify_staff_pin", {
    p_pin: pin.trim(), p_staff_id: staffId || null, p_source_ip: sourceIp,
  });
  if (pinError) throw pinError;
  const matchedProfile = pinMatches?.[0];
  if (!matchedProfile) throw createAuthError(401, "PIN_MISMATCH", "Incorrect PIN entered.");
  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(matchedProfile.id);
  if (userError || !userData?.user) throw createAuthError(401, "PIN_MISMATCH", "Incorrect PIN entered.");
  const matchedAuthUser = userData.user;

  // Generate a fresh session token for the matched user so RBAC works correctly.
  // admin.generateLink MUST use the service-role `supabase` client, while verifyOtp uses `supabaseAuth`.
  const { data: linkData, error: linkError } =
    await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: matchedAuthUser.email,
    });

  if (linkError || !linkData?.properties?.hashed_token) {
    throw createAuthError(500, "PIN_SWITCH_SESSION_FAILED", "Could not issue a session for the switched staff member.");
  }

  const { data: sessionData, error: sessionError } =
    await supabaseAuth.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "magiclink",
    });

  if (sessionError || !sessionData?.session) {
    throw createAuthError(500, "PIN_SWITCH_SESSION_FAILED", "Could not establish a session for the switched staff member.");
  }

  return {
    accessToken: sessionData.session.access_token,
    refreshToken: sessionData.session.refresh_token,
    expiresAt: new Date(sessionData.session.expires_at * 1000).toISOString(),
    staff: formatStaff(matchedProfile),
    user: {
      id: matchedAuthUser.id,
      email: matchedAuthUser.email ?? null,
    },
    switchedAt: new Date().toISOString(),
  };
}

// Set or update a staff member's 4-digit numeric PIN. The database bcrypt-hashes it;
// no endpoint or normal SELECT returns the PIN or its hash.
export async function setStaffPin(userId, pin) {
  if (!pin || typeof pin !== "string" || !/^\d{4}$/.test(pin.trim())) {
    throw createAuthError(400, "INVALID_PIN", "PIN must be exactly 4 numeric digits.");
  }

  const { error: profileError } = await supabase.rpc("set_staff_pin", {
    p_staff_id: userId, p_pin: pin.trim(),
  });

  if (profileError) {
    throw createAuthError(500, "PIN_UPDATE_FAILED", "Failed to update staff PIN in profile.");
  }

  // Scrub any legacy plaintext pin_code from auth user_metadata so it isn't embedded in JWTs
  const { data: userData } = await supabase.auth.admin.getUserById(userId);
  if (userData?.user?.user_metadata && Object.hasOwn(userData.user.user_metadata, "pin_code")) {
    const nextMeta = { ...userData.user.user_metadata };
    delete nextMeta.pin_code;
    await supabase.auth.admin.updateUserById(userId, { user_metadata: nextMeta }).catch(() => {});
  }

  return { ok: true, message: "Staff PIN updated successfully." };
}
