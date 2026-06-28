-- ============================================================
-- Migration 001: Performance indexes + cleanup function
-- Safe to run multiple times (all statements are idempotent)
-- Run in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ------------------------------------------------------------
-- 1. PERFORMANCE INDEXES
-- ------------------------------------------------------------

-- Primary query filter: time-window reads use this on every app load
CREATE INDEX IF NOT EXISTS idx_deals_created_at
  ON deals (created_at DESC);

-- Secondary sort used for display ordering
CREATE INDEX IF NOT EXISTS idx_deals_publish_date
  ON deals (publish_date DESC);

-- Filter by source (filter modal)
CREATE INDEX IF NOT EXISTS idx_deals_source
  ON deals (source);

-- Filter by language
CREATE INDEX IF NOT EXISTS idx_deals_lang
  ON deals (lang);

-- Note: link unique index already exists (required by upsert onConflict: 'link').
-- Recreating it would cause an error, so we skip it here.

-- ------------------------------------------------------------
-- 2. CLEANUP FUNCTION
-- Deletes deals older than `retention_days` (default 7) and
-- their orphan translations. Never touches sources table.
-- Safety guard: never deletes deals with NULL created_at
-- (those have unknown age and must be preserved).
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION cleanup_old_deals(retention_days int DEFAULT 7)
RETURNS TABLE (deals_deleted bigint, translations_deleted bigint)
LANGUAGE plpgsql
AS $$
DECLARE
  cutoff        timestamptz;
  d_deleted     bigint := 0;
  t_deleted     bigint := 0;
BEGIN
  -- Safety: refuse to delete anything newer than 7 days regardless of argument
  retention_days := GREATEST(retention_days, 7);
  cutoff := NOW() - (retention_days || ' days')::interval;

  -- Step 1: remove translations belonging to old deals first (FK safety)
  DELETE FROM deal_translations
  WHERE deal_id IN (
    SELECT id FROM deals
    WHERE created_at IS NOT NULL
      AND created_at < cutoff
  );
  GET DIAGNOSTICS t_deleted = ROW_COUNT;

  -- Step 2: delete old deals
  DELETE FROM deals
  WHERE created_at IS NOT NULL
    AND created_at < cutoff;
  GET DIAGNOSTICS d_deleted = ROW_COUNT;

  -- Step 3: clean up any remaining orphan translations
  DELETE FROM deal_translations
  WHERE deal_id NOT IN (SELECT id FROM deals);

  RETURN QUERY SELECT d_deleted, t_deleted;
END;
$$;
