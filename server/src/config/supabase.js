// Server-side only: never import this Supabase client in client code.
import { createClient } from "@supabase/supabase-js";
import { env } from "./server-config.js";

export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
    },
  }
);
