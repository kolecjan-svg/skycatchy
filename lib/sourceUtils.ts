// lib/sourceUtils.ts – Source grouping and categorization

import type { Source, SourceCategory, SourceGroup } from '../types';

/**
 * Infer the category of a source from its domain name.
 * - .cz TLD → czech
 * - .sk TLD → slovak
 * - anything else → global
 */
export function categorizeSource(sourceName: string): SourceCategory {
  if (!sourceName) return 'global';

  // Extract TLD from domain-like string
  const lower = sourceName.toLowerCase().trim();

  // Match .cz at end or before a path
  if (/\.cz($|\/)/.test(lower) || lower.endsWith('.cz')) return 'czech';
  if (/\.sk($|\/)/.test(lower) || lower.endsWith('.sk')) return 'slovak';

  return 'global';
}

/**
 * Group an array of Source objects into SourceGroup[]
 * ordered: Czech → Slovak → Global
 */
export function groupSources(sources: Source[]): SourceGroup[] {
  const grouped: Record<SourceCategory, Source[]> = {
    czech: [],
    slovak: [],
    global: [],
  };

  for (const source of sources) {
    const cat = source.category ?? categorizeSource(source.name);
    grouped[cat].push({ ...source, category: cat });
  }

  const labelMap: Record<SourceCategory, string> = {
    czech: 'Czech sources',
    slovak: 'Slovak sources',
    global: 'Global sources',
  };

  return (['czech', 'slovak', 'global'] as SourceCategory[])
    .filter((cat) => grouped[cat].length > 0)
    .map((cat) => ({
      category: cat,
      label: labelMap[cat],
      sources: grouped[cat],
    }));
}

/**
 * Get unique source names from deals array (fallback if sources table is empty)
 */
export function extractSourcesFromDeals(deals: { source: string }[]): Source[] {
  const unique = new Map<string, Source>();
  deals.forEach((deal, idx) => {
    if (!unique.has(deal.source)) {
      unique.set(deal.source, {
        id: `deal-source-${idx}`,
        name: deal.source,
        rss_url: '',
        active: true,
        created_at: '',
        category: categorizeSource(deal.source),
      });
    }
  });
  return Array.from(unique.values());
}
