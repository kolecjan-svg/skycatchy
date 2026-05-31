// hooks/useFavorites.ts – Favorites hook backed by a shared module-level store.
//
// Bug #4 fix: previously each useFavorites() call created isolated React state,
// so toggling in Home was invisible to Saved. Now all callers share one store.

import { useState, useEffect, useCallback } from 'react';
import { favoritesStore } from '../lib/favoritesStore';
import { isFavorite } from '../lib/favoritesUtils';

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(() => favoritesStore.getState());
  const [isLoaded, setIsLoaded] = useState(() => favoritesStore.isLoaded());

  useEffect(() => {
    // Subscribe to store updates — this is what makes cross-screen sync work.
    const unsub = favoritesStore.subscribe((next) => {
      setFavorites(next);
      setIsLoaded(favoritesStore.isLoaded());
    });
    return unsub;
  }, []);

  const toggle = useCallback((dealId: string) => {
    favoritesStore.toggle(dealId);
  }, []);

  const check = useCallback(
    (dealId: string) => isFavorite(favorites, dealId),
    [favorites]
  );

  return {
    favorites,
    toggle,
    isFavorite: check,
    isLoaded,
    favoriteCount: favorites.size,
  };
}
