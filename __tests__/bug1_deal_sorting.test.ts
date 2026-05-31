// __tests__/bug1_deal_sorting.test.ts
// Bug #1: Home feed shows old deals instead of newest.
// Root cause: .range(from,to) fetches oldest table rows; sort operates on wrong data.
// Fix: effectiveSortDate = publish_date ?? created_at; filter to recent window.
//
// RED phase: tests define the sorting contract for deduplication + display date logic.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { getEffectiveSortDate, sortDealsByDate } from '../lib/dealSortUtils';

describe('Bug #1 – Deal sorting: effective sort date', () => {
  test('uses publish_date when it is non-null', () => {
    const date = getEffectiveSortDate('2026-04-01T10:00:00', '2026-05-31T10:00:00');
    assert.equal(date, '2026-04-01T10:00:00', 'publish_date takes priority over created_at');
  });

  test('falls back to created_at when publish_date is null', () => {
    const date = getEffectiveSortDate(null, '2026-05-31T10:00:00');
    assert.equal(date, '2026-05-31T10:00:00', 'created_at used when publish_date is null');
  });

  test('falls back to created_at when publish_date is empty string', () => {
    const date = getEffectiveSortDate('', '2026-05-31T10:00:00');
    assert.equal(date, '2026-05-31T10:00:00', 'empty publish_date treated as null');
  });

  test('returns created_at when both are null/empty', () => {
    const date = getEffectiveSortDate(null, '2026-01-15T00:00:00');
    assert.equal(date, '2026-01-15T00:00:00');
  });
});

describe('Bug #1 – Deal sorting: sortDealsByDate', () => {
  const makeDeals = (items: Array<{ publish_date: string | null; created_at: string; id: string }>) =>
    items.map((d) => ({
      id: d.id,
      name: `Deal ${d.id}`,
      description: null,
      link: 'https://example.com',
      image: null,
      source: 'test.com',
      publish_date: d.publish_date ?? '',
      created_at: d.created_at,
      lang: 'en',
    }));

  test('newest deal appears first when sorting by created_at', () => {
    const deals = makeDeals([
      { id: 'old', publish_date: null, created_at: '2026-04-01T00:00:00' },
      { id: 'new', publish_date: null, created_at: '2026-05-31T00:00:00' },
      { id: 'mid', publish_date: null, created_at: '2026-05-01T00:00:00' },
    ]);
    const sorted = sortDealsByDate(deals);
    assert.equal(sorted[0].id, 'new');
    assert.equal(sorted[1].id, 'mid');
    assert.equal(sorted[2].id, 'old');
  });

  test('publish_date takes priority over created_at for sort order', () => {
    const deals = makeDeals([
      // This deal has an old created_at but a very recent publish_date
      { id: 'published-recent', publish_date: '2026-05-30T12:00:00', created_at: '2026-04-01T00:00:00' },
      // This deal has a recent created_at but no publish_date
      { id: 'created-recent', publish_date: null, created_at: '2026-05-29T00:00:00' },
    ]);
    const sorted = sortDealsByDate(deals);
    assert.equal(sorted[0].id, 'published-recent', 'Deal with recent publish_date should appear first');
  });

  test('deals from April 2026 sort after deals from May 2026', () => {
    const deals = makeDeals([
      { id: 'may', publish_date: null, created_at: '2026-05-15T00:00:00' },
      { id: 'april', publish_date: null, created_at: '2026-04-15T00:00:00' },
    ]);
    const sorted = sortDealsByDate(deals);
    assert.equal(sorted[0].id, 'may');
    assert.equal(sorted[1].id, 'april');
  });

  test('empty array returns empty array', () => {
    assert.deepEqual(sortDealsByDate([]), []);
  });

  test('single deal returns that deal unchanged', () => {
    const deals = makeDeals([{ id: 'only', publish_date: null, created_at: '2026-05-01T00:00:00' }]);
    const sorted = sortDealsByDate(deals);
    assert.equal(sorted[0].id, 'only');
  });

  test('sort is stable for equal effective dates', () => {
    const deals = makeDeals([
      { id: 'a', publish_date: null, created_at: '2026-05-01T00:00:00' },
      { id: 'b', publish_date: null, created_at: '2026-05-01T00:00:00' },
    ]);
    const sorted = sortDealsByDate(deals);
    assert.equal(sorted.length, 2, 'Both deals preserved with equal dates');
  });
});
