-- ============================================================
-- Migration 002: Ensure unique constraint on deals.link
-- Safe to run multiple times (idempotent)
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- Ensure unique index on link (required for upsert onConflict: 'link')
-- This may already exist — CREATE INDEX IF NOT EXISTS is safe either way.
CREATE UNIQUE INDEX IF NOT EXISTS idx_deals_link_unique ON deals (link);

-- ============================================================
-- Verification queries — run these to confirm the DB is healthy
-- ============================================================

-- 1. Total deals in DB
-- SELECT COUNT(*) AS total_deals FROM deals;

-- 2. Deals by age bucket
-- SELECT
--   CASE
--     WHEN created_at >= NOW() - INTERVAL '4 hours'  THEN '0-4h'
--     WHEN created_at >= NOW() - INTERVAL '1 day'    THEN '4h-1d'
--     WHEN created_at >= NOW() - INTERVAL '3 days'   THEN '1d-3d'
--     WHEN created_at >= NOW() - INTERVAL '7 days'   THEN '3d-7d'
--     ELSE 'older than 7d'
--   END AS age_bucket,
--   COUNT(*) AS count
-- FROM deals
-- GROUP BY 1
-- ORDER BY 1;

-- 3. Deals by source (last 7 days)
-- SELECT source, COUNT(*) AS deals
-- FROM deals
-- WHERE created_at >= NOW() - INTERVAL '7 days'
-- GROUP BY source
-- ORDER BY deals DESC;

-- 4. Check for duplicate links
-- SELECT link, COUNT(*) AS cnt
-- FROM deals
-- GROUP BY link
-- HAVING COUNT(*) > 1
-- ORDER BY cnt DESC
-- LIMIT 20;

-- 5. Newest and oldest deal
-- SELECT MIN(created_at) AS oldest, MAX(created_at) AS newest, COUNT(*) AS total FROM deals;
