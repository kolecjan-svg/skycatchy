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
OPEN

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