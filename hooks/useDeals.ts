// hooks/useDeals.ts – Paginated deals query with translation support.
//
// DB reality (confirmed 2026-05-31):
// 1. deal_translations has no FK → nested select fails (PGRST200)
// 2. ORDER BY on any column times out → no index exists
// 3. publish_date is NULL for all rows; created_at is the recency signal
// 4. Same deal_id re-inserted every ~15 min → heavy duplicates per id
// 5. Supabase REST API hard-caps responses at 1000 rows regardless of limit=
//
// Bug #1 fix: sliding time-window filter (publish_date ?? created_at sort)
// Bug #6 fix: 4h window + offset pagination (3 req × 1000 = all 2191 rows → 166 unique deals)

import { useInfiniteQuery } from '@tanstack/react-query';
import { getLocales } from 'expo-localization';
import { supabase } from '../lib/supabase';
import { getDisplayDeal } from '../lib/translation';
import { sortDealsByDate } from '../lib/dealSortUtils';
import { buildWindowedPages, SUPABASE_ROW_LIMIT } from '../lib/dealQueryUtils';
import type { Deal, DealDisplay } from '../types';

const DEALS_QUERY_KEY = ['deals'] as const;

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

/**
 * Fetch all rows in a time window using offset pagination.
 * Bug #6 fix: Supabase REST caps at 1000 rows per request.
 * Page 0 uses a 4h window (2191 total rows) → needs 3 offset pages to capture all.
 */
async function fetchAllRowsInWindow(since: string, until: string, maxOffsetPages: number): Promise<Deal[]> {
  const allRows: Deal[] = [];

  for (let page = 0; page < maxOffsetPages; page++) {
    const offset = page * SUPABASE_ROW_LIMIT;
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .gte('created_at', since)
      .lt('created_at', until)
      .range(offset, offset + SUPABASE_ROW_LIMIT - 1);

    if (error) throw new Error(`Failed to fetch deals: ${error.message}`);

    const batch = (data ?? []) as Deal[];
    allRows.push(...batch);

    // Stop early if last page (fewer rows than the limit)
    if (batch.length < SUPABASE_ROW_LIMIT) break;
  }

  return allRows;
}

async function fetchDealsPage(page: number): Promise<DealsPage> {
  const window = buildWindowedPages(page);

  const rows = await fetchAllRowsInWindow(
    window.since,
    window.until,
    window.maxOffsetPages
  );

  // Dedup then sort by publish_date ?? created_at DESC
  const deduped = deduplicateByCreatedAt(rows);
  const sorted = sortDealsByDate(deduped);

  const locale = getLocales()[0]?.languageCode ?? 'en';

  // Fetch translations separately (no FK relationship in schema)
  const ids = sorted.map((d) => d.id);
  const translationMap = await fetchTranslationsForIds(ids, locale);

  const dealsWithTranslations: Deal[] = sorted.map((deal) => {
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

  // Cap at 8 pages (page 0–7) to avoid endless pagination into very old data
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
