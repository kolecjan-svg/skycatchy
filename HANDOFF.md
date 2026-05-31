# HANDOFF.md – SkyCatchy Mobile

Generated: 2026-05-31
RALF iterations completed: 4 (Blocks 1, 2, 3 + Visual Polish / Final Validation)
Test suite: 62/62 PASS across 14 suites
TypeScript: CLEAN

---

## Project Status

**READY FOR PRODUCTION** (pending Expo build + App Store submission)

All RALF phases complete. 62/62 tests pass. TypeScript clean. Real Supabase data confirmed (GATE 2c PASSED).

---

## How to Run

### Prerequisites

```bash
# 1. Install watchman (required – Metro crashes without it on macOS)
brew install watchman

# 2. Install dependencies
cd skycatchy2.0
npm install --legacy-peer-deps

# 3. Verify .env exists (NOT in git – create from .env.example)
# Copy the anon key from ~/skycatchy/.env.local (NEXT_PUBLIC_SUPABASE_EXTERNAL_ANON_KEY)
cp .env.example .env
# Edit .env with real values
```

### Start development server

```bash
npx expo start
# Then press:
#   i  → iOS Simulator
#   a  → Android Emulator
#   w  → Web browser (requires react-native-web installed)
# Or scan QR code with Expo Go on your device
```

### Run tests

```bash
npm test           # All 62 unit tests
npm run typecheck  # TypeScript check
```

---

## Architecture

| Layer | Tech | Notes |
|---|---|---|
| Framework | React Native + Expo SDK 51 | |
| Navigation | Expo Router v3 (file-based) | Tab: Home, Saved, Settings |
| Data fetching | @tanstack/react-query v5 | Caching, pagination, background refresh |
| Database | Supabase PostgreSQL | Read-only (anon key) |
| Local storage | AsyncStorage | Favorites persistence |
| Localization | expo-localization | Device language → translation lookup |
| External links | Linking.openURL | Opens deals in system browser |

---

## Data Source

**Supabase project:** `klluwpkcsqtnajtikpji.supabase.co`

### Key database facts

- **deals table** — Re-inserted every ~15 min per deal (polling architecture). Same `id` appears thousands of times with different `created_at`. App deduplicates by ID keeping the most recent `created_at`.
- **publish_date** — NULL for all rows. App uses `created_at` as the display date fallback.
- **ORDER BY** — No index on `created_at` or `publish_date`. All ORDER BY causes statement timeout. App fetches without ORDER BY and sorts client-side after dedup.
- **deal_translations** — No foreign key constraint. App fetches separately via `.in('deal_id', ids)`.

### Active sources (13)

Czech: cestujlevne.com, honzovyletenky.cz, jaknaletenky.cz, levnocestovani.cz, obletsvet.cz, zaletsi.cz
Slovak: letenkyzababku.sk
Global: fly4free.com, flynous.com, holidaypirates.com, secretflying.com, theflightdeal.com, travelfree.info

---

## Recommended Database Optimizations

Run these once in the **Supabase SQL Editor** to enable proper sorting:

```sql
-- 1. Enable ORDER BY created_at without timeout
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_created_at
  ON deals (created_at DESC);

-- 2. Deduplicated view (most recent snapshot per deal_id)
CREATE OR REPLACE VIEW unique_deals AS
  SELECT DISTINCT ON (id) *
  FROM deals
  ORDER BY id, created_at DESC;
```

After adding the index, update `hooks/useDeals.ts` line 58:
```ts
// Change from .range(from, to)
// To:
.order('created_at', { ascending: false })
.range(from, to)
```

---

## Feature Implementation Status

| Feature | Status | Notes |
|---|---|---|
| Deals Feed | ✅ Complete | Infinite scroll, pull-to-refresh, animated FAB |
| Search | ✅ Complete | Real-time, case-insensitive, title + description |
| Source Filters | ✅ Complete | Grouped Czech/Slovak/Global, collapsible, tri-state |
| Favorites | ✅ Complete | AsyncStorage, badge on tab icon |
| Settings | ✅ Complete | Contact Support active; others "Coming soon" |
| Translations | ✅ Complete | Device lang → deal_translations → fallback |
| Loading states | ✅ Complete | Staggered skeleton cards with pulse animation |
| Error states | ✅ Complete | Retry button, clear message |
| Empty states | ✅ Complete | Contextual per screen |
| HTML decoding | ✅ Complete | Entities decoded, jQuery/scripts stripped |
| Image fallback | ✅ Complete | onError → airplane icon placeholder |

---

## Known Issues & Workarounds

| Issue | Workaround |
|---|---|
| Deals sorted oldest-first | Add `idx_deals_created_at` index (see above) |
| Expo dev server needs watchman | `brew install watchman` |
| npm install needs `--legacy-peer-deps` | react-native-screens peer conflict with RN 0.74 |

---

## Future Features (from PRD)

- Push notifications (Expo Notifications + Supabase)
- User accounts (Google/Apple sign-in)
- Favorites sync to Supabase (currently local only)
- Affiliate integrations
- Premium subscription tier
- Additional deal sources

---

## Contact

- Support email: info@skycatchy.com
- Web platform: www.skycatchy.com
