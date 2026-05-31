// __tests__/block2.test.ts
// TDD RED phase – Block 2: Search + Filter + Source Grouping
// Run with: tsx --test __tests__/block2.test.ts

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// ============================================================
// Test: Search filtering logic
// ============================================================
describe('Search filtering (filterDealsByQuery)', () => {
  const { filterDealsByQuery } = (() => {
    try { return require('../lib/searchUtils'); }
    catch { return { filterDealsByQuery: null }; }
  })();

  const deals = [
    { id: '1', name: 'Prague to Tokyo cheap flights', description: 'Amazing deal via Qatar', source: 'fly4free.com', link: '', image: null, publish_date: '', lang: 'en', isTranslated: false },
    { id: '2', name: 'Vienna to New York', description: null, source: 'secretflying.com', link: '', image: null, publish_date: '', lang: 'en', isTranslated: false },
    { id: '3', name: 'Barcelona Beach Holiday', description: 'Sun sea and flights', source: 'letadlem.cz', link: '', image: null, publish_date: '', lang: 'cs', isTranslated: true },
  ];

  test('returns all deals for empty query', () => {
    if (!filterDealsByQuery) throw new Error('filterDealsByQuery not implemented');
    const result = filterDealsByQuery(deals, '');
    assert.equal(result.length, 3);
  });

  test('filters by title match (case insensitive)', () => {
    if (!filterDealsByQuery) throw new Error('filterDealsByQuery not implemented');
    const result = filterDealsByQuery(deals, 'tokyo');
    assert.equal(result.length, 1);
    assert.equal(result[0].id, '1');
  });

  test('filters by description match', () => {
    if (!filterDealsByQuery) throw new Error('filterDealsByQuery not implemented');
    const result = filterDealsByQuery(deals, 'qatar');
    assert.equal(result.length, 1);
    assert.equal(result[0].id, '1');
  });

  test('handles null description gracefully', () => {
    if (!filterDealsByQuery) throw new Error('filterDealsByQuery not implemented');
    const result = filterDealsByQuery(deals, 'new york');
    assert.equal(result.length, 1);
    assert.equal(result[0].id, '2');
  });

  test('returns empty array when no matches', () => {
    if (!filterDealsByQuery) throw new Error('filterDealsByQuery not implemented');
    const result = filterDealsByQuery(deals, 'zzznomatch');
    assert.equal(result.length, 0);
  });

  test('trims whitespace from query', () => {
    if (!filterDealsByQuery) throw new Error('filterDealsByQuery not implemented');
    const result = filterDealsByQuery(deals, '  vienna  ');
    assert.equal(result.length, 1);
  });

  test('returns all when query is only whitespace', () => {
    if (!filterDealsByQuery) throw new Error('filterDealsByQuery not implemented');
    const result = filterDealsByQuery(deals, '   ');
    assert.equal(result.length, 3);
  });
});

// ============================================================
// Test: Source filter logic
// ============================================================
describe('Source filtering (filterDealsBySources)', () => {
  const { filterDealsBySources } = (() => {
    try { return require('../lib/searchUtils'); }
    catch { return { filterDealsBySources: null }; }
  })();

  const deals = [
    { id: '1', name: 'Deal 1', source: 'fly4free.com', description: null, link: '', image: null, publish_date: '', lang: 'en', isTranslated: false },
    { id: '2', name: 'Deal 2', source: 'letadlem.cz', description: null, link: '', image: null, publish_date: '', lang: 'cs', isTranslated: false },
    { id: '3', name: 'Deal 3', source: 'letuska.sk', description: null, link: '', image: null, publish_date: '', lang: 'sk', isTranslated: false },
  ];

  test('returns all deals when selectedSources is empty', () => {
    if (!filterDealsBySources) throw new Error('filterDealsBySources not implemented');
    const result = filterDealsBySources(deals, new Set());
    assert.equal(result.length, 3);
  });

  test('filters to single source', () => {
    if (!filterDealsBySources) throw new Error('filterDealsBySources not implemented');
    const result = filterDealsBySources(deals, new Set(['fly4free.com']));
    assert.equal(result.length, 1);
    assert.equal(result[0].id, '1');
  });

  test('filters to multiple sources', () => {
    if (!filterDealsBySources) throw new Error('filterDealsBySources not implemented');
    const result = filterDealsBySources(deals, new Set(['fly4free.com', 'letadlem.cz']));
    assert.equal(result.length, 2);
  });

  test('returns empty when no deal matches selected sources', () => {
    if (!filterDealsBySources) throw new Error('filterDealsBySources not implemented');
    const result = filterDealsBySources(deals, new Set(['nonexistent.com']));
    assert.equal(result.length, 0);
  });
});

// ============================================================
// Test: Combined search + filter
// ============================================================
describe('Combined search + filter (applyFilters)', () => {
  const { applyFilters } = (() => {
    try { return require('../lib/searchUtils'); }
    catch { return { applyFilters: null }; }
  })();

  const deals = [
    { id: '1', name: 'Prague to Tokyo', description: 'Via Qatar', source: 'fly4free.com', link: '', image: null, publish_date: '', lang: 'en', isTranslated: false },
    { id: '2', name: 'Vienna to New York', description: null, source: 'letadlem.cz', link: '', image: null, publish_date: '', lang: 'cs', isTranslated: false },
    { id: '3', name: 'Tokyo discount sale', description: 'Summer flights', source: 'secretflying.com', link: '', image: null, publish_date: '', lang: 'en', isTranslated: false },
  ];

  test('search + source filter narrows results correctly', () => {
    if (!applyFilters) throw new Error('applyFilters not implemented');
    // Search for "tokyo" + only fly4free.com
    const result = applyFilters(deals, 'tokyo', new Set(['fly4free.com']));
    assert.equal(result.length, 1);
    assert.equal(result[0].id, '1');
  });

  test('empty query + source filter applies source filter only', () => {
    if (!applyFilters) throw new Error('applyFilters not implemented');
    const result = applyFilters(deals, '', new Set(['letadlem.cz']));
    assert.equal(result.length, 1);
    assert.equal(result[0].id, '2');
  });

  test('search + empty sources returns all matching search', () => {
    if (!applyFilters) throw new Error('applyFilters not implemented');
    const result = applyFilters(deals, 'tokyo', new Set());
    assert.equal(result.length, 2); // both Tokyo deals
  });

  test('both empty returns all', () => {
    if (!applyFilters) throw new Error('applyFilters not implemented');
    const result = applyFilters(deals, '', new Set());
    assert.equal(result.length, 3);
  });
});

// ============================================================
// Test: Source group selection logic
// ============================================================
describe('Source group selection (getGroupSelectionState)', () => {
  const { getGroupSelectionState } = (() => {
    try { return require('../lib/searchUtils'); }
    catch { return { getGroupSelectionState: null }; }
  })();

  const group = {
    category: 'czech' as const,
    label: 'Czech sources',
    sources: [
      { id: '1', name: 'letadlem.cz', rss_url: '', active: true, created_at: '' },
      { id: '2', name: 'letuska.cz', rss_url: '', active: true, created_at: '' },
    ],
  };

  test('returns none when no sources selected', () => {
    if (!getGroupSelectionState) throw new Error('getGroupSelectionState not implemented');
    const state = getGroupSelectionState(group, new Set());
    assert.equal(state, 'none');
  });

  test('returns all when all sources selected', () => {
    if (!getGroupSelectionState) throw new Error('getGroupSelectionState not implemented');
    const state = getGroupSelectionState(group, new Set(['letadlem.cz', 'letuska.cz']));
    assert.equal(state, 'all');
  });

  test('returns partial when some sources selected', () => {
    if (!getGroupSelectionState) throw new Error('getGroupSelectionState not implemented');
    const state = getGroupSelectionState(group, new Set(['letadlem.cz']));
    assert.equal(state, 'partial');
  });
});

// ============================================================
// Test: Serialization (favorites round-trip)
// ============================================================
describe('Favorites serialization round-trip', () => {
  const { serializeFavorites, deserializeFavorites } = (() => {
    try { return require('../lib/favoritesUtils'); }
    catch { return { serializeFavorites: null, deserializeFavorites: null }; }
  })();

  test('round-trip: serialize then deserialize returns same set', () => {
    if (!serializeFavorites || !deserializeFavorites) throw new Error('not implemented');
    const original = new Set(['id-1', 'id-2', 'id-3']);
    const json = serializeFavorites(original);
    const restored = deserializeFavorites(json);
    assert.equal(restored.size, 3);
    assert.ok(restored.has('id-1'));
    assert.ok(restored.has('id-2'));
    assert.ok(restored.has('id-3'));
  });

  test('deserialize handles invalid JSON gracefully', () => {
    if (!deserializeFavorites) throw new Error('not implemented');
    const result = deserializeFavorites('NOT VALID JSON{{{');
    assert.equal(result.size, 0);
  });

  test('deserialize handles non-array JSON gracefully', () => {
    if (!deserializeFavorites) throw new Error('not implemented');
    const result = deserializeFavorites('{"key":"value"}');
    assert.equal(result.size, 0);
  });

  test('empty set serializes to []', () => {
    if (!serializeFavorites) throw new Error('not implemented');
    const json = serializeFavorites(new Set());
    assert.equal(json, '[]');
  });
});

console.log('\n[RALF TDD Block 2] RED phase complete. Expect all tests to fail until GREEN.');
