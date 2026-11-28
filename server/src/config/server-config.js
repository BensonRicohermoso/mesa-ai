import "dotenv/config";

const supabaseServerKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabasePublishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

// Both clients are created during server startup: the admin client needs the
// server key and the auth client needs the publishable (or legacy anon) key.
const requiredVariables = ["SUPABASE_URL"];

const missingVariables = requiredVariables.filter(
  (name) => !process.env[name] || process.env[name].trim() === ""
);

if (!supabaseServerKey) {
  missingVariables.push("SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY");
}

if (!supabasePublishableKey) {
  missingVariables.push("SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY");
}

if (missingVariables.length > 0) {
  throw new Error(
    `Missing required environment variable${missingVariables.length > 1 ? "s" : ""}: ${missingVariables.join(", ")}`
  );
}

if (process.env.NODE_ENV === "production" && (!process.env.CLIENT_URL || !/^https:\/\//i.test(process.env.CLIENT_URL.trim()))) {
  throw new Error("CLIENT_URL must be an HTTPS origin in production.");
}

export const env = {
  PORT: process.env.PORT || "5000",
  CLIENT_URL:
    (process.env.CLIENT_URL || "http://localhost:5173")
      .trim()
      .replace(/\/+$/, "") || "http://localhost:5173",
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY: supabasePublishableKey,
  // Prefer Supabase's current secret key while accepting the legacy service-role key.
  SUPABASE_SERVICE_ROLE_KEY: supabaseServerKey,
  DATABASE_URL: process.env.DATABASE_URL,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL:
    (process.env.GEMINI_MODEL || "gemini-2.5-flash").trim() ||
    "gemini-2.5-flash",
  ORDER_EXPIRY_MINUTES: (() => {
    const parsed = Number.parseInt(process.env.ORDER_EXPIRY_MINUTES || "20", 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 20;
  })(),
};
