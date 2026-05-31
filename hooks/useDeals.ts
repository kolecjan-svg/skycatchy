// hooks/useDeals.ts – Paginated deals query with translation support.
//
// DB reality (confirmed 2026-05-31):
// 1. deal_translations has no FK relationship → nested select fails (PGRST200)
// 2. ORDER BY created_at/publish_date times out → no index on large table
// 3. publish_date is NULL for all rows; created_at is the real recency signal
// 4. Same deal_id re-inserted every ~15 min → heavy duplicates per id
// 5. Table heap order = insertion order → oldest rows are at the start
//
// Bug #1 fix: use a sliding time-window filter (created_at >= N days ago)
// so we skip April data and fetch only RECENT deals. Sort client-side using
// effectiveSortDate = publish_date ?? created_at (newest first).

import { useInfiniteQuery } from '@tanstack/react-query';
import { getLocales } from 'expo-localization';
import { supabase } from '../lib/supabase';
import { getDisplayDeal } from '../lib/translation';
import { sortDealsByDate } from '../lib/dealSortUtils';
import { PAGE_SIZE } from '../constants/theme';
import type { Deal, DealDisplay } from '../types';

const DEALS_QUERY_KEY = ['deals'] as const;

// Each "page" covers a time window of this many days.
// Page 0 = last WINDOW_DAYS days; page 1 = WINDOW_DAYS to 2×WINDOW_DAYS ago; etc.
const WINDOW_DAYS = 7;
// Max rows fetched per window before dedup. Large enough to capture all unique
// deals across a week (13 sources × ~20 deals × ~96 re-inserts/day × 7 days ≈ 175 k
// rows — we cap with LIMIT to avoid timeouts; dedup brings unique count to ~260).
const WINDOW_LIMIT = 2000;

interface DealsPage {
  deals: DealDisplay[];
  nextPage: number | null;
}

/** Keep the row with the most recent created_at per deal id. */
function deduplicateByCreatedAt(rows: Deal[]): Deal[] {
  const map = new Map<string, Deal>();
  for (const row of rows) {
    const existing = map.get(row.id);
    if (!existing || row.created_at > existing.created_at) {
      map.set(row.id, row);
    }
  }
  return Array.from(map.values());
}

interface TranslationRow {
  deal_id: string;
  lang: string;
  name: string;
  description: string | null;
}

async function fetchTranslationsForIds(
  ids: string[],
  lang: string
): Promise<Map<string, TranslationRow>> {
  if (ids.length === 0) return new Map();
  const { data } = await supabase
    .from('deal_translations')
    .select('*')
    .in('deal_id', ids)
    .eq('lang', lang);
  const map = new Map<string, TranslationRow>();
  if (data) {
    for (const t of data as TranslationRow[]) {
      map.set(t.deal_id, t);
    }
  }
  return map;
}

function windowStart(page: number): string {
  const daysAgo = (page + 1) * WINDOW_DAYS;
  const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

function windowEnd(page: number): string {
  const daysAgo = page * WINDOW_DAYS;
  if (daysAgo === 0) {
    return new Date(Date.now() + 60 * 1000).toISOString(); // slight future buffer
  }
  const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  return d.toISOString();
}

async function fetchDealsPage(page: number): Promise<DealsPage> {
  // Bug #1 fix: filter to a rolling time window so we skip old heap data.
  // No ORDER BY — avoids statement timeout on unindexed created_at column.
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .gte('created_at', windowStart(page))
    .lt('created_at', windowEnd(page))
    .limit(WINDOW_LIMIT);

  if (error) {
    throw new Error(`Failed to fetch deals: ${error.message}`);
  }

  const rows = (data ?? []) as Deal[];

  // Dedup then sort by publish_date ?? created_at DESC (Bug #1 fix).
  const deduped = deduplicateByCreatedAt(rows);
  const sorted = sortDealsByDate(deduped);

  const locale = getLocales()[0]?.languageCode ?? 'en';
  const paginated = sorted.slice(0, PAGE_SIZE);

  // Fetch translations separately (no FK relationship in schema).
  const ids = paginated.map((d) => d.id);
  const translationMap = await fetchTranslationsForIds(ids, locale);

  const dealsWithTranslations: Deal[] = paginated.map((deal) => {
    const t = translationMap.get(deal.id);
    if (t) {
      return {
        ...deal,
        deal_translations: [{
          id: t.deal_id,
          deal_id: deal.id,
          lang: locale,
          name: t.name,
          description: t.description,
          created_at: deal.created_at,
        }],
      };
    }
    return deal;
  });

  const displayDeals = dealsWithTranslations.map((deal) => getDisplayDeal(deal, locale));

  // hasNextPage: true if the window had data AND we haven't gone too far back.
  // Cap at 8 weeks (page 7) to avoid indefinite pagination on sparse data.
  const hasNextPage = rows.length > 0 && page < 7;

  return {
    deals: displayDeals,
    nextPage: hasNextPage ? page + 1 : null,
  };
}

export function useDeals() {
  const query = useInfiniteQuery({
    queryKey: DEALS_QUERY_KEY,
    queryFn: ({ pageParam }) => fetchDealsPage(pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });

  const allDeals = query.data?.pages.flatMap((page) => page.deals) ?? [];

  return {
    deals: allDeals,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
  };
}
