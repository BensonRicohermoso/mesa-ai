import { loginStaff, logoutStaff } from "./auth.service.js";
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

// Revoke the current session server-side and confirm sign-out.
export async function postLogout(req, res, next) {
  try {
    await logoutStaff(req.auth.accessToken);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
}
