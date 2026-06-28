import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BATCH = 3;
const LIMIT = 300; // process most recent 300 deals

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

    const container =
      html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1] ??
      html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1];
    if (container) {
      const text = extractDensestBlock(toLines(container));
      if (text.length > 400 && text.includes("\n\n")) return text;
    }

    const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
    const bodyText = extractDensestBlock(toLines(body));
    if (bodyText.length > 400 && bodyText.includes("\n\n")) return bodyText;

    return null;
  } catch {
    return null;
  }
}

async function run() {
  console.log("=================================");
  console.log("Content back-fill started");
  console.log(new Date().toISOString());
  console.log("=================================");

  const { data: deals, error } = await supabase
    .from("deals")
    .select("id, link, source")
    .is("content", null)
    .order("created_at", { ascending: false })
    .limit(LIMIT);

  if (error) { console.error(error); return; }
  if (!deals || deals.length === 0) { console.log("Nothing to back-fill."); return; }

  console.log(`Found ${deals.length} deals without content\n`);

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < deals.length; i += BATCH) {
    const batch = deals.slice(i, i + BATCH);
    const results = await Promise.all(
      batch.map(async (deal) => {
        const content = await fetchArticleContent(deal.link);
        return { id: deal.id, source: deal.source, content };
      })
    );

    for (const { id, source, content } of results) {
      if (content) {
        const { error: updateError } = await supabase
          .from("deals")
          .update({ content })
          .eq("id", id);
        if (updateError) {
          console.error(`  ❌ ${source} update failed:`, updateError.message);
          failed++;
        } else {
          updated++;
        }
      } else {
        console.log(`  ⚠️  No content extracted for deal ${id}`);
        failed++;
      }
    }

    console.log(`  Progress: ${Math.min(i + BATCH, deals.length)}/${deals.length} (${updated} updated, ${failed} failed)`);
  }

  console.log("\n=================================");
  console.log(`Done. Updated: ${updated}, Failed: ${failed}`);
  console.log("=================================");
}

run();
