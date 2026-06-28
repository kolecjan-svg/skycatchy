# SkyCatchy — Database Cleanup & Automation

## How cleanup works

Deals older than **7 days** are deleted automatically every night at 02:00 UTC.

The cleanup runs in two steps, in this order:
1. Deletes `deal_translations` rows belonging to old deals (FK safety)
2. Deletes `deals` rows where `created_at < NOW() - 7 days`

**Safety guarantees:**
- Never deletes deals newer than 7 days (enforced both in SQL and in the script)
- Never deletes deals with `created_at = NULL` (age unknown → keep)
- Never touches the `sources` table
- Orphan translations are removed after deals are deleted

The logic lives in the PostgreSQL function `cleanup_old_deals()` defined in
`supabase/migrations/001_performance_and_cleanup.sql`.

---

## How GitHub Actions works

Two workflows run automatically:

| Workflow | Schedule | What it does |
|---|---|---|
| `importer.yml` | Every 15 minutes | Fetches all active RSS feeds, upserts new deals |
| `cleanup.yml` | Daily at 02:00 UTC | Deletes deals older than 7 days |

Both workflows can also be triggered manually from the **GitHub Actions** tab
(Actions → select workflow → Run workflow).

### Required GitHub Secrets

Go to: **Repository → Settings → Secrets and variables → Actions → New repository secret**

| Secret name | Value |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL (e.g. `https://xxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (used only by cleanup) |

---

## How to change the retention period

**Default:** 7 days (minimum enforced, cannot be set lower).

### Option A — change permanently
Edit `cleanup.yml` and change the `RETENTION_DAYS` default:
```yaml
default: '14'   # keep deals for 14 days
```

### Option B — one-off manual run
Go to Actions → Database Cleanup → Run workflow → set `retention_days` input.

---

## Running everything manually

All scripts live in `importer/src/`. Run from that directory:

```bash
cd importer/src

# Import all RSS feeds now
npm start

# Delete deals older than 7 days
npm run cleanup

# Back-fill article content for existing deals
npm run backfill
```

Requires a `.env` file in `importer/` (one level up from `src/`):
```
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## Running the SQL migration

The migration in `supabase/migrations/001_performance_and_cleanup.sql` must be run
once in Supabase:

1. Open **Supabase Dashboard → SQL Editor**
2. Paste the contents of the file
3. Click **Run**

The migration is idempotent — safe to run multiple times.

It creates:
- `idx_deals_created_at` — speeds up time-window queries on every app load
- `idx_deals_publish_date` — speeds up display sorting
- `idx_deals_source` — speeds up source filter
- `idx_deals_lang` — speeds up language filter
- `cleanup_old_deals(retention_days)` — PostgreSQL function called by cleanup script
