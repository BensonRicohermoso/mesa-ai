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
  // Revoke the specific session identified by the token that was presented.
  // Using admin.signOut with the user id would invalidate all sessions; we
  // only revoke the current one so other devices stay signed in.
  const { error } = await supabase.auth.admin.signOut(accessToken, "local");
  if (error) throw error;
}
