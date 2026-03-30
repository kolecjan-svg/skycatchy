import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_EXTERNAL_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_EXTERNAL_ANON_KEY;

if (!url || !key) {
  throw new Error(
    "Missing env vars: NEXT_PUBLIC_SUPABASE_EXTERNAL_URL and NEXT_PUBLIC_SUPABASE_EXTERNAL_ANON_KEY",
  );
}

export const supabaseExternal = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // storage defaults to localStorage in browser, undefined on server — safe
  },
});
