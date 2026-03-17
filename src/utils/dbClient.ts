import { createClient } from "@supabase/supabase-js";

/**
 * Generic Database Client Wrapper
 * This currently uses Supabase (PostgreSQL) as the SQL backend.
 * To migrate to MySQL, replace the internal logic here with a fetch() call
 * to your MySQL backend API while maintaining the same interface.
 */

// Production-ready environment variables with local fallbacks for development
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://reoxojwksgmmtribyree.supabase.co";
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb3hvandrc2dtbXRyaWJ5cmVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2NjM0NzAsImV4cCI6MjA2NTIzOTQ3MH0.XrT5swLBrW1cPgGvqMY8q7Gs_m2v2GPYtN5NPi2biyk";

if (!import.meta.env.VITE_SUPABASE_URL) {
  console.warn("Using hardcoded Supabase fallback. Restart your dev server to use .env!");
}

export const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// Default export for convenience
export default db;
