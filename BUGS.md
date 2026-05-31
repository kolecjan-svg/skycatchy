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
OPEN

---

## Bug #2 – Filter defaults

Priority: HIGH

Description:
Source filters are not selected by default.

Expected:
All source categories and all sources should be selected on first launch.

Status:
OPEN

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