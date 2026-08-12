import { useQuery } from '@tanstack/react-query';
import { getLocales } from 'expo-localization';
import { supabase } from '../lib/supabase';
import { getDisplayDeal } from '../lib/translation';
import { sortDealsByDate } from '../lib/dealSortUtils';
import type { Deal, DealDisplay } from '../types';

const DEALS_QUERY_KEY = ['deals'];
const PAGE_SIZE = 1000;
const MAX_PAGES = 10; // hard cap: 10 000 rows (cleanup keeps DB well under 1 000)

async function fetchDeals(): Promise<DealDisplay[]> {
  const locale = getLocales()[0]?.languageCode ?? 'en';
  const allRows: Deal[] = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const offset = page * PAGE_SIZE;
    const { data, error } = await supabase
      .from('deals')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;

    const batch = (data ?? []) as Deal[];
    allRows.push(...batch);

    // Last page reached
    if (batch.length < PAGE_SIZE) break;
  }

  if (allRows.length === 0) return [];

  // Deduplicate by link in case of rare DB duplicates
  const seen = new Map<string, Deal>();
  for (const row of allRows) {
    const existing = seen.get(row.link);
    if (!existing || row.created_at > existing.created_at) {
      seen.set(row.link, row);
    }
  }

  const unique = Array.from(seen.values());
  const sorted = sortDealsByDate(unique);
  return sorted.map((deal) => getDisplayDeal(deal, locale));
}

export function useDeals() {
  const query = useQuery({
    queryKey: DEALS_QUERY_KEY,
    queryFn: fetchDeals,
    staleTime: 5 * 60 * 1000, // consider data fresh for 5 min
  });

  return {
    deals: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isRefetching: query.isRefetching,

    // Kept for interface compatibility — infinite scroll not needed at current scale
    fetchNextPage: async () => {},
    hasNextPage: false,
    isFetchingNextPage: false,
  };
}
