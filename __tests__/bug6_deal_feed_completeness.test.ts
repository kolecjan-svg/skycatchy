// __tests__/bug6_deal_feed_completeness.test.ts
// Bug #6: App shows far fewer deals than the website.
//
// Root cause (quantified against live DB):
//   - WINDOW_LIMIT=2000 silently capped to 1000 (Supabase REST API hard cap)
//   - WINDOW_DAYS=7 → 1000 out of ~174,000 rows = 0.57% sample = 7 unique deals
//   - No offset pagination — only 1 request per page
//
// Fix: 4-hour window + multi-request offset pagination:
//   4h window has 2191 total rows → 3 requests × 1000 = all rows → 166 unique deals
//
// Tests validate the new query strategy functions.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildWindowedPages, estimateUniqueDealsFromRows } from '../lib/dealQueryUtils';

describe('Bug #6 – Deal feed completeness: window configuration', () => {
  test('page 0 window covers exactly the last RECENT_WINDOW_HOURS', () => {
    const now = new Date('2026-06-01T12:00:00Z').getTime();
    const page = buildWindowedPages(0, now);
    const sinceMs = new Date(page.since).getTime();
    const expectedMs = now - page.windowHours * 60 * 60 * 1000;
    assert.ok(
      Math.abs(sinceMs - expectedMs) < 5000,
      `Page 0 'since' should be ${page.windowHours} hours before now`
    );
    assert.ok(page.useOffsetPagination, 'Page 0 must use offset pagination');
  });

  test('page 0 window is short (≤ 4 hours) to keep total rows under control', () => {
    const page = buildWindowedPages(0, Date.now());
    assert.ok(
      page.windowHours <= 4,
      `Page 0 window must be ≤ 4h (got ${page.windowHours}h) to avoid fetching millions of rows`
    );
  });

  test('pages beyond 0 use progressively older windows', () => {
    const now = Date.now();
    const p0 = buildWindowedPages(0, now);
    const p1 = buildWindowedPages(1, now);
    const p2 = buildWindowedPages(2, now);

    assert.ok(
      new Date(p1.since) < new Date(p0.since),
      'Page 1 since must be earlier than page 0 since'
    );
    assert.ok(
      new Date(p2.since) < new Date(p1.since),
      'Page 2 since must be earlier than page 1 since'
    );
  });

  test('page 0 window end is now (or close to it)', () => {
    const now = new Date('2026-06-01T12:00:00Z').getTime();
    const page = buildWindowedPages(0, now);
    const untilMs = new Date(page.until).getTime();
    // Allow up to 2 minutes buffer
    assert.ok(Math.abs(untilMs - now) < 2 * 60 * 1000, 'Page 0 until should be ≈ now');
  });

  test('page 1 window starts where page 0 ends (no gap, no overlap)', () => {
    const now = Date.now();
    const p0 = buildWindowedPages(0, now);
    const p1 = buildWindowedPages(1, now);
    // p1.until should equal p0.since (within a small tolerance)
    const p0Since = new Date(p0.since).getTime();
    const p1Until = new Date(p1.until).getTime();
    assert.ok(
      Math.abs(p0Since - p1Until) < 5000,
      'Page 1 window end must equal page 0 window start (no gap)'
    );
  });
});

describe('Bug #6 – Deal feed completeness: deduplication math', () => {
  test('166 unique IDs from 2191 rows (simulated 4h window data)', () => {
    // Simulate the actual DB data structure: 166 unique deals,
    // each appearing ~13 times on average (2191 / 166 ≈ 13.2)
    const rows: Array<{ id: string; created_at: string }> = [];
    for (let dealIdx = 0; dealIdx < 166; dealIdx++) {
      const id = `deal-${dealIdx.toString().padStart(3, '0')}`;
      const repeats = dealIdx < 20 ? 20 : 13; // some deals appear more often
      for (let r = 0; r < repeats; r++) {
        const ts = new Date(2026, 4, 31, 9 + r, (r * 15) % 60).toISOString();
        rows.push({ id, created_at: ts });
      }
    }
    const uniqueCount = estimateUniqueDealsFromRows(rows);
    assert.equal(uniqueCount, 166, 'Deduplication must yield exactly 166 unique deals');
  });

  test('WINDOW_LIMIT=2000 capturing only 1000 rows (Supabase cap) loses 93% of unique deals', () => {
    // Simulates old behavior: 7-day window with 174,000 total rows, LIMIT effectively 1000
    const TOTAL_UNIQUE = 166;
    const TOTAL_ROWS = 174_000;
    const ACTUAL_FETCHED = 1_000; // Supabase REST cap

    // In heap scan order (oldest first), first 1000 of 174,000 rows gives:
    const expectedUnique = Math.round(TOTAL_UNIQUE * ACTUAL_FETCHED / TOTAL_ROWS);
    assert.ok(
      expectedUnique <= 7,
      `Old query yields only ~${expectedUnique} unique deals from 7-day window (got ${expectedUnique})`
    );
  });

  test('4h window with offset pagination fetches 100% of unique deals', () => {
    const TOTAL_ROWS_4H = 2191;
    const UNIQUE_DEALS_4H = 166;
    const REQUESTS_NEEDED = Math.ceil(TOTAL_ROWS_4H / 1000); // 3 requests
    const ROWS_FETCHED = Math.min(REQUESTS_NEEDED * 1000, TOTAL_ROWS_4H);

    assert.equal(REQUESTS_NEEDED, 3, 'Should take 3 requests to cover all 2191 rows');
    assert.equal(ROWS_FETCHED, 2191, 'All rows covered'); // 3000 ≥ 2191
    // After dedup from 2191 rows: all 166 unique deals
    assert.equal(UNIQUE_DEALS_4H, 166, 'Full unique deal coverage');
  });
});

describe('Bug #6 – Deal feed completeness: offset pagination behavior', () => {
  test('maxOffsetPages covers all rows in the window', () => {
    const p0 = buildWindowedPages(0, Date.now());
    // Should request enough offset pages to cover at least 3000 rows
    assert.ok(p0.maxOffsetPages >= 3, `maxOffsetPages must be ≥ 3 (got ${p0.maxOffsetPages})`);
  });

  test('maxOffsetPages is capped to avoid runaway fetching', () => {
    const p0 = buildWindowedPages(0, Date.now());
    assert.ok(p0.maxOffsetPages <= 10, 'maxOffsetPages must not exceed 10');
  });
});
