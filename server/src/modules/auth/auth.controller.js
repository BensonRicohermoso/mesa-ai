import {
  getActiveStaffList,
  loginStaff,
  logoutStaff,
  refreshStaffSession,
  setStaffPin,
  switchStaffByPin,
} from "./auth.service.js";
import { createAuthError } from "../../lib/errors.js";

// Basic email format validation — catches obvious typos before hitting Supabase.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateLoginBody(body) {
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    throw createAuthError(400, "VALIDATION_ERROR", "email and password are required.");
  }

  if (!EMAIL_RE.test(email)) {
    throw createAuthError(400, "VALIDATION_ERROR", "email must be a valid email address.");
  }

  return { email, password };
}

// Start a Supabase session for an active staff account.
export async function postLogin(req, res, next) {
  try {
    res.json(await loginStaff(validateLoginBody(req.body)));
  } catch (error) {
    next(error);
  }
}

// Return the active staff identity loaded by authentication middleware.
export function getCurrentUser(req, res) {
  res.json({
    user: req.auth.user,
    staff: req.auth.staff,
  });
}

// Exchange a refresh token for a new session without re-entering credentials.
export async function postRefresh(req, res, next) {
  try {
    const refreshToken =
      typeof req.body?.refreshToken === "string" ? req.body.refreshToken.trim() : "";
    if (!refreshToken) {
      throw createAuthError(400, "VALIDATION_ERROR", "refreshToken is required.");
    }
    res.json(await refreshStaffSession(refreshToken));
  } catch (error) {
    next(error);
  }
}

// Revoke the current session server-side and confirm sign-out.
export async function postLogout(req, res, next) {
  try {
    await logoutStaff(req.auth.accessToken);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}

// Return active staff list for terminal staff selector.
export async function getStaffList(_req, res, next) {
  try {
    res.json(await getActiveStaffList());
  } catch (error) {
    next(error);
  }
}

// Fast switch active staff on terminal using a 4-digit PIN.
export async function postPinSwitch(req, res, next) {
  try {
    const { pin, staffId } = req.body || {};
    const result = await switchStaffByPin({ pin, staffId });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

// Update the current staff member's quick-switch PIN.
export async function postSetPin(req, res, next) {
  try {
    const { pin } = req.body || {};
    const result = await setStaffPin(req.auth.user.id, pin);
    res.json(result);
  } catch (error) {
    next(error);
  }
}
