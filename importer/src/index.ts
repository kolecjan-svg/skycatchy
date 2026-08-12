import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

import Parser from "rss-parser";
import { createClient } from "@supabase/supabase-js";

const parser = new Parser({
  customFields: { item: [["content:encoded", "contentEncoded"]] },
});

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

const LANG: Record<string, string> = {
  "cestujlevne.com": "cs",
  "jaknaletenky.cz": "cs",
  "honzovyletenky.cz": "cs",
  "levnocestovani.cz": "cs",
  "obletsvet.cz": "cs",
  "zaletsi.cz": "cs",

  "letenkyzababku.sk": "sk",

  "holidaypirates.com": "en",
  "travelfree.info": "en",
  "theflightdeal.com": "en",
  "secretflying.com": "en",
  "flynous.com": "en",
  "fly4free.com": "en",
};

async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SkyCatchyBot/1.0)" },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

async function resolveImages(deals: any[]): Promise<void> {
  const missing = deals.filter((d) => !d.image && d.link);
  for (let i = 0; i < missing.length; i += 5) {
    const batch = missing.slice(i, i + 5);
    const images = await Promise.all(batch.map((d) => fetchOgImage(d.link)));
    images.forEach((img, j) => { if (img) batch[j].image = img; });
  }
}

async function run() {
  const startTime = Date.now();

  console.log("=================================");
  console.log("SkyCatchy RSS Import");
  console.log(new Date().toISOString());
  console.log("=================================\n");

  const { data: sources, error: sourceError } = await supabase
    .from("sources")
    .select("name,rss_url")
    .eq("active", true);

  if (sourceError) {
    console.error("❌ FATAL: Cannot fetch sources from DB:", sourceError.message);
    process.exit(1);
  }

  if (!sources || sources.length === 0) {
    console.log("⚠️  No active sources found.");
    process.exit(0);
  }

  console.log(`Sources: ${sources.length}\n`);

  let totalInserted = 0;
  let totalItems = 0;
  const failed: string[] = [];
  const succeeded: string[] = [];

  for (const source of sources) {
    try {
      const feed = await parser.parseURL(source.rss_url);
      const items = feed.items ?? [];
      totalItems += items.length;

      const deals: any[] = items.map((item) => {
        const image =
          (item as any).enclosure?.url ||
          (item as any).image ||
          (item as any)["media:content"]?.$?.url ||
          (item as any)["media:thumbnail"]?.$?.url ||
          null;

        return {
          name: item.title ?? "",
          description: item.contentSnippet ?? item.summary ?? "",
          link: item.link ?? "",
          image,
          source: source.name,
          publish_date: (item as any).isoDate ?? item.pubDate ?? null,
          created_at: new Date().toISOString(),
          lang: LANG[source.name] ?? "en",
        };
      }).filter((d) => d.link && d.name);

      if (deals.length === 0) {
        succeeded.push(source.name);
        continue;
      }

      await resolveImages(deals);

      const { error: insertError, data: inserted } = await supabase
        .from("deals")
        .upsert(deals, { onConflict: "link", ignoreDuplicates: true })
        .select("id");

      if (insertError) {
        console.error(`  ❌ ${source.name}: DB upsert failed: ${insertError.message}`);
        failed.push(source.name);
        continue;
      }

      const newCount = (inserted ?? []).length;
      totalInserted += newCount;
      succeeded.push(source.name);

      if (newCount > 0) {
        console.log(`  ✅ ${source.name}: ${items.length} items, ${newCount} new`);
      }

    } catch (err: any) {
      const status = err?.status ? ` (HTTP ${err.status})` : "";
      console.error(`  ❌ ${source.name}: ${err?.message ?? err}${status}`);
      failed.push(source.name);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log("\n=================================");
  console.log("Import Summary");
  console.log("=================================");
  console.log(`Sources:   ${sources.length} total, ${succeeded.length} ok, ${failed.length} failed`);
  console.log(`RSS items: ${totalItems}`);
  console.log(`New deals: ${totalInserted}`);
  console.log(`Duration:  ${elapsed}s`);

  if (failed.length > 0) {
    console.log(`\nFailed sources:`);
    failed.forEach((s) => console.log(`  - ${s}`));
  }

  console.log("=================================\n");

  // Exit with failure if ALL sources failed or DB is unreachable
  if (failed.length > 0 && succeeded.length === 0) {
    console.error("❌ All sources failed.");
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("❌ FATAL:", err);
  process.exit(1);
});
