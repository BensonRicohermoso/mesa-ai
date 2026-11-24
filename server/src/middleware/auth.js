import { supabase } from "../config/supabase.js";

function createAuthError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

// Validate a Supabase access token and attach its active staff profile to req.auth.
export async function authenticate(req, _res, next) {
  try {
    const authorization = req.get("authorization");
    const match = authorization?.match(/^Bearer\s+(.+)$/i);

    if (!match) {
      throw createAuthError(
        401,
        "AUTH_TOKEN_MISSING",
        "A Bearer access token is required."
      );
    }

    const accessToken = match[1].trim();
    const { data: userData, error: userError } = await supabase.auth.getUser(
      accessToken
    );

    if (userError || !userData.user) {
      throw createAuthError(
        401,
        "AUTH_TOKEN_INVALID",
        "The access token is invalid or expired."
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("staff_profiles")
      .select("id,full_name,role,is_active")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profileError) throw profileError;

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

    req.auth = {
      accessToken,
      user: {
        id: userData.user.id,
        email: userData.user.email ?? null,
      },
      staff: {
        id: profile.id,
        fullName: profile.full_name,
        role: profile.role,
      },
    };

    next();
  } catch (error) {
    next(error);
  }
}

// Restrict a route to one or more staff roles after authenticate has run.
export function requireRoles(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.auth) {
      next(
        createAuthError(
          401,
          "AUTH_REQUIRED",
          "Authentication is required."
        )
      );
      return;
    }

    if (!allowedRoles.includes(req.auth.staff.role)) {
      next(
        createAuthError(
          403,
          "ROLE_FORBIDDEN",
          "You do not have permission to perform this action."
        )
      );
      return;
    }

    next();
  };
}
