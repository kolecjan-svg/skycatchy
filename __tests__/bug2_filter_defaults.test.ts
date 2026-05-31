// __tests__/bug2_filter_defaults.test.ts
// Bug #2: Source filters not selected by default.
// Root cause: selectedSources initializes as empty Set().
// Fix: auto-initialize to all source names when sources first load.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { initializeDefaultFilters } from '../lib/filterUtils';

describe('Bug #2 – Filter defaults: initializeDefaultFilters', () => {
  test('returns all source names when no prior selection exists', () => {
    const allSources = ['fly4free.com', 'secretflying.com', 'obletsvet.cz'];
    const result = initializeDefaultFilters(allSources, null);
    assert.deepEqual([...result].sort(), [...allSources].sort(), 'All sources selected by default');
  });

  test('returns empty set when user has explicitly cleared (prior = empty array)', () => {
    const allSources = ['fly4free.com', 'secretflying.com'];
    // null = never initialized; [] = user explicitly cleared
    const result = initializeDefaultFilters(allSources, []);
    assert.equal(result.size, 0, 'Empty prior selection preserved');
  });

  test('returns prior selection when user has made a choice', () => {
    const allSources = ['fly4free.com', 'secretflying.com', 'obletsvet.cz'];
    const prior = ['fly4free.com'];
    const result = initializeDefaultFilters(allSources, prior);
    assert.deepEqual([...result], ['fly4free.com'], 'User selection preserved exactly');
  });

  test('returns all sources when prior contains all sources', () => {
    const allSources = ['a.com', 'b.sk', 'c.cz'];
    const result = initializeDefaultFilters(allSources, allSources);
    assert.equal(result.size, 3);
  });

  test('returns empty set when allSources is empty (sources not yet loaded)', () => {
    const result = initializeDefaultFilters([], null);
    assert.equal(result.size, 0, 'No sources to initialize with');
  });

  test('handles duplicate source names in allSources gracefully', () => {
    const allSources = ['fly4free.com', 'fly4free.com', 'secretflying.com'];
    const result = initializeDefaultFilters(allSources, null);
    // Result should contain each unique source once
    assert.ok(result.has('fly4free.com'));
    assert.ok(result.has('secretflying.com'));
  });
});
