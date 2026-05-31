// __tests__/block1.test.ts
// TDD RED phase – Block 1: Deals Feed + Supabase Integration
// Run with: tsx --test __tests__/block1.test.ts

import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';

// ============================================================
// Test: Translation logic
// ============================================================
describe('Translation logic (getDisplayDeal)', () => {
  // Import after implementation exists
  const { getDisplayDeal } = (() => {
    try {
      return require('../lib/translation');
    } catch {
      return { getDisplayDeal: null };
    }
  })();

  const baseDeal = {
    id: 'd1',
    name: 'Prague to Tokyo',
    description: 'Great deal flying east.',
    link: 'https://example.com',
    image: null,
    source: 'fly4free.com',
    publish_date: '2025-05-30T10:00:00Z',
    created_at: '2025-05-30T10:00:00Z',
    lang: 'en',
    deal_translations: [],
  };

  test('uses original content when no translation available', () => {
    if (!getDisplayDeal) throw new Error('getDisplayDeal not implemented yet');
    const result = getDisplayDeal(baseDeal, 'cs');
    assert.equal(result.name, 'Prague to Tokyo');
    assert.equal(result.isTranslated, false);
  });

  test('uses translated content when matching lang exists', () => {
    if (!getDisplayDeal) throw new Error('getDisplayDeal not implemented yet');
    const dealWithTranslation = {
      ...baseDeal,
      deal_translations: [
        { id: 't1', deal_id: 'd1', lang: 'cs', name: 'Praha do Tokia', description: 'Skvělá nabídka.', created_at: '2025-05-30T10:00:00Z' }
      ],
    };
    const result = getDisplayDeal(dealWithTranslation, 'cs');
    assert.equal(result.name, 'Praha do Tokia');
    assert.equal(result.description, 'Skvělá nabídka.');
    assert.equal(result.isTranslated, true);
  });

  test('falls back to original when lang does not match', () => {
    if (!getDisplayDeal) throw new Error('getDisplayDeal not implemented yet');
    const dealWithTranslation = {
      ...baseDeal,
      deal_translations: [
        { id: 't1', deal_id: 'd1', lang: 'sk', name: 'Praha do Tokia SK', description: null, created_at: '2025-05-30T10:00:00Z' }
      ],
    };
    const result = getDisplayDeal(dealWithTranslation, 'cs');
    assert.equal(result.name, 'Prague to Tokyo');
    assert.equal(result.isTranslated, false);
  });

  test('uses first two chars of locale (cs-CZ -> cs)', () => {
    if (!getDisplayDeal) throw new Error('getDisplayDeal not implemented yet');
    const dealWithTranslation = {
      ...baseDeal,
      deal_translations: [
        { id: 't1', deal_id: 'd1', lang: 'cs', name: 'Praha do Tokia', description: null, created_at: '2025-05-30T10:00:00Z' }
      ],
    };
    const result = getDisplayDeal(dealWithTranslation, 'cs-CZ');
    assert.equal(result.name, 'Praha do Tokia');
    assert.equal(result.isTranslated, true);
  });
});

// ============================================================
// Test: Time formatting
// ============================================================
describe('Time formatting (formatPublishDate)', () => {
  const { formatPublishDate } = (() => {
    try {
      return require('../lib/formatters');
    } catch {
      return { formatPublishDate: null };
    }
  })();

  test('formats recent timestamp to relative time', () => {
    if (!formatPublishDate) throw new Error('formatPublishDate not implemented yet');
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const result = formatPublishDate(fiveMinutesAgo);
    assert.ok(result.includes('min') || result.includes('5'), `Expected relative time, got: ${result}`);
  });

  test('returns non-empty string for any ISO date', () => {
    if (!formatPublishDate) throw new Error('formatPublishDate not implemented yet');
    const result = formatPublishDate('2025-01-15T08:30:00Z');
    assert.ok(typeof result === 'string' && result.length > 0);
  });

  test('handles null/undefined gracefully', () => {
    if (!formatPublishDate) throw new Error('formatPublishDate not implemented yet');
    const result = formatPublishDate(null as any);
    assert.ok(typeof result === 'string');
  });
});

// ============================================================
// Test: Source categorization
// ============================================================
describe('Source categorization (categorizeSource)', () => {
  const { categorizeSource } = (() => {
    try {
      return require('../lib/sourceUtils');
    } catch {
      return { categorizeSource: null };
    }
  })();

  test('categorizes .cz domain as czech', () => {
    if (!categorizeSource) throw new Error('categorizeSource not implemented yet');
    assert.equal(categorizeSource('letadlem.cz'), 'czech');
    assert.equal(categorizeSource('letuska.cz'), 'czech');
  });

  test('categorizes .sk domain as slovak', () => {
    if (!categorizeSource) throw new Error('categorizeSource not implemented yet');
    assert.equal(categorizeSource('fly4free.sk'), 'slovak');
  });

  test('categorizes other domains as global', () => {
    if (!categorizeSource) throw new Error('categorizeSource not implemented yet');
    assert.equal(categorizeSource('fly4free.com'), 'global');
    assert.equal(categorizeSource('secretflying.com'), 'global');
  });

  test('handles source with subdomain', () => {
    if (!categorizeSource) throw new Error('categorizeSource not implemented yet');
    const result = categorizeSource('www.fly4free.cz');
    assert.equal(result, 'czech');
  });
});

// ============================================================
// Test: Favorites logic
// ============================================================
describe('Favorites logic (isFavorite, toggleFavorite)', () => {
  const { isFavorite, addFavorite, removeFavorite } = (() => {
    try {
      return require('../lib/favoritesUtils');
    } catch {
      return { isFavorite: null, addFavorite: null, removeFavorite: null };
    }
  })();

  test('isFavorite returns false for empty favorites', () => {
    if (!isFavorite) throw new Error('isFavorite not implemented yet');
    const favorites = new Set<string>();
    assert.equal(isFavorite(favorites, 'deal-1'), false);
  });

  test('isFavorite returns true when deal is in favorites', () => {
    if (!isFavorite) throw new Error('isFavorite not implemented yet');
    const favorites = new Set<string>(['deal-1', 'deal-2']);
    assert.equal(isFavorite(favorites, 'deal-1'), true);
    assert.equal(isFavorite(favorites, 'deal-3'), false);
  });

  test('addFavorite returns new set with deal added', () => {
    if (!addFavorite) throw new Error('addFavorite not implemented yet');
    const favorites = new Set<string>(['deal-1']);
    const next = addFavorite(favorites, 'deal-2');
    assert.ok(next.has('deal-1'));
    assert.ok(next.has('deal-2'));
    assert.equal(next.size, 2);
  });

  test('removeFavorite returns new set without deal', () => {
    if (!removeFavorite) throw new Error('removeFavorite not implemented yet');
    const favorites = new Set<string>(['deal-1', 'deal-2']);
    const next = removeFavorite(favorites, 'deal-1');
    assert.equal(next.has('deal-1'), false);
    assert.ok(next.has('deal-2'));
  });

  test('addFavorite is idempotent', () => {
    if (!addFavorite) throw new Error('addFavorite not implemented yet');
    const favorites = new Set<string>(['deal-1']);
    const next = addFavorite(favorites, 'deal-1');
    assert.equal(next.size, 1);
  });
});

console.log('\n[RALF TDD] RED phase test file written. Expected: all tests throw "not implemented yet" until GREEN phase.');
