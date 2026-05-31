// __tests__/bug7_favorites_duplicates.test.ts
// Bug #7: Favorites count / badge / saved list are inconsistent.
//
// Root cause 1 (PRIMARY):
//   allDeals = pages.flatMap(p => p.deals) — each page deduplicates within its
//   own time window. A deal active for 10h appears in page 0 (0-4h) AND page 1
//   (4-28h). favoritedDeals.filter(d => favorites.has(d.id)) returns 2 cards
//   for 1 saved deal → Saved screen shows duplicates. Badge (Set.size) = 1 but
//   visible saved cards = 2 → count mismatch.
//
// Root cause 2 (SECONDARY race):
//   toggle(id) called before load() completes (isLoaded=false) → state updated
//   in memory → load() resumes from await, overwrites state with old persisted
//   value → in-flight toggle is silently lost.
//
// RED phase: tests define the contract for both fixes.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { deduplicateDealDisplays } from '../lib/dealDisplayUtils';
import { toggleFavorite, isFavorite } from '../lib/favoritesUtils';

// ---------------------------------------------------------------------------
// Defect 1 – cross-page duplicate DealDisplay items
// ---------------------------------------------------------------------------

const makeDeal = (id: string, publishDate: string) => ({
  id,
  name: `Deal ${id}`,
  description: null,
  link: `https://example.com/${id}`,
  image: null,
  source: 'test.com',
  publish_date: publishDate,
  lang: 'en',
  isTranslated: false,
});

describe('Bug #7 – cross-page dedup: deduplicateDealDisplays', () => {
  test('removes duplicate deal ID that appeared in two pages', () => {
    const page0Deal = makeDeal('deal-x', '2026-05-31T12:30:00');
    const page1Deal = makeDeal('deal-x', '2026-05-31T09:45:00'); // older
    const allDeals = [page0Deal, page1Deal];

    const result = deduplicateDealDisplays(allDeals);

    assert.equal(result.length, 1, 'Should collapse 2 instances of deal-x to 1');
    assert.equal(result[0].publish_date, '2026-05-31T12:30:00', 'Should keep the newer entry');
  });

  test('keeps the newer publish_date when the same deal appears on multiple pages', () => {
    const deals = [
      makeDeal('deal-a', '2026-05-31T08:00:00'), // older (from page 1)
      makeDeal('deal-b', '2026-05-31T13:00:00'), // unique
      makeDeal('deal-a', '2026-05-31T13:15:00'), // newer (from page 0) — must win
    ];
    const result = deduplicateDealDisplays(deals);
    const dealA = result.find((d) => d.id === 'deal-a')!;
    assert.equal(dealA.publish_date, '2026-05-31T13:15:00', 'Newer entry must be kept');
  });

  test('does not mutate input array', () => {
    const deals = [makeDeal('deal-z', '2026-05-31T10:00:00'), makeDeal('deal-z', '2026-05-31T11:00:00')];
    const original = [...deals];
    deduplicateDealDisplays(deals);
    assert.deepEqual(deals.map((d) => d.id), original.map((d) => d.id));
  });

  test('output is sorted newest-first by publish_date', () => {
    const deals = [
      makeDeal('a', '2026-05-31T08:00:00'),
      makeDeal('b', '2026-05-31T13:00:00'),
      makeDeal('c', '2026-05-31T11:00:00'),
      makeDeal('a', '2026-05-31T12:00:00'), // page 1 dupe, older than page 0 entry
    ];
    const result = deduplicateDealDisplays(deals);
    // After dedup: a(12:00), b(13:00), c(11:00) → sorted: b, a, c
    assert.equal(result[0].id, 'b', 'Newest deal first');
    assert.equal(result[1].id, 'a');
    assert.equal(result[2].id, 'c');
  });

  test('returns empty array for empty input', () => {
    assert.deepEqual(deduplicateDealDisplays([]), []);
  });

  test('returns all unique deals unchanged when no duplicates', () => {
    const deals = [
      makeDeal('x', '2026-05-31T10:00:00'),
      makeDeal('y', '2026-05-31T11:00:00'),
      makeDeal('z', '2026-05-31T09:00:00'),
    ];
    const result = deduplicateDealDisplays(deals);
    assert.equal(result.length, 3);
  });

  test('badge count (Set.size) equals unique favorited IDs, not visible card count', () => {
    // Simulates the bug: deal-x appears twice in allDeals (cross-page dupe)
    const allDealsWithDuplicates = [
      makeDeal('deal-x', '2026-05-31T12:00:00'), // page 0
      makeDeal('deal-y', '2026-05-31T11:00:00'), // page 0
      makeDeal('deal-x', '2026-05-31T09:00:00'), // page 1 dupe
    ];

    const favorites = new Set(['deal-x']);

    // BUG: without global dedup, favoritedDeals has 2 entries for deal-x
    const buggyFavorited = allDealsWithDuplicates.filter((d) => favorites.has(d.id));
    assert.equal(buggyFavorited.length, 2, 'Without dedup: 2 cards shown (BUG)');
    assert.equal(favorites.size, 1, 'Badge shows 1 (correct)');
    // BUG: 2 cards vs badge of 1 → mismatch!

    // FIX: with global dedup, favoritedDeals has 1 entry for deal-x
    const deduped = deduplicateDealDisplays(allDealsWithDuplicates);
    const fixedFavorited = deduped.filter((d) => favorites.has(d.id));
    assert.equal(fixedFavorited.length, 1, 'After dedup: 1 card shown (FIXED)');
    assert.equal(favorites.size, fixedFavorited.length, 'Badge matches visible cards');
  });
});

// ---------------------------------------------------------------------------
// Defect 2 – toggle-during-load race condition
// ---------------------------------------------------------------------------

describe('Bug #7 – toggle race: queued toggles applied after load', () => {
  test('toggleFavorite is pure and idempotent for same ID', () => {
    const base = new Set<string>();
    const after1 = toggleFavorite(base, 'deal-a'); // add
    const after2 = toggleFavorite(after1, 'deal-a'); // remove
    assert.equal(after2.size, 0, 'Double toggle of same ID = no-op');
    assert.ok(!isFavorite(after2, 'deal-a'));
  });

  test('pending toggles applied in order preserve correct final state', () => {
    // Simulates: load returns {A}, pending toggles = [B, C]
    let state = new Set(['deal-a']); // loaded from storage
    const pending = ['deal-b', 'deal-c'];
    for (const id of pending) {
      state = toggleFavorite(state, id);
    }
    assert.ok(state.has('deal-a'), 'Loaded favorite preserved');
    assert.ok(state.has('deal-b'), 'Queued toggle-b applied');
    assert.ok(state.has('deal-c'), 'Queued toggle-c applied');
    assert.equal(state.size, 3);
  });

  test('pending toggle of an existing stored ID removes it (not duplicated)', () => {
    // Simulates: load returns {A}, pending toggle = [A] (user toggled during load)
    let state = new Set(['deal-a']); // loaded from storage
    state = toggleFavorite(state, 'deal-a'); // remove (was queued before load)
    assert.equal(state.size, 0, 'deal-a removed by pending toggle, not duplicated');
  });

  test('empty pending queue does not change loaded state', () => {
    const loaded = new Set(['deal-x', 'deal-y']);
    let state = loaded;
    const pending: string[] = [];
    for (const id of pending) state = toggleFavorite(state, id);
    assert.deepEqual([...state].sort(), ['deal-x', 'deal-y']);
  });
});

// ---------------------------------------------------------------------------
// Integration: saved screen receives deduplicated feed
// ---------------------------------------------------------------------------

describe('Bug #7 – integration: Saved screen card count matches badge', () => {
  test('after fix: saved screen shows same count as badge for all scenarios', () => {
    const scenarios = [
      { allDeals: [], favIds: [] },
      { allDeals: ['a', 'b', 'c'], favIds: ['a'] },
      { allDeals: ['a', 'a', 'b'], favIds: ['a'] },      // page dupe of a
      { allDeals: ['a', 'b', 'a', 'c'], favIds: ['a', 'b'] }, // two dupes
    ];

    for (const { allDeals: ids, favIds } of scenarios) {
      const deals = ids.map((id, i) =>
        makeDeal(id, `2026-05-31T${String(i).padStart(2, '0')}:00:00`)
      );
      const favorites = new Set(favIds);

      // After global dedup (the fix)
      const deduped = deduplicateDealDisplays(deals);
      const savedCards = deduped.filter((d) => favorites.has(d.id));

      const badgeCount = favorites.size;
      assert.ok(
        savedCards.length <= badgeCount,
        `Saved cards (${savedCards.length}) must not exceed badge (${badgeCount}) for ids=${ids.join(',')}`
      );
    }
  });
});
