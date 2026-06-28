import { useQuery } from '@tanstack/react-query';
import { getLocales } from 'expo-localization';
import { supabase } from '../lib/supabase';
import { getDisplayDeal } from '../lib/translation';
import { sortDealsByDate } from '../lib/dealSortUtils';
import type { Deal, DealDisplay } from '../types';

const DEALS_QUERY_KEY = ['deals'];
const SUPABASE_ROW_LIMIT = 1000;
const MAX_OFFSET_PAGES = 5;

// Window sizes to try in order. If a window returns 0 rows, the next wider
// window is tried. This handles both normal operation (4h) and when the
// importer has been paused for days (48h / 14d fallback).
const WINDOW_HOURS = [4, 48, 14 * 24];

async function fetchAllRowsInWindow(since: string, until: string): Promise<Deal[]> {
  const allRows: Deal[] = [];

  for (let page = 0; page < MAX_OFFSET_PAGES; page++) {
    const offset = page * SUPABASE_ROW_LIMIT;
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .gte('created_at', since)
      .lt('created_at', until)
      .range(offset, offset + SUPABASE_ROW_LIMIT - 1);

    if (error) throw error;

    const batch = (data ?? []) as Deal[];
    allRows.push(...batch);

    if (batch.length < SUPABASE_ROW_LIMIT) break;
  }

  return allRows;
}

function deduplicateByCreatedAt(rows: Deal[]): Deal[] {
  const best = new Map<string, Deal>();
  for (const row of rows) {
    const existing = best.get(row.id);
    if (!existing || row.created_at > existing.created_at) {
      best.set(row.id, row);
    }
  }
  return Array.from(best.values());
}

async function fetchDeals(): Promise<DealDisplay[]> {
  const locale = getLocales()[0]?.languageCode ?? 'en';
  const nowMs = Date.now();
  const until = new Date(nowMs + 60 * 1000).toISOString();

  for (const windowHours of WINDOW_HOURS) {
    const since = new Date(nowMs - windowHours * 3600 * 1000).toISOString();
    const rows = await fetchAllRowsInWindow(since, until);

    if (rows.length === 0) continue;

    const unique = deduplicateByCreatedAt(rows);
    const sorted = sortDealsByDate(unique);
    return sorted.map((deal) => getDisplayDeal(deal, locale));
  }

  return [];
}

export function useDeals() {
  const query = useQuery({
    queryKey: DEALS_QUERY_KEY,
    queryFn: fetchDeals,
  });

  return {
    deals: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isRefetching: query.isRefetching,

    fetchNextPage: async () => {},
    hasNextPage: false,
    isFetchingNextPage: false,
  };
}
