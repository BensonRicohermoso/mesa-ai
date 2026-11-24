import { loginStaff } from "./auth.service.js";

function validateLoginBody(body) {
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    const error = new Error("email and password are required.");
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
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
