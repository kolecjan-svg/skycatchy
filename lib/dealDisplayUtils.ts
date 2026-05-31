// lib/dealDisplayUtils.ts – Cross-page deduplication for DealDisplay arrays.
//
// Bug #7 fix: allDeals = pages.flatMap(p => p.deals) can contain the same
// deal ID multiple times when a deal spans several time-window pages. This
// causes duplicate cards in the Saved screen and a badge/card-count mismatch.
//
// deduplicateDealDisplays() collapses cross-page duplicates, keeping the entry
// with the most recent publish_date (which is already publish_date ?? created_at
// after translation.ts normalisation), then re-sorts newest-first.

import type { DealDisplay } from '../types';

/**
 * Remove duplicate deal IDs across all pages.
 * Keeps the entry with the most recent publish_date.
 * Returns a new array sorted newest-first — does not mutate input.
 */
export function deduplicateDealDisplays(deals: DealDisplay[]): DealDisplay[] {
  const best = new Map<string, DealDisplay>();
  for (const deal of deals) {
    const existing = best.get(deal.id);
    if (!existing || deal.publish_date > existing.publish_date) {
      best.set(deal.id, deal);
    }
  }
  return Array.from(best.values()).sort(
    (a, b) => b.publish_date.localeCompare(a.publish_date)
  );
}
