// __tests__/block3.test.ts
// TDD RED phase – Block 3: Favorites persistence + Settings + Collapsible filter + Polish
// Run with: tsx --test __tests__/block3.test.ts

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// ============================================================
// Test: Favorites persistence helpers
// ============================================================
describe('Favorites toggle (toggleFavorite)', () => {
  const { toggleFavorite } = (() => {
    try { return require('../lib/favoritesUtils'); }
    catch { return { toggleFavorite: null }; }
  })();

  test('toggle adds deal when not favorited', () => {
    if (!toggleFavorite) throw new Error('not implemented');
    const result = toggleFavorite(new Set(), 'deal-1');
    assert.ok(result.has('deal-1'));
    assert.equal(result.size, 1);
  });

  test('toggle removes deal when already favorited', () => {
    if (!toggleFavorite) throw new Error('not implemented');
    const favs = new Set(['deal-1', 'deal-2']);
    const result = toggleFavorite(favs, 'deal-1');
    assert.equal(result.has('deal-1'), false);
    assert.ok(result.has('deal-2'));
  });

  test('toggle does not mutate original set', () => {
    if (!toggleFavorite) throw new Error('not implemented');
    const original = new Set(['deal-1']);
    const result = toggleFavorite(original, 'deal-2');
    assert.equal(original.size, 1); // original unchanged
    assert.equal(result.size, 2);
  });
});

// ============================================================
// Test: Collapsible section state
// ============================================================
describe('Collapsible section logic (toggleCollapsed)', () => {
  const { toggleCollapsed, isCollapsed } = (() => {
    try { return require('../lib/uiUtils'); }
    catch { return { toggleCollapsed: null, isCollapsed: null }; }
  })();

  test('section starts expanded by default', () => {
    if (!isCollapsed) throw new Error('not implemented');
    const state = new Set<string>();
    assert.equal(isCollapsed(state, 'czech'), false);
  });

  test('toggleCollapsed collapses an expanded section', () => {
    if (!toggleCollapsed) throw new Error('not implemented');
    const state = new Set<string>();
    const next = toggleCollapsed(state, 'czech');
    assert.ok(next.has('czech'));
  });

  test('toggleCollapsed expands a collapsed section', () => {
    if (!toggleCollapsed) throw new Error('not implemented');
    const state = new Set(['czech']);
    const next = toggleCollapsed(state, 'czech');
    assert.equal(next.has('czech'), false);
  });

  test('collapsing one section does not affect others', () => {
    if (!toggleCollapsed) throw new Error('not implemented');
    const state = new Set(['slovak']);
    const next = toggleCollapsed(state, 'czech');
    assert.ok(next.has('czech'));
    assert.ok(next.has('slovak'));
  });
});

// ============================================================
// Test: formatters edge cases
// ============================================================
describe('formatPublishDate edge cases', () => {
  const { formatPublishDate } = (() => {
    try { return require('../lib/formatters'); }
    catch { return { formatPublishDate: null }; }
  })();

  test('handles just now (< 60s)', () => {
    if (!formatPublishDate) throw new Error('not implemented');
    const recent = new Date(Date.now() - 30000).toISOString();
    const result = formatPublishDate(recent);
    assert.equal(result, 'just now');
  });

  test('handles exactly 1 hour', () => {
    if (!formatPublishDate) throw new Error('not implemented');
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const result = formatPublishDate(oneHourAgo);
    assert.ok(result.includes('h') || result.includes('hour'), `got: ${result}`);
  });

  test('handles 8 days ago (shows date)', () => {
    if (!formatPublishDate) throw new Error('not implemented');
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 3600000).toISOString();
    const result = formatPublishDate(eightDaysAgo);
    // Should be a date string, not relative
    assert.ok(!result.includes('min') && !result.includes('h ago') && !result.includes('d ago'), `got: ${result}`);
    assert.ok(result.length > 0);
  });
});

// ============================================================
// Test: Source grouping completeness
// ============================================================
describe('groupSources completeness', () => {
  const { groupSources } = (() => {
    try { return require('../lib/sourceUtils'); }
    catch { return { groupSources: null }; }
  })();

  test('empty sources returns empty groups', () => {
    if (!groupSources) throw new Error('not implemented');
    const result = groupSources([]);
    assert.equal(result.length, 0);
  });

  test('single cz source creates only Czech group', () => {
    if (!groupSources) throw new Error('not implemented');
    const sources = [{ id: '1', name: 'letadlem.cz', rss_url: '', active: true, created_at: '' }];
    const result = groupSources(sources);
    assert.equal(result.length, 1);
    assert.equal(result[0].category, 'czech');
  });

  test('mixed sources create correct groups in order czech→slovak→global', () => {
    if (!groupSources) throw new Error('not implemented');
    const sources = [
      { id: '1', name: 'secretflying.com', rss_url: '', active: true, created_at: '' },
      { id: '2', name: 'fly4free.sk', rss_url: '', active: true, created_at: '' },
      { id: '3', name: 'letadlem.cz', rss_url: '', active: true, created_at: '' },
    ];
    const result = groupSources(sources);
    assert.equal(result.length, 3);
    assert.equal(result[0].category, 'czech');
    assert.equal(result[1].category, 'slovak');
    assert.equal(result[2].category, 'global');
  });
});

console.log('\n[RALF TDD Block 3] RED phase. Expect toggleCollapsed/isCollapsed to fail.');
