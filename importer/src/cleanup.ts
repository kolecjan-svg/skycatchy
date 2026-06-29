import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

import { createClient } from "@supabase/supabase-js";

const RETENTION_DAYS = Math.max(7, parseInt(process.env.RETENTION_DAYS ?? "7", 10));

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  console.log("=================================");
  console.log("SkyCatchy Database Cleanup");
  console.log(new Date().toISOString());
  console.log(`Retention: ${RETENTION_DAYS} days`);
  console.log("=================================\n");

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Fetch IDs of old deals
  const { data: oldDeals, error: fetchError } = await supabase
    .from("deals")
    .select("id")
    .lt("created_at", cutoff)
    .not("created_at", "is", null);

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
