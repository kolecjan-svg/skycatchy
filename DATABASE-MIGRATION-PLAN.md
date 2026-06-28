# DATABASE-MIGRATION-PLAN

## Problem Summary

The `deals` table has 860,164 rows but only 5,297 are unique deals (99.38% duplicates).
The external importer polls 13 RSS feeds every 15 minutes and performs a plain `INSERT`
using a stable, deterministic `deal.id` on each cycle. No `UNIQUE` constraint exists on
`deals.id`, so every cycle adds a new row with the same `id` and a fresh `created_at`.

At 15-minute intervals: 860,164 ÷ 5,297 ≈ 162 copies per deal ≈ ~40 hours of accumulation.

Supabase is showing "EXCEEDING USAGE LIMITS". Estimated table size: ~600 MB (free tier cap: 500 MB).

---

## Goals

- Reduce table size from ~600 MB to ~4 MB (99.4% reduction)
- Add `UNIQUE(id)` constraint to prevent future duplicates
- Switch importer from INSERT to UPSERT
- Zero app downtime, no data loss, full rollback available

---

## Pre-Migration Checks

Before running any SQL, verify:

- [ ] Confirm `deals.id` is stable across imports (not a random UUID per insert)
- [ ] Check `deal_translations` for duplicate `deal_id` entries (may need separate cleanup)
- [ ] Confirm the external importer repo/service is accessible and can be deployed immediately after Phase 3
- [ ] Confirm a maintenance window where import errors for a few minutes are acceptable

---

## Phase 1 — Prepare (zero downtime, zero risk)

### 1a. Backup

```sql
CREATE TABLE deals_backup AS SELECT * FROM deals;
```

Verify row count matches:

```sql
SELECT COUNT(*) FROM deals_backup;
-- Expected: 860,164 (or current total)
```

### 1b. Audit deal_translations for duplicate deal_id entries

```sql
SELECT deal_id, COUNT(*)
FROM deal_translations
GROUP BY deal_id
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC
LIMIT 20;
```

If duplicates exist in `deal_translations`, plan a separate cleanup using the same
strategy as Phase 2 (keep most recent `created_at` per `deal_id`).

### 1c. Add index on created_at (enables fast ORDER BY for cleanup and app queries)

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_created_at
  ON deals (created_at DESC);
```

This runs without locking the table. Wait for it to complete before proceeding.

---

## Phase 2 — Clean duplicate rows

Keeps the row with the most recent `created_at` per `id`. Deletes all others.

```sql
DELETE FROM deals
WHERE ctid NOT IN (
  SELECT DISTINCT ON (id) ctid
  FROM deals
  ORDER BY id, created_at DESC
);
```

Expected: deletes 854,867 rows, retains 5,297.

Verify:

```sql
SELECT COUNT(*) FROM deals;
-- Expected: ~5,297

SELECT COUNT(DISTINCT id) FROM deals;
-- Must equal COUNT(*) above (no remaining duplicates)
```

**If the table is too large to delete in one statement**, batch by time window:

```sql
-- Example: delete duplicates for rows older than 7 days first
DELETE FROM deals
WHERE created_at < NOW() - INTERVAL '7 days'
  AND ctid NOT IN (
    SELECT DISTINCT ON (id) ctid
    FROM deals
    WHERE created_at < NOW() - INTERVAL '7 days'
    ORDER BY id, created_at DESC
  );
-- Repeat for remaining windows until all duplicates are gone
```

---

## Phase 3 — Add UNIQUE constraint

**Run this immediately before deploying the importer update (Phase 4).**

```sql
ALTER TABLE deals ADD CONSTRAINT deals_id_unique UNIQUE (id);
```

This will fail if any duplicates remain — recheck Phase 2 output before running.

After this point, any import cycle using plain `INSERT` with a known `id` will throw
a unique violation error. Coordinate Phase 4 deployment to minimize this window.

---

## Phase 4 — Update the importer (external repo)

**Deploy in the same window as Phase 3.**

Change the importer from:

```js
await supabase.from('deals').insert(deals)
```

To:

```js
await supabase.from('deals').upsert(deals, { onConflict: 'id' })
```

The `upsert` will update `name`, `description`, `link`, `image`, `publish_date`, `source`,
and `lang` if the deal already exists. `created_at` is set only on the initial insert
(do not include it in the upsert payload to preserve the original insert timestamp).

Verify one import cycle completes without errors after deployment.

---

## Phase 5 — Post-migration cleanup (after 48h stable)

### 5a. Drop the backup table

```sql
DROP TABLE deals_backup;
```

### 5b. Optional: add index on id for translation lookups

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_id
  ON deals (id);
```

### 5c. Optional: enable ORDER BY in the mobile app

After adding `idx_deals_created_at` (Phase 1c), the app's `ORDER BY created_at DESC`
no longer times out. Update [hooks/useDeals.ts](hooks/useDeals.ts) line 82 to add
`.order('created_at', { ascending: false })` before `.range(...)` and reduce
`MAX_OFFSET_PAGES_RECENT` from 5 to 1 (duplicates no longer exist, one page is enough).

---

## Rollback Plan

| Phase | If it goes wrong | Rollback |
|---|---|---|
| Phase 2 | Wrong rows deleted | `INSERT INTO deals SELECT * FROM deals_backup` |
| Phase 3 | Constraint causes issues | `ALTER TABLE deals DROP CONSTRAINT deals_id_unique` |
| Phase 4 | Importer deploy fails | Revert importer to INSERT; drop constraint; restore from backup |

The backup table (Phase 1a) is the safety net for all phases.

---

## Estimated Impact

| Metric | Before | After |
|---|---|---|
| Total rows | 860,164 | ~5,297 |
| Rows removed | — | 854,867 (99.38%) |
| Estimated table size | ~600 MB | ~3.7 MB |
| Storage freed | — | ~596 MB (99.4%) |
| Page 0 fetch requests (mobile app) | 3 × 1,000 rows | 1 × ~14 rows |
| Supabase usage status | EXCEEDING LIMITS | Well within free tier |

---

## Mobile App Impact

No code changes required. The three client-side deduplication layers in the app
([hooks/useDeals.ts:30-39](hooks/useDeals.ts#L30-L39),
[lib/dealDisplayUtils.ts:18-29](lib/dealDisplayUtils.ts#L18-L29),
[lib/dealQueryUtils.ts](lib/dealQueryUtils.ts)) will become no-ops but remain correct.
Favorites, translations, and all queries continue to work using the same `id` values.

---

## Migration Order Summary

```
Phase 1a  CREATE TABLE deals_backup             (anytime, no risk)
Phase 1b  Audit deal_translations               (anytime, no risk)
Phase 1c  CREATE INDEX CONCURRENTLY             (anytime, no lock)
Phase 2   DELETE duplicates                     (high write load, app unaffected)
Phase 3   ALTER TABLE ADD CONSTRAINT            (brief lock, then importer will error)
Phase 4   Deploy importer UPSERT                (immediately after Phase 3)
Phase 5   DROP TABLE deals_backup               (48h after Phase 4 is stable)
```

---

## Status

READY — pending importer access and maintenance window confirmation.
