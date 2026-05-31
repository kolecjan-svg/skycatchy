# Product Requirements Document (PRD) – SkyCatchy Mobile App

## 1. Overview

SkyCatchy Mobile is an iOS and Android application that extends the existing SkyCatchy web platform into a native mobile experience.

The app aggregates discounted flight deals from multiple external websites and presents them in a fast, clean, mobile-first interface.

### Goals

- Enable users to discover flight deals quickly on mobile  
- Reuse existing backend and data aggregation logic  
- Provide a smooth and intuitive user experience  
- Aggregate all flight deals in one place  

### Value Proposition

Find the best flight deals in seconds, anytime and anywhere.

---

## 2. Reference Implementation

- Web app: www.skycatchy.com  

### Instructions

- Use the web app as a functional reference  
- Do not copy desktop layout  
- Optimize UI for mobile and touch interaction  

---

## 3. Target Users

- Budget travelers  
- Digital nomads  
- Users searching for cheap flights from Europe  
- Mobile-first users  
- Users without time or language skills to browse multiple deal websites  

---

## 4. Feature Blocks

### Block 1: Deals Feed

- Display a scrollable list of flight deals  

Each deal includes:

- Destination image (preferably from original source)  
- Header (imported from source website)  
- First 3 rows of text (truncated preview)  
- Publication time  
- Source (e.g. fly4free.com)  

### Behavior

- Infinite scroll (auto loading more deals)  
- Pull-to-refresh  
- Scroll-to-top button (floating action button)  

### Interaction

- Entire deal card is tappable  
- Tap opens deal in external browser  

---

### Block 2: Filtering and Search

#### 1. Top Bar Layout

- No logo and no title displayed  
- Clean top bar containing:
  - Search input field  
  - Filter button  

---

#### 2. Search

- Search field placed at the top of the screen  
- Allows keyword search across deals  
- Instant filtering (real-time)  

---

#### 3. Filters (Sources)

- Hierarchical structure:

  - All sources  
  - Czech sources  
  - Slovak sources  
  - Global sources  
  - Individual websites  

#### Behavior

- "All sources" selects everything  
- Category selection selects all items inside  
- Multi-select supported  
- Real-time filtering (no reload)  

#### UI

- Checkbox list  
- Grouped categories  
- Collapsible sections  
- Selected count per category (e.g. "Czech sources (3)")  
- Entire row clickable  

#### Access

- Filter button opens modal / bottom sheet  

---

### Block 3: Favorites

#### Interaction

- Heart icon on each deal card  
- Two states:
  - Empty → not saved  
  - Filled → saved  

- Tap toggles instantly  

#### Behavior

- Stored locally (MVP)  
- Accessible via dedicated screen  

#### Empty State

- "No saved deals yet"  
- Optional helper text  
- Optional CTA: "Browse deals"  

#### Future

- Sync with user account (Supabase)  

---

### Block 4: Settings

#### 1. Account

- Login / Sign up  
- Log out  
- Basic user info (email, name)  

#### 2. Preferences

- Notifications (future)  
- Language (future)  

#### 3. Support

- Contact Support  
  - Opens native email client  
  - Pre-filled: info@skycatchy.com  

#### 4. Legal

- Terms of Service  
- Privacy Policy  

#### 5. App Info

- App version  
- About SkyCatchy  

#### Behavior

- Only "Contact Support" is active in MVP  
- All other items visible but inactive ("Coming soon")  

---

## 5. Navigation

- Bottom tab navigation:

  - Home (Deals Feed)  
  - Favorites  
  - Settings  

- No detail screen  
- External browser used for deal viewing  

---

## 6. User Flow

1. User opens app  
2. Lands on Deals Feed  
3. Scrolls deals  
4. Uses search or filters  
5. Saves deals (optional)  
6. Taps deal  
7. Opens in browser  
8. Returns and continues browsing  

---

## 7. Technical Requirements

### Frontend

- React Native with Expo  
- Optimized for performance  

### Backend

- Supabase  
  - PostgreSQL  
  - Auth (Google / Apple)  
  - Storage  

### Data

- Reuse existing aggregation  
- Tables:
  - deals  
  - deal_translations  

### Storage

- Favorites stored locally (MVP)  

### API

- Supabase client  
- Pagination support  

### Notifications (future)

- Expo Notifications  
- Stored in Supabase  

### Database Integration

The application must connect directly to the existing Supabase project.

The application must not use:

- Mock data
- Placeholder deals
- Hardcoded arrays
- Generated sample content

All displayed deal content must originate from Supabase.

If Supabase configuration is unavailable, implementation must stop and request the missing configuration instead of generating fake content.

### Existing Database Structure

#### deals

- id
- name
- description
- link
- image
- source
- publish_date
- created_at
- lang

#### deal_translations

- id
- deal_id
- lang
- name
- description
- created_at

#### sources

- id
- name
- rss_url
- active
- created_at

### Feed Data Source

The Deals Feed must:

- Load data directly from the deals table
- Sort by publish_date DESC
- Display newest deals first
- Support pagination
- Support pull-to-refresh
- Support infinite scrolling

### Translation Logic

1. Detect device language
2. Search deal_translations for matching language
3. Display translated content when available
4. Fallback to original content when translation is unavailable

### Source Filtering

Source filters should be generated dynamically from database content.

The application should use:

- source values from deals
or
- sources table

Do not hardcode source names.

### Architecture Requirements

Before implementation begins:

1. Analyze the complete PRD
2. Analyze database structure
3. Create ARCHITECTURE.md
4. Define screen hierarchy
5. Define data flow
6. Define Supabase integration strategy
7. Define implementation roadmap

Only after architecture planning should implementation begin.


---

## 8. UI and UX Requirements

### Design Principles

- Clean, modern, minimal  
- Mobile-first  
- Content-focused  
- iOS-inspired design  
- Brand colors: yellow + orange  

---

### Design References

The application should take inspiration from:

- Skyscanner
- Flighty
- Airbnb
- Revolut

Avoid:

- Generic AI-generated layouts
- Default Expo starter appearance
- Placeholder imagery
- Placeholder content

The application should feel production-ready from the first version.

---

### Layout

- Top bar:
  - Search input  
  - Filter button  
  - No logo and no title  

- Main:
  - Scrollable deal list  

- Floating:
  - Scroll-to-top button  

---

### Deal Card

- Image  
- Header (main title)  
- Preview text (max 3 lines)  
- Meta:
  - Time  
  - Source  

- Heart icon (top-right)  

---

### Visual Hierarchy

- Header → most prominent  
- Image → supporting visual  
- Text preview → secondary  
- Meta → subtle  

---

### Colors

- Yellow (#FFD60A) → highlights  
- Orange (#FF7A00) → interactions  
- White/light background  
- Dark text  

---

### Interactions

- Tap feedback  
- Smooth scrolling  
- Pull-to-refresh  
- Modal filters  

- Tap on card:
  - Opens external browser  

---

### States

- Loading → skeleton  
- Empty → message + reset filters  
- Error → retry option  

---

## 9. Non-Functional Requirements

- Fast load time (<2s perceived)  
- Smooth performance  
- Secure API (HTTPS)  
- Basic error handling  

---

## 10. Success Criteria

- User finds deal within 5 seconds  
- Filters respond instantly  
- Deals open correctly in browser  
- Favorites work correctly  

---

## 11. Constraints

- No backend rebuild  
- Mobile frontend focus  
- Web app is source of truth  
- Optimize for mobile UX  

---

## Goal

Deliver a fast, clean, and scalable mobile experience focused on discovering flight deals and driving users to external booking platforms.







