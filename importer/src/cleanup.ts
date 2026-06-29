import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

import { createClient } from "@supabase/supabase-js";

const RETENTION_DAYS = Math.max(7, parseInt(process.env.RETENTION_DAYS ?? "7", 10));

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function run() {
  console.log("=================================");
  console.log("SkyCatchy Database Cleanup");
  console.log(new Date().toISOString());
  console.log(`Retention: ${RETENTION_DAYS} days`);
  console.log("=================================\n");

  console.log("URL set:", supabaseUrl.length > 0 ? supabaseUrl.substring(0, 30) + "..." : "MISSING");
  console.log("Service key set:", serviceKey.length > 10 ? "YES" : "MISSING");

  if (!supabaseUrl || !serviceKey) {
    console.error("❌ Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  console.log("Cutoff date:", cutoff);

  // Fetch IDs of old deals (NULL created_at is already excluded by lt filter in SQL)
  const { data: oldDeals, error: fetchError } = await supabase
    .from("deals")
    .select("id")
    .lt("created_at", cutoff);

  if (fetchError) {
    console.error("❌ Cleanup failed:", fetchError.message);
    process.exit(1);
  }

  if (!oldDeals || oldDeals.length === 0) {
    console.log("✅ No deals to clean up");
    console.log("\n=================================");
    console.log("Cleanup complete");
    console.log("=================================");
    return;
  }

  const oldIds = oldDeals.map((d) => d.id);
  console.log(`Found ${oldIds.length} old deals to delete`);

  // Delete translations first (FK constraint)
  const { error: transError } = await supabase
    .from("deal_translations")
    .delete()
    .in("deal_id", oldIds);

  if (transError) {
    console.error("❌ Translation cleanup failed:", transError.message);
    process.exit(1);
  }

  // Delete deals
  const { error: dealsError } = await supabase
    .from("deals")
    .delete()
    .in("id", oldIds);

  if (dealsError) {
    console.error("❌ Deals cleanup failed:", dealsError.message);
    process.exit(1);
  }

  console.log(`✅ Deleted ${oldIds.length} deals and their translations`);
  console.log("\n=================================");
  console.log("Cleanup complete");
  console.log("=================================");
}

run();
