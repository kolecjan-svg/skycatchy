// lib/favoritesStore.ts – Module-level shared favorites state.
//
// Bug #4 fix: useFavorites() was called in 3 components, each creating isolated
// React state. A toggle in Home never propagated to Saved. Fix: one store instance
// shared across the entire process via module scope.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { toggleFavorite, serializeFavorites, deserializeFavorites } from './favoritesUtils';

const STORAGE_KEY = '@skycatchy:favorites';

type Listener = (favorites: Set<string>) => void;

let state: Set<string> = new Set();
let isLoaded = false;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l(state));
}

async function load() {
  if (isLoaded) return;
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    state = deserializeFavorites(json);
  } catch {
    // Storage failure: start empty, don't crash
  } finally {
    isLoaded = true;
    notify();
  }
}

async function persist() {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, serializeFavorites(state));
  } catch {
    // Silent: don't crash app on storage failure
  }
}

export const favoritesStore = {
  /** Subscribe to state changes. Returns an unsubscribe function. */
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    // Immediately deliver current state if already loaded
    if (isLoaded) listener(state);
    return () => listeners.delete(listener);
  },

  getState(): Set<string> {
    return state;
  },

  isLoaded(): boolean {
    return isLoaded;
  },

  toggle(id: string): void {
    state = toggleFavorite(state, id);
    notify();
    persist();
  },

  /** Call once from the root layout to kick off async load. */
  init(): void {
    load();
  },
};
