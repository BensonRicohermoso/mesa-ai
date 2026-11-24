import "dotenv/config";

const supabaseServerKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// Only SUPABASE_URL is required at the module level; the service-role key is
// checked separately below. SUPABASE_ANON_KEY is a client-side value and is
// intentionally not required server-side.
const requiredVariables = ["SUPABASE_URL"];

const missingVariables = requiredVariables.filter(
  (name) => !process.env[name] || process.env[name].trim() === ""
);

if (!supabaseServerKey) {
  missingVariables.push("SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY");
}

if (missingVariables.length > 0) {
  throw new Error(
    `Missing required environment variable${missingVariables.length > 1 ? "s" : ""}: ${missingVariables.join(", ")}`
  );
}

export const env = {
  PORT: process.env.PORT || "5000",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  // Prefer Supabase's current secret key while accepting the legacy service-role key.
  SUPABASE_SERVICE_ROLE_KEY: supabaseServerKey,
  DATABASE_URL: process.env.DATABASE_URL,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  ORDER_EXPIRY_MINUTES: (() => {
    const parsed = Number.parseInt(process.env.ORDER_EXPIRY_MINUTES || "20", 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 20;
  })(),
};
