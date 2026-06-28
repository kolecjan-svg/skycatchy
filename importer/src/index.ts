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
function extractDensestBlock(lines: string[]): string {
  let bestStart = 0, bestEnd = 0, bestScore = 0;
  let curStart = 0, curScore = 0, gaps = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length >= 40) {
      curScore++; gaps = 0;
    } else {
      if (++gaps > 2) {
        if (curScore > bestScore) { bestScore = curScore; bestStart = curStart; bestEnd = i - gaps; }
        curStart = i + 1; curScore = 0; gaps = 0;
      }
    }
  }
  if (curScore > bestScore) { bestStart = curStart; bestEnd = lines.length - 1; }
  const slice = bestScore > 0
    ? lines.slice(bestStart, bestEnd + 1).filter((l) => l.length > 5)
    : lines.filter((l) => l.length > 10);
  return slice.join("\n\n");
}

async function fetchArticleContent(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SkyCatchyBot/1.0)" },
    });
    if (!res.ok) return null;
    const raw = await res.text();

    // Try JSON-LD first (works for SSR + some SPAs)
    const jsonLdTags = raw.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];
    for (const tag of jsonLdTags) {
      try {
        const data = JSON.parse(tag.replace(/<[^>]+>/g, "").trim());
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          if (item?.articleBody?.length > 100) return item.articleBody;
          if (item?.description?.length > 120) return item.description;
        }
      } catch {}
    }

    // Strip noise
    const html = raw
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[\s\S]*?<\/nav>/gi, "")
      .replace(/<header[\s\S]*?<\/header>/gi, "")
      .replace(/<footer[\s\S]*?<\/footer>/gi, "")
      .replace(/<aside[\s\S]*?<\/aside>/gi, "")
      .replace(/<figure[\s\S]*?<\/figure>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "");

    const toLines = (src: string) =>
      src
        .replace(/<\/?(p|br|div|h[1-6]|li|tr|blockquote|section|article|main)[^>]*>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .replace(/&hellip;/g, "…").replace(/&ndash;/g, "–").replace(/&mdash;/g, "—")
        .replace(/&#\d+;/g, "").replace(/&[a-z]{2,8};/gi, "")
        .split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

    // Try <article> / <main>
    const container =
      html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1] ??
      html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1];
    if (container) {
      const text = extractDensestBlock(toLines(container));
      if (isRealArticle(text)) return text;
    }

    // Full body with density
    const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
    const bodyText = extractDensestBlock(toLines(body));
    if (isRealArticle(bodyText)) return bodyText;

    return null;
  } catch {
    return null;
  }
}

// Only store content if it looks like real article text (multiple paragraphs, long enough)
function isRealArticle(text: string): boolean {
  return text.length > 400 && text.includes("\n\n");
}

async function resolveContent(deals: any[]): Promise<void> {
  // Fetch in batches of 3 (heavier than image fetch)
  for (let i = 0; i < deals.length; i += 3) {
    const batch = deals.slice(i, i + 3);
    const contents = await Promise.all(batch.map((d) => fetchArticleContent(d.link)));
    contents.forEach((c, j) => { batch[j].content = c ?? null; });
  }
}

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

      // Fetch full article content for all deals
      await resolveContent(deals);

      // Insert new deals; skip existing ones (preserve their created_at)
      const { error: insertError, data: inserted } = await supabase
        .from("deals")
        .upsert(deals, { onConflict: "link", ignoreDuplicates: true })
        .select("id");

      if (insertError) {
        console.error(insertError);
      } else {
        imported += (inserted ?? []).length;
      }

      // Back-fill og:image for existing deals that don't have one yet
      const dealsWithImage = deals.filter((d) => d.image);
      for (const deal of dealsWithImage) {
        await supabase
          .from("deals")
          .update({ image: deal.image })
          .eq("link", deal.link)
          .is("image", null);
      }

      // Back-fill content for existing deals that don't have it yet
      const dealsWithContent = deals.filter((d) => d.content);
      for (const deal of dealsWithContent) {
        await supabase
          .from("deals")
          .update({ content: deal.content })
          .eq("link", deal.link)
          .is("content", null);
      }

      console.log(`✅ Imported ${imported} deals`);

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
