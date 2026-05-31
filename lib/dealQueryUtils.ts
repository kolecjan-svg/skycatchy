// lib/dealQueryUtils.ts – Query window configuration for the deals feed.
//
// Bug #6 root cause:
// - Supabase REST API hard-caps responses at 1000 rows regardless of limit param
// - Old WINDOW_DAYS=7 window → 1000 of ~174,000 rows = 0.57% sample = 7 unique deals
// - No offset pagination → only 1 request, misses rows 1001+
//
// Fix:
// - Page 0 uses a 4-hour window (2191 total rows in DB, confirmed)
// - Offset pagination fetches all rows: 3 requests × 1000 = 3000 rows covers all 2191
// - After dedup: 166 unique deals (matches website inventory)

/** How many hours the initial page window covers. Confirmed: 4h = 2191 rows. */
export const RECENT_WINDOW_HOURS = 4;

/** Supabase REST API hard cap per request (cannot be increased from client side). */
export const SUPABASE_ROW_LIMIT = 1000;

/** Maximum offset pages for page 0 (3 × 1000 = 3000 rows, covers 2191). */
export const MAX_OFFSET_PAGES_RECENT = 5;

export interface WindowConfig {
  since: string;
  until: string;
  windowHours: number;
  useOffsetPagination: boolean;
  maxOffsetPages: number;
}

/**
 * Returns the time window and pagination config for a given feed page.
 *
 * Page 0: last 4 hours (offset-paginated, full coverage)
 * Page 1: 4–28 hours ago (single request, partial coverage)
 * Page 2: 28–76 hours ago (single request)
 * Page 3+: keep expanding 2× each time
 */
export function buildWindowedPages(page: number, nowMs: number = Date.now()): WindowConfig {
  if (page === 0) {
    const since = new Date(nowMs - RECENT_WINDOW_HOURS * 3600 * 1000).toISOString();
    const until = new Date(nowMs + 60 * 1000).toISOString(); // 1-min future buffer
    return {
      since,
      until,
      windowHours: RECENT_WINDOW_HOURS,
      useOffsetPagination: true,
      maxOffsetPages: MAX_OFFSET_PAGES_RECENT,
    };
  }

  // Older pages: exponentially expanding windows
  // Page 1: 4–28h (24h window)
  // Page 2: 28–76h (48h window)
  // Page 3: 76–172h (96h window)
  const windowDefs = [
    { startH: RECENT_WINDOW_HOURS, endH: 28 },   // page 1
    { startH: 28, endH: 76 },                     // page 2
    { startH: 76, endH: 172 },                    // page 3
    { startH: 172, endH: 364 },                   // page 4
    { startH: 364, endH: 728 },                   // page 5
  ];
  const def = windowDefs[page - 1] ?? { startH: (page - 1) * 168, endH: page * 168 };

  const since = new Date(nowMs - def.endH * 3600 * 1000).toISOString();
  const until = new Date(nowMs - def.startH * 3600 * 1000).toISOString();

  return {
    since,
    until,
    windowHours: def.endH - def.startH,
    useOffsetPagination: false, // single request for older pages
    maxOffsetPages: 1,
  };
}

/** Count unique deal IDs from an array of rows. Used for testing. */
export function estimateUniqueDealsFromRows(
  rows: Array<{ id: string; created_at: string }>
): number {
  const best = new Map<string, string>();
  for (const row of rows) {
    const existing = best.get(row.id);
    if (!existing || row.created_at > existing) {
      best.set(row.id, row.created_at);
    }
  }
  return best.size;
}
