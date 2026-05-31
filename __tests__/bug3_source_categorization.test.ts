// __tests__/bug3_source_categorization.test.ts
// Bug #3: Czech websites shown under Global Sources.
// Root cause: categorizeSource only checks TLD — cestujlevne.com has .com TLD.
// Fix: Add DOMAIN_OVERRIDES map for known mismatched domains.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { categorizeSource } from '../lib/sourceUtils';

describe('Bug #3 – Source categorization: known domain overrides', () => {
  test('cestujlevne.com is categorized as czech (not global)', () => {
    assert.equal(categorizeSource('cestujlevne.com'), 'czech',
      'cestujlevne.com is a Czech travel site using .com TLD');
  });

  test('levnocestovani.cz remains czech (TLD detection still works)', () => {
    assert.equal(categorizeSource('levnocestovani.cz'), 'czech');
  });

  test('letenkyzababku.sk remains slovak (TLD detection still works)', () => {
    assert.equal(categorizeSource('letenkyzababku.sk'), 'slovak');
  });

  test('fly4free.com remains global (international English site)', () => {
    assert.equal(categorizeSource('fly4free.com'), 'global');
  });

  test('secretflying.com remains global', () => {
    assert.equal(categorizeSource('secretflying.com'), 'global');
  });

  test('holidaypirates.com remains global', () => {
    assert.equal(categorizeSource('holidaypirates.com'), 'global');
  });

  test('theflightdeal.com remains global', () => {
    assert.equal(categorizeSource('theflightdeal.com'), 'global');
  });

  test('travelfree.info remains global', () => {
    assert.equal(categorizeSource('travelfree.info'), 'global');
  });

  test('flynous.com remains global', () => {
    assert.equal(categorizeSource('flynous.com'), 'global');
  });
});

describe('Bug #3 – All active DB sources correctly categorized', () => {
  const EXPECTED: Record<string, string> = {
    'cestujlevne.com':    'czech',   // BUG WAS HERE
    'fly4free.com':       'global',
    'flynous.com':        'global',
    'holidaypirates.com': 'global',
    'honzovyletenky.cz':  'czech',
    'jaknaletenky.cz':    'czech',
    'letenkyzababku.sk':  'slovak',
    'levnocestovani.cz':  'czech',
    'obletsvet.cz':       'czech',
    'secretflying.com':   'global',
    'theflightdeal.com':  'global',
    'travelfree.info':    'global',
    'zaletsi.cz':         'czech',
  };

  for (const [domain, expected] of Object.entries(EXPECTED)) {
    test(`${domain} → ${expected}`, () => {
      assert.equal(categorizeSource(domain), expected);
    });
  }
});
