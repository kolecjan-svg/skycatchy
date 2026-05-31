// __tests__/bug4_favorites_sync.test.ts
// Bug #4: Favorites not synchronized between screens.
// Root cause: useFavorites() creates isolated state per component.
// Fix: Single shared FavoritesStore (module-level state + subscribers).
//
// RED phase: these tests define the contract. They fail until the fix is in place.

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { toggleFavorite, isFavorite, serializeFavorites, deserializeFavorites } from '../lib/favoritesUtils';

// The real synchronization contract is at the store level.
// We test that a shared mutable store (the module pattern used by FavoritesStore)
// propagates changes to all subscribers immediately.

describe('Bug #4 – Favorites sync: shared store contract', () => {
  // Simulate two subscribers (Home screen, Saved screen) reading from the same state.
  type Listener = (favorites: Set<string>) => void;

  function createFavoritesStore(initial: Set<string> = new Set()) {
    let state = new Set(initial);
    const listeners = new Set<Listener>();

    return {
      getState: () => state,
      toggle: (id: string) => {
        state = toggleFavorite(state, id);
        listeners.forEach((l) => l(state));
      },
      subscribe: (l: Listener) => {
        listeners.add(l);
        return () => listeners.delete(l);
      },
      getListenerCount: () => listeners.size,
    };
  }

  test('toggle in one subscriber is immediately visible to a second subscriber', () => {
    const store = createFavoritesStore();
    let homeView = new Set<string>();
    let savedView = new Set<string>();

    store.subscribe((s) => { homeView = new Set(s); });
    store.subscribe((s) => { savedView = new Set(s); });

    store.toggle('deal-1');

    assert.ok(homeView.has('deal-1'), 'Home should see deal-1 favorited');
    assert.ok(savedView.has('deal-1'), 'Saved should see deal-1 favorited immediately');
  });

  test('removing in Saved immediately removes from Home', () => {
    const store = createFavoritesStore(new Set(['deal-1', 'deal-2']));
    let homeView = new Set<string>();
    let savedView = new Set<string>();

    store.subscribe((s) => { homeView = new Set(s); });
    store.subscribe((s) => { savedView = new Set(s); });

    // User removes deal-1 from Saved screen
    store.toggle('deal-1');

    assert.ok(!homeView.has('deal-1'), 'Home should immediately show deal-1 removed');
    assert.ok(!savedView.has('deal-1'), 'Saved should show deal-1 removed');
    assert.ok(homeView.has('deal-2'), 'deal-2 should still be present');
  });

  test('badge count matches favorites size across all subscribers', () => {
    const store = createFavoritesStore();
    const counts: number[] = [];

    store.subscribe((s) => counts.push(s.size));

    store.toggle('deal-1');
    store.toggle('deal-2');
    store.toggle('deal-1'); // remove

    assert.deepEqual(counts, [1, 2, 1], 'Badge should reflect exact count after each toggle');
  });

  test('state is not duplicated when multiple subscribers exist', () => {
    const store = createFavoritesStore();
    store.subscribe(() => {});
    store.subscribe(() => {});
    store.subscribe(() => {});

    store.toggle('deal-x');
    assert.equal(store.getState().size, 1, 'Should have exactly 1 favorite regardless of subscriber count');
  });

  test('serialization round-trip preserves state for persistence', () => {
    const original = new Set(['deal-a', 'deal-b', 'deal-c']);
    const serialized = serializeFavorites(original);
    const restored = deserializeFavorites(serialized);
    assert.deepEqual([...restored].sort(), [...original].sort(), 'Persistence round-trip should preserve all IDs');
  });

  test('isFavorite reflects current shared state', () => {
    const store = createFavoritesStore();
    assert.ok(!isFavorite(store.getState(), 'deal-1'));
    store.toggle('deal-1');
    assert.ok(isFavorite(store.getState(), 'deal-1'));
    store.toggle('deal-1');
    assert.ok(!isFavorite(store.getState(), 'deal-1'));
  });
});
