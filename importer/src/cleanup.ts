import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

import { createClient } from "@supabase/supabase-js";

const RETENTION_DAYS = Math.max(7, parseInt(process.env.RETENTION_DAYS ?? "7", 10));

// Service role key required — bypasses RLS so DELETE works
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

  const { data, error } = await supabase.rpc("cleanup_old_deals", {
    retention_days: RETENTION_DAYS,
  });

  if (error) {
    console.error("❌ Cleanup failed:", error.message);
    process.exit(1);
  }

  const result = Array.isArray(data) ? data[0] : data;
  console.log(`✅ Deleted ${result?.deals_deleted ?? 0} deals`);
  console.log(`✅ Deleted ${result?.translations_deleted ?? 0} orphan translations`);
  console.log("\n=================================");
  console.log("Cleanup complete");
  console.log("=================================");
}

run();
