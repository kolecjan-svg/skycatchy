# DATABASE-CLEANUP

## Current State

Database analysis:

- Total rows: 860,164
- Unique deals: 5,297
- Duplicate rows: 854,867
- Duplicate ratio: 99.38%

Current observations:

- Deals are imported every 15 minutes.
- The same deal appears to be inserted repeatedly.
- No unique constraint exists on deal ID.
- publish_date is currently NULL for all rows.
- Supabase displays "EXCEEDING USAGE LIMITS".

## Goal

Reduce database size and eliminate unnecessary duplicate deal records.

## Requirements

- Do not lose active deal data.
- Do not break the mobile application.
- Do not break the existing import process.
- Provide a rollback strategy.
- Minimize downtime.

## Requested Analysis

Investigate:

1. Why duplicates are created.
2. Whether a UNIQUE constraint should be added.
3. Whether UPSERT should replace INSERT.
4. How existing duplicates can be safely cleaned.
5. Estimated storage reduction.
6. Recommended migration order.

## Status

OPEN

# Status

Importer not yet located.

Confirmed facts:

- Import process is still active.
- New rows arrive every 15 minutes.
- Approximately 150–160 rows are inserted per cycle.
- Sources are read from the sources table.
- Current database contains:
  - 860,164 rows
  - 5,297 unique deals
  - 99.38% duplicates

Priority:
1. Finish Mobile MVP.
2. Locate importer.
3. Switch INSERT -> UPSERT.
4. Execute database cleanup migration.