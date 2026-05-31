// lib/favoritesStore.ts – Module-level shared favorites state.
//
// Bug #4 fix: one store shared across all screens via module scope.
// Bug #7 fix: guard toggle() during load with a pending queue so in-flight
//   toggles are not silently overwritten when load() resumes from AsyncStorage.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { toggleFavorite, serializeFavorites, deserializeFavorites } from './favoritesUtils';

const STORAGE_KEY = '@skycatchy:favorites';

type Listener = (favorites: Set<string>) => void;

let state: Set<string> = new Set();
let isLoaded = false;
const listeners = new Set<Listener>();

// Bug #7: queue toggles that arrive before load() completes
const pendingToggles: string[] = [];

function notify() {
  listeners.forEach((l) => l(state));
}

async function load() {
  if (isLoaded) return;
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    state = deserializeFavorites(json);
    // Bug #7 fix: replay any toggles that fired during the async load gap
    for (const id of pendingToggles) {
      state = toggleFavorite(state, id);
    }
    pendingToggles.length = 0;
  } catch {
    pendingToggles.length = 0;
  } finally {
    isLoaded = true;
    notify();
  }
}

async function persist() {
  // serializeFavorites(state) is evaluated synchronously before the await,
  // so it always captures the state at call time — no race condition here.
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
    if (!isLoaded) {
      // Bug #7 fix: queue the toggle so it's applied after AsyncStorage resolves
      pendingToggles.push(id);
      return;
    }
    state = toggleFavorite(state, id);
    notify();
    persist();
  },

  /** Call once from the root layout to kick off async load. */
  init(): void {
    load();
  },
};
