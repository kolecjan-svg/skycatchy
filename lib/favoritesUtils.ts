// lib/favoritesUtils.ts – Pure functions for favorites state management

/**
 * Check if a deal is in the favorites set
 */
export function isFavorite(favorites: Set<string>, dealId: string): boolean {
  return favorites.has(dealId);
}

/**
 * Return a new Set with the deal added (immutable)
 */
export function addFavorite(favorites: Set<string>, dealId: string): Set<string> {
  if (favorites.has(dealId)) return favorites;
  return new Set([...favorites, dealId]);
}

/**
 * Return a new Set with the deal removed (immutable)
 */
export function removeFavorite(favorites: Set<string>, dealId: string): Set<string> {
  const next = new Set(favorites);
  next.delete(dealId);
  return next;
}

/**
 * Toggle: add if not present, remove if present
 */
export function toggleFavorite(favorites: Set<string>, dealId: string): Set<string> {
  return isFavorite(favorites, dealId)
    ? removeFavorite(favorites, dealId)
    : addFavorite(favorites, dealId);
}

/**
 * Serialize favorites set to JSON string for AsyncStorage
 */
export function serializeFavorites(favorites: Set<string>): string {
  return JSON.stringify([...favorites]);
}

/**
 * Deserialize favorites from AsyncStorage JSON string
 */
export function deserializeFavorites(json: string | null): Set<string> {
  if (!json) return new Set();
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((id: unknown) => typeof id === 'string'));
  } catch {
    return new Set();
  }
}
