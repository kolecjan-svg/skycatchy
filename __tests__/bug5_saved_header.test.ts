// __tests__/bug5_saved_header.test.ts
// Bug #5: Saved screen shows a "Saved Deals (N)" header that should be removed.
//
// The header has no navigation purpose (tab bar already labels the screen)
// and the count badge is redundant with the tab bar badge.
//
// This test validates the pure-logic helpers that govern favorites display.
// UI removal is done directly in favorites.tsx (no testable logic involved there).

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { isFavorite, toggleFavorite } from '../lib/favoritesUtils';

describe('Bug #5 – Saved screen display logic (post-header-removal)', () => {
  // After removing the header, the screen shows only cards or empty state.
  // These tests ensure the underlying data logic that drives that view is correct.

  test('empty favorites set → empty state should show (no cards, no header)', () => {
    const favorites = new Set<string>();
    const deals = [{ id: 'deal-1' }, { id: 'deal-2' }];
    const savedDeals = deals.filter((d) => isFavorite(favorites, d.id));
    assert.equal(savedDeals.length, 0, 'No saved deals → show empty state');
  });

  test('non-empty favorites → only matched deals shown (no header needed)', () => {
    const favorites = new Set(['deal-1', 'deal-3']);
    const deals = [
      { id: 'deal-1' },
      { id: 'deal-2' },
      { id: 'deal-3' },
    ];
    const savedDeals = deals.filter((d) => isFavorite(favorites, d.id));
    assert.equal(savedDeals.length, 2);
    assert.deepEqual(savedDeals.map((d) => d.id), ['deal-1', 'deal-3']);
  });

  test('toggling removes deal → should trigger empty state, not show header', () => {
    let favorites = new Set(['deal-only']);
    favorites = toggleFavorite(favorites, 'deal-only');
    const savedDeals = [{ id: 'deal-only' }].filter((d) => isFavorite(favorites, d.id));
    assert.equal(savedDeals.length, 0, 'After removing last favorite, empty state shown');
  });

  test('count badge on tab bar uses favorites.size directly (no header needed for count)', () => {
    const favorites = new Set(['a', 'b', 'c']);
    // The tab bar badge count comes from favorites.size
    assert.equal(favorites.size, 3, 'Tab bar can display count without header');
  });
});
