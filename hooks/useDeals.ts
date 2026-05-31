// hooks/useDeals.ts – Paginated deals query with translation support
//
// DB reality (confirmed 2026-05-31):
// 1. deal_translations has no FK relationship → nested select fails (PGRST200)
// 2. ORDER BY created_at/publish_date times out → no index on large table
// 3. publish_date is NULL for all rows → cannot sort/filter by it
// 4. Same deal_id re-inserted every ~15 min → heavy duplicates per id
//
// Strategy:
// - Fetch pages using plain .range(from, to) with no ORDER BY
// - Deduplicate by ID client-side, keeping the row with max created_at
// - Sort deduplicated page by created_at DESC (client-side)
// - Translations fetched separately in a follow-up query using .in()

import { useInfiniteQuery } from '@tanstack/react-query';
import { getLocales } from 'expo-localization';
import { supabase } from '../lib/supabase';
import { getDisplayDeal } from '../lib/translation';
import { PAGE_SIZE } from '../constants/theme';
import type { Deal, DealDisplay } from '../types';

const DEALS_QUERY_KEY = ['deals'] as const;
// Fetch more raw rows than PAGE_SIZE to have enough after dedup.
// Early heap pages (oldest data) have low duplication; later pages high duplication.
const RAW_FETCH_MULTIPLIER = 5;
const RAW_PAGE_SIZE = PAGE_SIZE * RAW_FETCH_MULTIPLIER;

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

async function fetchTranslationsForIds(ids: string[], lang: string): Promise<Map<string, TranslationRow>> {
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

async function fetchDealsPage(page: number): Promise<DealsPage> {
  const from = page * RAW_PAGE_SIZE;
  const to = from + RAW_PAGE_SIZE - 1;

  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .range(from, to);

  if (error) {
    throw new Error(`Failed to fetch deals: ${error.message}`);
  }

  const rows = (data ?? []) as Deal[];

  // Deduplicate, then sort newest-first within this page
  const deduped = deduplicateByCreatedAt(rows);
  deduped.sort((a, b) => b.created_at.localeCompare(a.created_at));

  const locale = getLocales()[0]?.languageCode ?? 'en';

  // Fetch translations separately (no FK relationship in schema)
  const ids = deduped.slice(0, PAGE_SIZE).map((d) => d.id);
  const translationMap = await fetchTranslationsForIds(ids, locale);

  // Inject translations into deal objects so getDisplayDeal can find them
  const dealsWithTranslations: Deal[] = deduped.slice(0, PAGE_SIZE).map((deal) => {
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

  return {
    deals: displayDeals,
    nextPage: rows.length === RAW_PAGE_SIZE ? page + 1 : null,
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
