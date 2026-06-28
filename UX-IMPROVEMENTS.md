# Supabase Improvement #1

Title:
Populate publish_date during deal import

Current State:
The deals table contains a publish_date column but it is NULL for all imported deals.

Problem:
The mobile application must currently use created_at as a fallback timestamp.

Desired State:
During RSS/API/scraper import, store the original publication date from the source website into deals.publish_date.

Benefits:
- Accurate sorting
- Accurate relative timestamps
- Better consistency with source websites
- Improved future analytics

Status:
OPEN