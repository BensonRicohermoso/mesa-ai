import "dotenv/config";

const requiredVariables = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const missingVariables = requiredVariables.filter(
  (name) => !process.env[name] || process.env[name].trim() === ""
);

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
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
};
