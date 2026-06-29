import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

import Parser from "rss-parser";
import { createClient } from "@supabase/supabase-js";

// customFields exposes raw content:encoded without rss-parser's HTML sanitization
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

// ---------------------------------------------------------------------------
// Article content extraction (density-based, server-side)
// ---------------------------------------------------------------------------



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
  // Fetch og:image in batches of 5 concurrent requests
  for (let i = 0; i < missing.length; i += 5) {
    const batch = missing.slice(i, i + 5);
    const images = await Promise.all(batch.map((d) => fetchOgImage(d.link)));
    images.forEach((img, j) => {
      if (img) batch[j].image = img;
    });
  }
}

async function run() {
  console.log("=================================");
  console.log("SkyCatchy RSS Import started");
  console.log(new Date().toISOString());
  console.log("=================================");

  const { data: sources, error: sourceError } = await supabase
    .from("sources")
    .select("name,rss_url")
    .eq("active", true);

  if (sourceError) {
    console.error(sourceError);
    return;
  }

  let imported = 0;

  for (const source of sources ?? []) {
    console.log("");
    console.log("Processing:", source.name);

    try {
      const feed = await parser.parseURL(source.rss_url);

      const deals: any[] = [];

      for (const item of feed.items) {
        const image =
          (item as any).enclosure?.url ||
          (item as any).image ||
          (item as any)["media:content"]?.$?.url ||
          (item as any)["media:thumbnail"]?.$?.url ||
          null;

        deals.push({
          name: item.title ?? "",
          description: item.contentSnippet ?? item.summary ?? "",
          link: item.link ?? "",
          image,
          source: source.name,
          publish_date: (item as any).isoDate ?? item.pubDate ?? null,
          created_at: new Date().toISOString(),
          lang: LANG[source.name] ?? "en",
        });
      }

      if (deals.length === 0) continue;

      // Fetch og:image for any deal missing an image
      await resolveImages(deals);

      // Upsert without content first — fast path, skips duplicates
      const { error: insertError, data: inserted } = await supabase
        .from("deals")
        .upsert(deals, { onConflict: "link", ignoreDuplicates: true })
        .select("id,link");

      if (insertError) {
        console.error(insertError);
        continue;
      }

      const newCount = (inserted ?? []).length;
      imported += newCount;
      console.log(`✅ Inserted ${newCount} new deals from ${source.name}`);

      if (newCount === 0) continue;

    } catch (err) {
      console.log(`❌ Feed failed: ${source.name}`);
      console.error(err);
    }
  }

  console.log("");
  console.log("=================================");
  console.log("Import finished");
  console.log("Imported deals:", imported);
  console.log("=================================");
}

run();
