// Server-side only: never import this in client code.
import { createClient } from "@supabase/supabase-js";
import { env } from "./server-config.js";

// Admin client — uses the secret key for privileged operations:
// getUser, admin.signOut, RLS-bypassed table reads, etc.
export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// Auth client — uses the publishable key for user-facing auth operations:
// signInWithPassword, refreshSession. The new Supabase key format (sb_secret_ /
// sb_publishable_) requires these to be called with the publishable key.
export const supabaseAuth = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false } }
);
