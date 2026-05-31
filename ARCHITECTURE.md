# ARCHITECTURE.md – SkyCatchy Mobile

## Tech Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | React Native + Expo SDK 51 | PRD requirement |
| Navigation | Expo Router v3 (file-based) | Tab navigation, deep links future-ready |
| Data fetching | @tanstack/react-query v5 | Caching, pagination, background refresh |
| Database client | @supabase/supabase-js v2 | PRD requirement |
| Local storage | @react-native-async-storage/async-storage | Favorites persistence |
| Localization | expo-localization | Device language detection |
| External links | expo-linking | Open deals in browser |
| Language | TypeScript (strict) | PRD requirement |

## Directory Structure

```
skycatchy/
├── app/                        # Expo Router screens
│   ├── (tabs)/
│   │   ├── _layout.tsx         # Tab bar config
│   │   ├── index.tsx           # Home – Deals Feed
│   │   ├── favorites.tsx       # Favorites screen
│   │   └── settings.tsx        # Settings screen
│   └── _layout.tsx             # Root layout
├── components/
│   ├── DealCard.tsx            # Deal card component
│   ├── DealList.tsx            # FlatList with pagination
│   ├── FilterModal.tsx         # Bottom sheet filter
│   ├── SearchBar.tsx           # Inline search input
│   ├── SkeletonCard.tsx        # Loading skeleton
│   └── EmptyState.tsx          # Empty / error states
├── lib/
│   ├── supabase.ts             # Supabase client (singleton)
│   └── queryClient.ts          # React Query client config
├── hooks/
│   ├── useDeals.ts             # Paginated deals query
│   ├── useSources.ts           # Sources query for filters
│   ├── useFavorites.ts         # AsyncStorage favorites
│   └── useTranslation.ts       # Translation lookup logic
├── types/
│   └── index.ts                # Deal, Source, Translation types
├── constants/
│   └── theme.ts                # Colors, spacing, fonts
├── __tests__/
│   ├── useDeals.test.ts
│   ├── useFavorites.test.ts
│   ├── DealCard.test.tsx
│   └── FilterModal.test.tsx
├── .env                        # EXPO_PUBLIC_SUPABASE_URL + KEY (gitignored)
├── .env.example                # Template with placeholders
├── ARCHITECTURE.md
├── AGENTS.md
├── DEV-LOG.md
└── HANDOFF.md
```

## Feature Blocks

### Block 1 – Deals Feed + Supabase Integration
- Supabase client setup
- TypeScript types for deals / deal_translations / sources
- `useDeals` hook: paginated query, sort by publish_date DESC
- `useTranslation` hook: device lang → deal_translations → fallback
- DealCard component: image, title, 3-line preview, time, source, heart
- DealList: FlatList + infinite scroll + pull-to-refresh + FAB
- Skeleton loading state
- Error state with retry
- Empty state

### Block 2 – Search + Filter
- SearchBar: real-time keyword filter (client-side on loaded pages, server-side for full search)
- FilterModal: bottom sheet with source groups
- `useSources` hook: dynamic from sources table
- Source grouping: Czech / Slovak / Global (by lang field on deals or source metadata)
- Multi-select with "All sources" master toggle
- Selected count badges per group

### Block 3 – Favorites + Settings
- `useFavorites` hook: AsyncStorage CRUD
- Heart icon toggle on DealCard (both feed and favorites)
- Favorites screen: filtered deal list + empty state
- Settings screen: Contact Support (mailto), Coming Soon items

## Data Flow

```
Supabase PostgreSQL
    ↓ (supabase-js v2, HTTPS, anon key)
lib/supabase.ts (singleton client)
    ↓
hooks/useDeals.ts (React Query, paginated)
    ↓
hooks/useTranslation.ts (expo-localization → deal_translations → fallback)
    ↓
components/DealList.tsx (FlatList)
    ↓
components/DealCard.tsx (display unit)
    ↓
expo-linking (external browser on tap)
```

## Supabase Integration Strategy

### Credentials
- `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env`
- Never hardcoded in source files

### Deals query
```ts
supabase
  .from('deals')
  .select('*, deal_translations(*)')
  .order('publish_date', { ascending: false })
  .range(from, to)           // cursor pagination, 20 per page
```

### Translation lookup
1. Detect `Localization.locale` (e.g. "cs", "sk", "en")
2. Find matching row in `deal_translations` where `lang = deviceLang`
3. If found: use translated `name` and `description`
4. If not found: use original `deals.name` and `deals.description`

### Source filter
```ts
supabase.from('sources').select('*').eq('active', true)
```
Grouped client-side by inferred category (Czech TLDs: letadlem.cz etc., Slovak: TLDs .sk, Global: remainder).

## Database Schema Reference

### deals
id | name | description | link | image | source | publish_date | created_at | lang

### deal_translations
id | deal_id | lang | name | description | created_at

### sources
id | name | rss_url | active | created_at

## Color System
```ts
yellow:  '#FFD60A'   // highlights, active icons
orange:  '#FF7A00'   // primary interactions, CTAs
white:   '#FFFFFF'   // backgrounds
dark:    '#1A1A1A'   // primary text
gray:    '#8E8E93'   // secondary text, meta
lightBg: '#F2F2F7'   // card backgrounds, sections
border:  '#E5E5EA'   // dividers, card borders
```

## Implementation Roadmap

| Phase | Activity |
|---|---|
| 0 | Setup: Expo project, dependencies, env, Supabase client, types |
| 1 | Block 1 TDD: tests → implementation → RALF review → fix |
| 2 | Block 2 TDD: tests → implementation → RALF review → fix |
| 3 | Block 3 TDD: tests → implementation → RALF review → fix |
| 4 | Visual Polish + Final Validation + HANDOFF.md |
