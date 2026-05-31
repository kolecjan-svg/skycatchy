// hooks/useFavorites.ts – Favorites management with AsyncStorage persistence

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isFavorite,
  toggleFavorite,
  serializeFavorites,
  deserializeFavorites,
} from '../lib/favoritesUtils';

const FAVORITES_STORAGE_KEY = '@skycatchy:favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isLoaded, setIsLoaded] = useState(false);

  // Load favorites from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(FAVORITES_STORAGE_KEY)
      .then((json) => {
        setFavorites(deserializeFavorites(json));
        setIsLoaded(true);
      })
      .catch((err) => {
        if (__DEV__) console.warn('[useFavorites] Could not load favorites:', err);
        setIsLoaded(true); // Don't block UI on storage error
      });
  }, []);

  // Persist favorites whenever they change (after initial load)
  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(FAVORITES_STORAGE_KEY, serializeFavorites(favorites)).catch(
      () => {} // Storage error: silent, don't crash app
    );
  }, [favorites, isLoaded]);

  const toggle = useCallback((dealId: string) => {
    setFavorites((prev) => toggleFavorite(prev, dealId));
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
