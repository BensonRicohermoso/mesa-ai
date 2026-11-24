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

// Quick PIN-based staff switching for shared POS terminals.
// Allows floor staff to switch active operator with a 4-6 digit PIN.
export async function switchStaffByPin({ pin, staffId }) {
  if (!pin || typeof pin !== "string" || !/^\d{4,6}$/.test(pin.trim())) {
    throw createAuthError(400, "INVALID_PIN", "PIN must be 4 to 6 numeric digits.");
  }

  const cleanPin = pin.trim();

  // If a specific staffId was chosen, verify their PIN
  if (staffId) {
    const profile = await getActiveStaffProfile(staffId);
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(staffId);
    if (userError || !userData?.user) {
      throw createAuthError(404, "STAFF_NOT_FOUND", "Staff account could not be found.");
    }

    const savedPin = userData.user.user_metadata?.pin_code;
    if (!savedPin || savedPin !== cleanPin) {
      throw createAuthError(401, "PIN_MISMATCH", "Incorrect PIN entered.");
    }

    return {
      staff: formatStaff(profile),
      user: {
        id: userData.user.id,
        email: userData.user.email ?? null,
      },
      switchedAt: new Date().toISOString(),
    };
  }

  // Otherwise, search active staff to find matching PIN
  const activeStaff = await getActiveStaffList();
  for (const staff of activeStaff) {
    const { data: userData } = await supabase.auth.admin.getUserById(staff.id);
    if (userData?.user?.user_metadata?.pin_code === cleanPin) {
      return {
        staff,
        user: {
          id: userData.user.id,
          email: userData.user.email ?? null,
        },
        switchedAt: new Date().toISOString(),
      };
    }
  }

  throw createAuthError(401, "PIN_MISMATCH", "Invalid PIN entered.");
}

// Set or update a staff member's 4-6 digit numeric PIN.
export async function setStaffPin(userId, pin) {
  if (!pin || typeof pin !== "string" || !/^\d{4,6}$/.test(pin.trim())) {
    throw createAuthError(400, "INVALID_PIN", "PIN must be 4 to 6 numeric digits.");
  }

  const cleanPin = pin.trim();
  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { pin_code: cleanPin },
  });

  if (error || !data?.user) {
    throw createAuthError(500, "PIN_UPDATE_FAILED", "Failed to update staff PIN.");
  }

  return { ok: true, message: "Staff PIN updated successfully." };
}
