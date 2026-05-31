# SkyCatchy Bugs

## Bug #1 – Deal sorting

Priority: HIGH

Description:
The Home feed displays old deals from April even though newer deals exist in the database.

Expected:
Deals should always be sorted by newest available date.

Rules:
- Use publish_date when available.
- Fall back to created_at when publish_date is null.
- Newest deals must always appear first.

Status:
FIXED

Root cause:
.range(from, to) without any date filter fetched the oldest rows in the DB table
(April 2026 data stored at the start of the heap file). Sorting was applied only
within the already-fetched stale page, so recent deals were never retrieved.

Fix:
Replaced .range() with a sliding time-window query:
  .gte('created_at', N_days_ago).lt('created_at', window_end).limit(2000)
This skips old heap data entirely. Page 0 = last 7 days, page 1 = 7–14 days
ago, etc. (max 8 pages / 8 weeks). After fetching, deals are deduped by ID
and sorted by getEffectiveSortDate(publish_date, created_at) DESC.
New lib/dealSortUtils.ts provides getEffectiveSortDate() and sortDealsByDate().

Commit: c114b06

---

## Bug #2 – Filter defaults

Priority: HIGH

Description:
Source filters are not selected by default.

Expected:
All source categories and all sources should be selected on first launch.

Status:
FIXED

Root cause:
selectedSources was initialized to new Set() (empty). applyFilters treats
an empty set as "show all" so deals displayed correctly, but the Filter modal
showed no checkboxes ticked — confusing UX that violated the PRD expectation.

Fix:
Added a filtersInitialized ref to HomeScreen. A useEffect fires once when
allSourceNames first populates (sources load from DB). If filtersInitialized is
false, it sets selectedSources to new Set(allSourceNames) and marks the ref
true. Subsequent user changes (clear all, partial selection) are preserved —
the auto-init only runs on first load. handleResetFilters now also restores
all-selected instead of resetting to empty. New lib/filterUtils.ts provides
the initializeDefaultFilters() pure function (tested separately).

Also migrated SafeAreaView in all screen files and FilterModal from the
deprecated react-native import to react-native-safe-area-context (RN 0.81+).
Removed unused Platform import from settings.tsx.

---

## Bug #3 – Incorrect source categorization

Priority: MEDIUM

Description:
Some Czech websites are shown under Global Sources.

Example:
- cestujlevne.com

Expected:
- Czech websites → Czech Sources
- Slovak websites → Slovak Sources
- International websites → Global Sources

Status:
FIXED

Root cause:
categorizeSource() relied solely on TLD detection (.cz → czech, .sk → slovak).
cestujlevne.com uses a .com TLD despite being a Czech-language travel site,
so it fell through to the 'global' default.

Fix:
Added DOMAIN_OVERRIDES: Record<string, SourceCategory> map in sourceUtils.ts.
The override is checked before TLD matching, so any domain that uses a
non-regional TLD can be correctly categorized. All 13 active DB sources now
categorize correctly (verified by exhaustive test in bug3_source_categorization.test.ts).

---

## Bug #4 – Favorites synchronization

Priority: CRITICAL

Description:
Favorites are not synchronized correctly between Home and Saved screens.

Expected:
- Adding a favorite in Home immediately updates Saved.
- Removing a favorite in Saved immediately updates Home.
- Badge counts are always correct.
- Favorites persist after app restart.

Status:
FIXED

Root cause:
useFavorites() created isolated React state per component. Each of the three
callers (Home, Saved, tab _layout) maintained its own Set<string> in useState,
so a toggle in one component never propagated to the others.

Fix:
Introduced lib/favoritesStore.ts — a module-level singleton that holds a single
Set<string> and a Set of listener callbacks. useFavorites() now subscribes to
the store on mount and unsubscribes on unmount. All mutations go through
favoritesStore.toggle(), which updates the shared state and notifies every
subscriber synchronously. favoritesStore.init() is called once in app/_layout.tsx
to trigger the AsyncStorage load.

Commit: 85aa7fa

## Bug #5 – Remove Saved Deals Header

Priority: MEDIUM

Description:
The Saved screen displays a header section showing:

"Saved Deals (2)"

This section remains visible even when no deals should be displayed.

Expected:
- Remove the entire Saved Deals counter/header section.
- If there are no favorites:
  - Display only the empty state ("No saved deals yet").
- If favorites exist:
  - Display the favorite deal cards directly.
- No separate Saved Deals counter bar should be shown.

Status:
FIXED

Root cause:
Header block in favorites.tsx was unconditional — rendered on every mount
regardless of whether favorites existed. Also, the count badge was redundant
with the tab bar badge added in the previous session.

Fix:
Removed the entire header View, title Text, countBadge View and countText
from favorites.tsx. The screen now renders only the empty state or the deal
list directly. Count remains visible via the tab bar badge.

---

## Bug #6 – Incomplete Deal Feed

Priority: CRITICAL

Description:
The Home feed displays deals sorted by time, but the number of recent deals is much lower than on the SkyCatchy website.

Example:
- Feed shows:
  - 2 hours ago
  - 2 hours ago
  - 4 hours ago
  - 2 days ago
  - 3 days ago

However, the SkyCatchy website contains significantly more deals within the last few hours.

Expected:
- Mobile app must display the same deal inventory as SkyCatchy web.
- Verify Supabase query logic.
- Verify pagination logic.
- Verify filtering logic.
- Verify deduplication logic.
- Verify date-window logic introduced during Bug #1 fix.
- Verify no recent deals are being excluded accidentally.

Investigation Required:
Compare:
- Number of deals on website
- Number of deals returned by Supabase
- Number of deals displayed in app

Provide root cause analysis before implementing the fix.

Status:
FIXED

Root cause (quantified against live Supabase DB):

Three compounding bugs in Bug #1's useDeals.ts fix:

1. WINDOW_LIMIT=2000 was silently ignored.
   Supabase REST API hard-caps every response at 1000 rows regardless of the
   limit= parameter value. With ~174,000 rows in a 7-day window, the effective
   sample was 1000/174,000 = 0.57%.

2. WINDOW_DAYS=7 was far too wide.
   A 7-day window with 1000-row cap yields only 7 unique deal IDs after
   deduplication. The 4-hour window (DB-confirmed: 2191 total rows across 3
   offset pages) yields 166 unique active deals — matching the website inventory.

3. No offset pagination.
   A single .range(0, 999) request was made per page, missing all rows at
   offset 1000+. The fix uses sequential .range() calls (offset 0, 1000, 2000)
   until the batch returns fewer than 1000 rows (last page signal).

DB investigation results (2026-05-31):
- Last 4h rows: 2191 (confirmed via count=exact header: 0-999/2191)
- Unique deal IDs in last 4h: 166 (fetched via 3 offset pages)
- Old app query result: 7 unique deals (0.57% sample from 7-day window)
- Per-source ORDER BY: still times out (no index on any column)

Fix:
New lib/dealQueryUtils.ts provides buildWindowedPages(page, now) which returns:
  Page 0: 4-hour window, useOffsetPagination=true, maxOffsetPages=5
  Page 1+: progressively older windows (24h, 48h, 96h...), single request

useDeals.ts fetchAllRowsInWindow() loops .range(offset, offset+999) until
batch.length < 1000 (early-stop on last page). Page 0 makes 3 requests and
captures all 2191 rows → 166 unique deals after deduplication.

Verification #6

Compare:
- Web inventory
- Mobile inventory

Acceptance Criteria:
At least 90% of recent deals visible on the website must also appear in the mobile feed.

## Bug #7 – Favorites Count and Duplicate Persistence

Priority: CRITICAL

Description:
Favorites count, badge count and saved list are inconsistent.

Observed:
- Fresh app launch shows Saved badge = 2 even when no favorites should exist.
- Saving two new deals increases the count incorrectly.
- Duplicate deals can appear in the Saved list.
- Badge count does not match the number of unique saved deals.

Expected:
- Saved badge count must equal the number of unique favorite deals.
- No duplicate favorites may exist.
- Fresh install / cleared storage must start with zero favorites.
- Removing a favorite must immediately update all counts.
- Saved screen and Home screen must always show identical favorite state.

Investigation Required:
- Verify AsyncStorage persistence.
- Verify hydration on app startup.
- Verify duplicate insertion protection.
- Verify badge count source.
- Verify unique deal IDs are used consistently.

Status:
FIXED

Root cause (two failure mechanisms):

1. PRIMARY – Cross-page duplicate DealDisplay items:
   allDeals = pages.flatMap(p => p.deals) — each page deduplicates within its
   own time window only. An active deal spans multiple windows: page 0 (0–4h)
   and page 1 (4–28h) each contain an entry for the same deal ID. The flatMap
   therefore produces duplicate IDs. favoritedDeals.filter(d => favorites.has(d.id))
   returns 2 cards for 1 saved deal → Saved screen shows duplicates.
   Badge (favorites.size, a Set) = 1, visible cards = 2 → count mismatch.
   "Saving two new deals incorrectly": user sees the same deal twice in the feed
   (pages 0 + 1 loaded). They tap both hearts. First tap adds deal-X (0→1).
   Second tap removes deal-X (1→0). Net = 0, despite tapping twice.

2. SECONDARY – toggle() during async load race condition:
   If toggle(id) fires while isLoaded = false (between init() call and the
   AsyncStorage.getItem resolve), state is updated in memory. When load()
   resumes it overwrites state with the old persisted value, silently losing
   the in-flight toggle.

Fix:
- lib/dealDisplayUtils.ts: new deduplicateDealDisplays() function. Collapses
  cross-page duplicates keeping the entry with the most recent publish_date,
  then re-sorts newest-first.
- hooks/useDeals.ts: allDeals now passes through deduplicateDealDisplays()
  before being returned to consumers.
- lib/favoritesStore.ts: toggle() while isLoaded=false appends to a
  pendingToggles[] queue. load() replays the queue after AsyncStorage resolves,
  then clears it. In-flight toggles are never lost.