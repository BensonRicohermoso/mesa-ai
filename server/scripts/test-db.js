import { supabase } from "../src/config/supabase.js";

const { error } = await supabase
  .from("_mesa_connection_test")
  .select("*")
  .limit(1);

if (!error) {
  console.log("Supabase database connection successful.");
} else if (
  error.code === "PGRST205" ||
  error.code === "42P01" ||
  error.message?.toLowerCase().includes("does not exist") ||
  error.message?.toLowerCase().includes("could not find the table")
) {
  console.log("Supabase connection successful; test table does not exist (connection verified).");
} else {
  console.error("Supabase database connection failed:", error.message);
  process.exitCode = 1;
}
