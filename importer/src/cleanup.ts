import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

const RETENTION_DAYS = Math.max(7, parseInt(process.env.RETENTION_DAYS ?? "7", 10));
const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const baseHeaders = {
  apikey: serviceKey,
  Authorization: `Bearer ${serviceKey}`,
  "Content-Type": "application/json",
};

async function restFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: { ...baseHeaders, ...(options.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => res.statusText);
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  return res;
}

async function run() {
  console.log("=================================");
  console.log("SkyCatchy Database Cleanup");
  console.log(new Date().toISOString());
  console.log(`Retention: ${RETENTION_DAYS} days`);
  console.log("=================================\n");

  if (!supabaseUrl || !serviceKey) {
    console.error("❌ Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Fetch old deal IDs
  const params = new URLSearchParams({ select: "id", "created_at": `lt.${cutoff}` });
  const selectRes = await restFetch(`deals?${params}`);
  const oldDeals: { id: string }[] = await selectRes.json();

  if (oldDeals.length === 0) {
    console.log("✅ No deals to clean up");
    console.log("\n=================================");
    console.log("Cleanup complete");
    console.log("=================================");
    return;
  }

  console.log(`Found ${oldDeals.length} old deals to delete`);
  const oldIds = oldDeals.map((d) => d.id);

  // Delete translations first (FK constraint)
  const transParams = new URLSearchParams({ "deal_id": `in.(${oldIds.join(",")})` });
  await restFetch(`deal_translations?${transParams}`, { method: "DELETE" });

  // Delete deals
  const dealsParams = new URLSearchParams({ id: `in.(${oldIds.join(",")})` });
  await restFetch(`deals?${dealsParams}`, { method: "DELETE" });

  console.log(`✅ Deleted ${oldIds.length} deals and their translations`);
  console.log("\n=================================");
  console.log("Cleanup complete");
  console.log("=================================");
}

run().catch((err) => {
  console.error("❌ Cleanup failed:", err.message);
  process.exit(1);
});
