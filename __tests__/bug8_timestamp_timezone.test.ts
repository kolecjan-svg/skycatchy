// __tests__/bug8_timestamp_timezone.test.ts
// Bug #8: Incorrect relative time display — multiple deals show "2 hours ago"
// even though they were inserted minutes ago.
//
// Root cause:
//   Supabase returns UTC timestamps WITHOUT timezone designator:
//     "2026-05-31T15:00:23.852"  (no Z, no +00:00)
//   JavaScript's Date constructor treats timezone-naive strings as LOCAL TIME.
//   On UTC+2 (Europe/Vienna — Czech/Slovak user base), this shifts every
//   timestamp 2 hours into the past:
//     new Date("2026-05-31T15:00:23")  → parsed as 13:00:23 UTC (BUG: −2h)
//     new Date("2026-05-31T15:00:23Z") → parsed as 15:00:23 UTC (CORRECT)
//   A deal from 12 minutes ago appears as "2h ago".
//   Stale deals from 3 days ago (UTC) appear with +2h → pushed over thresholds,
//   creating a jump past intermediate hour values.
//
// Fix: append 'Z' when no timezone designator is present.
//   formatPublishDate() now accepts an optional nowMs for deterministic tests.

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { formatPublishDate } from '../lib/formatters';

// Fixed reference point: 2026-05-31 15:11:17 UTC
const NOW_UTC = '2026-05-31T15:11:17Z';
const NOW_MS  = new Date(NOW_UTC).getTime();

// Strip timezone designator to simulate what Supabase actually returns
function supabaseTs(utcIso: string): string {
  return utcIso.replace('Z', '').replace('+00:00', '');
}

// fmt() calls formatPublishDate with the fixed clock
function fmt(ts: string | null | undefined) {
  return formatPublishDate(ts, NOW_MS);
}

describe('Bug #8 – Timestamp timezone: Supabase timestamps parsed as UTC', () => {
  test('deal inserted 12 minutes ago shows "12 min ago", not "2h ago"', () => {
    // 14:59:17 UTC = 12 min before 15:11:17 UTC
    const ts = supabaseTs('2026-05-31T14:59:17Z');
    const result = fmt(ts);
    assert.notEqual(result, '2h ago', 'Should NOT show 2h ago for a 12-min-old deal');
    assert.equal(result, '12 min ago', `Expected "12 min ago", got "${result}"`);
  });

  test('deal inserted 30 minutes ago shows "30 min ago"', () => {
    const ts = supabaseTs('2026-05-31T14:41:17Z');
    assert.equal(fmt(ts), '30 min ago');
  });

  test('deal inserted 1 hour ago shows "1h ago"', () => {
    const ts = supabaseTs('2026-05-31T14:11:17Z');
    assert.equal(fmt(ts), '1h ago');
  });

  test('deal inserted 3 hours ago shows "3h ago"', () => {
    const ts = supabaseTs('2026-05-31T12:11:17Z');
    assert.equal(fmt(ts), '3h ago');
  });

  test('deal inserted 8 hours ago shows "8h ago"', () => {
    const ts = supabaseTs('2026-05-31T07:11:17Z');
    assert.equal(fmt(ts), '8h ago');
  });

  test('deal inserted 1 day ago shows "1d ago"', () => {
    const ts = supabaseTs('2026-05-30T15:11:17Z');
    assert.equal(fmt(ts), '1d ago');
  });

  test('deal inserted 3 days ago shows "3d ago"', () => {
    const ts = supabaseTs('2026-05-28T15:11:17Z');
    assert.equal(fmt(ts), '3d ago');
  });

  test('timestamp with milliseconds (Supabase real format) parses correctly', () => {
    // Actual Supabase format: "2026-05-31T15:00:23.852" — ms, no Z
    // Use .000ms to get exact 12-minute difference; the key is that .NNN suffix
    // must not prevent the 'Z' normalization or break the UTC parse.
    const ts = '2026-05-31T14:59:17.000'; // exactly 12 min before fixed now, with ms
    const result = fmt(ts);
    assert.notEqual(result, '2h ago', 'Millisecond format must not show "2h ago" due to timezone bug');
    assert.equal(result, '12 min ago', `Millisecond format should parse correctly; got "${result}"`);
  });

  test('timestamp already having Z suffix still works correctly', () => {
    assert.equal(fmt('2026-05-31T14:59:17Z'), '12 min ago');
  });

  test('timestamp with +00:00 suffix works correctly', () => {
    assert.equal(fmt('2026-05-31T14:59:17+00:00'), '12 min ago');
  });

  test('null returns empty string', () => {
    assert.equal(fmt(null), '');
  });

  test('undefined returns empty string', () => {
    assert.equal(fmt(undefined), '');
  });

  test('empty string returns empty string', () => {
    assert.equal(fmt(''), '');
  });

  test('"just now" for timestamps within the last 60 seconds', () => {
    const ts = supabaseTs('2026-05-31T15:11:00Z'); // 17 sec before fixed now
    assert.equal(fmt(ts), 'just now');
  });

  test('timestamps spanning midnight UTC boundary are correct', () => {
    // 14h before 15:11:17 UTC crosses midnight → 01:11:17 UTC
    const ts = supabaseTs('2026-05-31T01:11:17Z');
    assert.equal(fmt(ts), '14h ago');
  });
});

describe('Bug #8 – Timezone regression: 2h offset must not push timestamps across thresholds', () => {
  test('59 min ago stays "59 min ago" (must not become "1h ago" with +2h bias)', () => {
    // 15:11:17 - 59 min = 14:12:17 UTC
    const ts = supabaseTs('2026-05-31T14:12:17Z');
    const result = fmt(ts);
    assert.equal(result, '59 min ago',
      `59 min must not be pushed to "1h ago" by timezone offset; got "${result}"`);
  });

  test('23h ago stays "23h ago" (must not become "1d ago" with +2h bias)', () => {
    // 15:11:17 UTC - 23h = 16:11:17 UTC previous day
    const ts = supabaseTs('2026-05-30T16:11:17Z');
    const result = fmt(ts);
    assert.equal(result, '23h ago',
      `23h must not be pushed to "1d ago" by timezone offset; got "${result}"`);
  });

  test('6d 23h ago stays "6d ago" (must not become "7d ago" / date display)', () => {
    // 6 days 23 hours before fixed now
    const then = new Date(NOW_MS - (6 * 24 + 23) * 3600 * 1000);
    const ts = supabaseTs(then.toISOString());
    const result = fmt(ts);
    assert.equal(result, '6d ago',
      `6d 23h must not be pushed to date format by timezone offset; got "${result}"`);
  });
});
