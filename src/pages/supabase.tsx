import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://reoxojwksgmmtribyree.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlb3hvandrc2dtbXRyaWJ5cmVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk2NjM0NzAsImV4cCI6MjA2NTIzOTQ3MH0.XrT5swLBrW1cPgGvqMY8q7Gs_m2v2GPYtN5NPi2biyk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
