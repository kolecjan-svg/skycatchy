// lib/filterUtils.ts – Filter initialization utilities.
// Bug #2: source filters should be all-selected on first launch.

/**
 * Determine the initial selected sources Set.
 *
 * @param allSources    All available source names (from DB).
 * @param priorSelection  null = never initialized; string[] = previously saved user choice.
 *
 * Rules:
 * - null prior → select ALL (first launch default)
 * - [] prior   → keep empty (user explicitly cleared)
 * - non-empty prior → restore user's exact selection
 */
export function initializeDefaultFilters(
  allSources: string[],
  priorSelection: string[] | null
): Set<string> {
  if (priorSelection === null) {
    // First launch: default to all selected
    return new Set(allSources);
  }
  // Restore user's previous choice (may be empty)
  return new Set(priorSelection);
}
