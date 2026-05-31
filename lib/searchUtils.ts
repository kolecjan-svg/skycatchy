// lib/searchUtils.ts – Search and filter utility functions

import type { DealDisplay, SourceGroup } from '../types';

/**
 * Filter deals by keyword query across name and description.
 * Empty / whitespace-only query returns all deals.
 */
export function filterDealsByQuery(
  deals: DealDisplay[],
  query: string
): DealDisplay[] {
  const q = query.trim().toLowerCase();
  if (!q) return deals;
  return deals.filter(
    (d) =>
      d.name.toLowerCase().includes(q) ||
      (d.description ?? '').toLowerCase().includes(q)
  );
}

/**
 * Filter deals by selected source names.
 * Empty selectedSources = show all (no filter applied).
 */
export function filterDealsBySources(
  deals: DealDisplay[],
  selectedSources: Set<string>
): DealDisplay[] {
  if (selectedSources.size === 0) return deals;
  return deals.filter((d) => selectedSources.has(d.source));
}

/**
 * Apply both search query and source filter in one pass (efficient).
 */
export function applyFilters(
  deals: DealDisplay[],
  query: string,
  selectedSources: Set<string>
): DealDisplay[] {
  const q = query.trim().toLowerCase();
  const hasSources = selectedSources.size > 0;

  if (!q && !hasSources) return deals;

  return deals.filter((d) => {
    if (hasSources && !selectedSources.has(d.source)) return false;
    if (q) {
      return (
        d.name.toLowerCase().includes(q) ||
        (d.description ?? '').toLowerCase().includes(q)
      );
    }
    return true;
  });
}

export type GroupSelectionState = 'none' | 'partial' | 'all';

/**
 * Determine the tri-state selection of a source group.
 * Used to show indeterminate / checked / unchecked state on group header.
 */
export function getGroupSelectionState(
  group: SourceGroup,
  selectedSources: Set<string>
): GroupSelectionState {
  const total = group.sources.length;
  if (total === 0) return 'none';

  const selectedCount = group.sources.filter((s) =>
    selectedSources.has(s.name)
  ).length;

  if (selectedCount === 0) return 'none';
  if (selectedCount === total) return 'all';
  return 'partial';
}

/**
 * Toggle all sources within a group on/off.
 * If all are currently selected → deselect all in group.
 * Otherwise → select all in group.
 */
export function toggleGroupSources(
  group: SourceGroup,
  selectedSources: Set<string>
): Set<string> {
  const state = getGroupSelectionState(group, selectedSources);
  const next = new Set(selectedSources);

  if (state === 'all') {
    // Deselect all in this group
    group.sources.forEach((s) => next.delete(s.name));
  } else {
    // Select all in this group
    group.sources.forEach((s) => next.add(s.name));
  }

  return next;
}
