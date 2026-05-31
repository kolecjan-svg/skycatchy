// lib/dealSortUtils.ts – Sorting utilities for deal feeds.
// Bug #1: deals sorted by effective date = publish_date ?? created_at (newest first).

import type { Deal } from '../types';

/** Returns the effective sort date: publish_date when non-empty, created_at otherwise. */
export function getEffectiveSortDate(
  publishDate: string | null | undefined,
  createdAt: string
): string {
  return publishDate || createdAt;
}

/** Sort deals newest-first using effective date (publish_date ?? created_at). */
export function sortDealsByDate<T extends Pick<Deal, 'publish_date' | 'created_at'>>(
  deals: T[]
): T[] {
  return [...deals].sort((a, b) => {
    const dateA = getEffectiveSortDate(a.publish_date, a.created_at);
    const dateB = getEffectiveSortDate(b.publish_date, b.created_at);
    return dateB.localeCompare(dateA);
  });
}
