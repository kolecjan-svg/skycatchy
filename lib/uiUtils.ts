// lib/uiUtils.ts – UI state utility functions

/**
 * Check if a section identified by `key` is collapsed.
 * Sections start expanded (not in collapsedSet).
 */
export function isCollapsed(collapsedSet: Set<string>, key: string): boolean {
  return collapsedSet.has(key);
}

/**
 * Toggle collapse state of a section.
 * Returns a new Set (immutable).
 */
export function toggleCollapsed(collapsedSet: Set<string>, key: string): Set<string> {
  const next = new Set(collapsedSet);
  if (next.has(key)) {
    next.delete(key);
  } else {
    next.add(key);
  }
  return next;
}
