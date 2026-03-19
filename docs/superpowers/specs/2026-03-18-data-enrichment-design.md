# Data Enrichment Pipeline: Master Tour, Advances, and Budgets

**Date:** 2026-03-18
**Status:** Approved
**Scope:** Improve data flow between Master Tour imports, advances, and budgets in nbl-ops

## Problem

Data entered in one place (Master Tour, advance, budget, shared roster) doesn't flow to other places automatically. Users re-enter crew phone numbers, hotel names get lost during sync, and roster data sits unused during MT imports.

## Design Decisions

- **Auto-enrich at import**: MT import automatically cross-references the shared roster to fill in crew details (phone, email, DOB, loyalty numbers)
- **Always merge**: Sync and Pull operations always deduplicate-merge (no "only if empty" guards except for scalar meta fields)
- **Advance crew expanded**: Advance crew table gets Phone + Email columns (4 columns total)
- **Budget hotel expanded**: Budget hotel table gets a Hotel Name column (11 columns total)
- **Unified module**: Shared `lib/data-enrichment.js` module used by MT import, sync, and pull
- **Full crew propagation**: Syncing advance crew to budget also populates Payroll and Per Diems tables

## Architecture

### New Module: `lib/data-enrichment.js`

Three capability groups:

#### 1. Roster Lookup

```
enrichFromRoster(crewList, rosterData) -> enrichedCrewList
```

- Input: array of `{name, role}` (from MT or manual entry) + roster data array (from localStorage `nbl_saved_roster` or `/api/roster`)
- Caller is responsible for providing roster data (already loaded on both advance and advances pages)
- Looks up each name in roster (case-insensitive, trimmed)
- Returns same array with `phone`, `email`, `dob`, `skyMiles`, `ktn`, `hilton`, `marriott`, `shirtSize`, `payType`, `rate` filled in from matches
- Non-matches pass through unchanged

#### 2. Section Mergers

```
mergeCrew(target[], source[]) -> merged[]
mergeHotel(target[], source[]) -> merged[]
mergeContacts(target[], source[]) -> merged[]
mergeLinks(target[], source[]) -> merged[]
mergeNotes(targetText, sourceText, marker) -> mergedText
```

- **Dedup keys by section:**
  - `mergeCrew`: case-insensitive name match
  - `mergeHotel`: composite key — case-insensitive guest name + check-in date
  - `mergeContacts`: case-insensitive name match
  - `mergeLinks`: URL match (case-insensitive)
  - `mergeNotes`: marker string presence check (no dedup, append if marker not found)
- Source entries not in target get appended
- Matching entries: source fills blank fields on target (never overwrites non-empty)
- Returns merged array

#### 3. Format Converters

```
advanceCrewToBudget(advanceCrew[]) -> budgetCrewRows[]
budgetCrewToAdvance(budgetCrewRows[]) -> advanceCrew[]
advanceHotelToBudget(advanceHotel[]) -> budgetHotelRows[]
budgetHotelToAdvance(budgetHotelRows[]) -> advanceHotel[]
advanceContactsToBudget(advanceContacts[]) -> budgetContactRows[]
budgetContactsToAdvance(budgetContactRows[]) -> advanceContacts[]
```

- Handle column order differences between advance objects and budget row arrays
- Budget hotel row format changes to include hotel name column

## Data Flow Changes

### 1. MT Import (advances.html)

**Current:** MT API -> build advance data -> save
**New:** MT API -> `enrichFromRoster(crew)` -> build advance data -> save

- After fetching crew from MT, call `enrichFromRoster()` before building advance object
- Advance crew data structure changes from `{role, name}` to `{role, name, phone, email}` plus hidden fields (DOB, loyalty numbers) stored in data blob
- Hotel, schedule, contacts, notes: no changes to MT import logic

### 2. Sync to Budget (advance.html -> syncToBudget)

Enhanced flow using enrichment module:

1. Load linked budget data
2. **Crew**: `advanceCrewToBudget()` -> `mergeCrew()`. Phone + email now flow through (currently empty strings)
3. **Hotel**: `advanceHotelToBudget()` -> `mergeHotel()`. Hotel name now included via new budget column
4. **Contacts**: `advanceContactsToBudget()` -> `mergeContacts()`. Same logic, shared function
5. **Links**: `mergeLinks()`. Same logic, shared function
6. **Notes**: `mergeNotes()` with `'--- ADVANCE NOTES ---'` marker
7. **Payroll (NEW)**: For each synced crew member not in any payroll block, add to first block (`pay_0`) as `[position, name, days='', rate]` with rate from roster
8. **Per Diems (NEW)**: For each synced crew member not in `pdBody`, add `[position, name, days='', rate=defaultRate]` (4-field row format)

### 3. Pull from Budget (advance.html -> pullFromBudget)

Enhanced flow — always merges (removes "only if empty" guards):

1. **Crew**: `budgetCrewToAdvance()` -> `mergeCrew()`. Pulls role, name, phone, email. Also enriches from roster
2. **Hotel**: `budgetHotelToAdvance()` -> `mergeHotel()`. Hotel name now comes through from new budget column
3. **Contacts**: `budgetContactsToAdvance()` -> `mergeContacts()`. Always merges now
4. **Links**: `mergeLinks()`. Always merges
5. **Meta**: Fill venue name and show date only if advance fields are empty (scalar fields keep current behavior)

## UI Changes

### Advance Crew Table (advance.html)

- **Before**: Role | Name (2 columns)
- **After**: Role | Name | Phone | Email (4 columns)
- Name input gets datalist autocomplete from shared roster
- Selecting a name from datalist auto-fills phone + email

### Budget Hotel Table (budget.html)

- **Before**: Check-in | Check-out | City | Guest | DOB | Loyalty | Notes | Rooms | Nights | Rate (10 columns)
- **After**: Check-in | Check-out | City | Hotel | Guest | DOB | Loyalty | Notes | Rooms | Nights | Rate (11 columns)
- Hotel Name column inserted after City, before guest Name
- Budget hotel row array: `[checkin, checkout, city, hotelName, guestName, dob, loyalty, notes, rooms, nights, rate]`

### Sync Feedback

- After Sync or Pull, show toast with counts: "Synced: 5 crew, 2 hotels, 3 contacts"
- Uses existing toast infrastructure

### Template Tools Dropdown (advances.html)

- The action bar at the top currently has multiple inline buttons (NEW ADVANCE, IMPORT FROM MASTER TOUR, IMPORT XLSX, etc.)
- Consolidate import/template actions into a single dropdown: keep "NEW ADVANCE" as a primary button, move import options (IMPORT FROM MASTER TOUR, IMPORT XLSX) into a "Import" dropdown
- Reduces visual clutter in the action bar

## Data Format Reference

### Advance Crew Object (enhanced)
```json
{
  "role": "Audio",
  "name": "John Smith",
  "phone": "555-1234",
  "email": "john@example.com",
  "_rosterData": {
    "dob": "1990-01-15",
    "skyMiles": "SK123456",
    "ktn": "KTN789",
    "hilton": "HH111",
    "marriott": "MW222",
    "shirtSize": "L",
    "payType": "day",
    "rate": "750"
  }
}
```

The `_rosterData` object stores hidden roster fields that flow through to budget on sync but aren't displayed in the advance crew table.

### Advance Hotel Object (unchanged)
```json
{
  "guest": "John Smith",
  "hotel": "Hilton Downtown",
  "checkin": "2026-04-01",
  "checkout": "2026-04-03",
  "confirmation": "HLT123456",
  "notes": "Late checkout requested"
}
```

### Budget Hotel Row Array (enhanced)
```
Index:  0        1         2     3          4          5    6        7      8      9       10
Field:  checkin  checkout  city  hotelName  guestName  dob  loyalty  notes  rooms  nights  rate
```

### Budget Crew Row Array (unchanged)
```
Index:  0         1     2      3      4
Field:  position  name  phone  email  status
```

## Migration

### Budget Hotel Data Migration

Existing budget hotel rows have 10 elements. New rows have 11 (hotel name inserted at index 3). On budget load, detect row length:
- If row has 10 elements: insert empty string at index 3 (hotelName = '')
- If row has 11 elements: no migration needed

This is a client-side migration in `budget.html` load logic — no Supabase schema change needed since hotel data is stored in the JSONB `data` column.

### Advance Crew Data Migration

Existing advance crew entries are `{role, name}`. Enhanced entries add `phone`, `email`, `_rosterData`. On advance load:
- If crew entry lacks `phone`/`email`: default to empty strings
- No breaking change since we're adding optional fields

## Files Changed

| File | Change |
|------|--------|
| `lib/data-enrichment.js` | **NEW** — shared enrichment module |
| `advance.html` | Crew table: 4 columns. Updated `syncToBudget()`, `pullFromBudget()`, crew rendering |
| `advances.html` | MT import: add roster enrichment step. Template tools: convert to dropdown |
| `budget.html` | Hotel table: 11 columns. Hotel row migration on load. Hotel rendering |
| `api/roster.js` | No changes needed — existing API already returns all fields needed for enrichment |
