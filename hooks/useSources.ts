// hooks/useSources.ts – Sources query for filter panel

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { groupSources } from '../lib/sourceUtils';
import type { Source, SourceGroup } from '../types';

export function useSources(dealSourceNames?: string[]) {
  return useQuery({
    // Include dealSourceNames count in key so cache invalidates when deals load
    // and fallback path correctly re-runs if sources table was empty on first call
    queryKey: ['sources', dealSourceNames?.length ?? 0],
    queryFn: async (): Promise<SourceGroup[]> => {
      const { data, error } = await supabase
        .from('sources')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw new Error(`Failed to fetch sources: ${error.message}`);

      let sources: Source[] = (data as Source[]);

      // Fallback: if sources table is empty, derive from deal source strings
      if (sources.length === 0 && dealSourceNames && dealSourceNames.length > 0) {
        const unique = [...new Set(dealSourceNames)];
        sources = unique.map((name, i) => ({
          id: `inferred-${i}`,
          name,
          rss_url: '',
          active: true,
          created_at: '',
        }));
      }

      return groupSources(sources);
    },
    staleTime: 1000 * 60 * 60, // 1 hour – sources don't change often
  });
}
