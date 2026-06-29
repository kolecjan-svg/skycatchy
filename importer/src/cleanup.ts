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

  console.log("Base URL:", supabaseUrl);

  // Connectivity test — GET /rest/v1/ returns OpenAPI spec (200) if key is valid
  const pingRes = await fetch(`${supabaseUrl}/rest/v1/`, { headers: baseHeaders });
  console.log("Ping /rest/v1/ →", pingRes.status);

  // Table test — no filters
  const tableRes = await fetch(`${supabaseUrl}/rest/v1/deals?select=id&limit=1`, { headers: baseHeaders });
  console.log("GET deals limit 1 →", tableRes.status, await tableRes.text().then(t => t.substring(0, 120)));

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  console.log("Cutoff:", cutoff);

  // Fetch old deal IDs
  const selectRes = await restFetch(`deals?select=id&created_at=lt.${cutoff}`);
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
  const idList = oldIds.join(",");

  // Delete translations first (FK constraint)
  await restFetch(`deal_translations?deal_id=in.(${idList})`, { method: "DELETE" });

  // Delete deals
  await restFetch(`deals?id=in.(${idList})`, { method: "DELETE" });

  console.log(`✅ Deleted ${oldIds.length} deals and their translations`);
  console.log("\n=================================");
  console.log("Cleanup complete");
  console.log("=================================");
}

run().catch((err) => {
  console.error("❌ Cleanup failed:", err.message);
  process.exit(1);
});
