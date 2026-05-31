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