// lib/formatters.ts – Display formatting utilities

/**
 * Format an ISO timestamp string into a human-readable relative time.
 * Examples: "5 min ago", "2h ago", "3d ago", "15 May"
 *
 * Bug #8 fix: Supabase returns UTC timestamps WITHOUT a timezone designator,
 * e.g. "2026-05-31T15:00:23.852". JavaScript's Date constructor treats
 * timezone-naive strings as LOCAL TIME on most platforms. On a UTC+2 device
 * (typical for Czech/Slovak users) this shifts every deal timestamp 2 hours
 * into the past — a 12-minute-old deal appears "2h ago".
 * Fix: append 'Z' when no timezone designator is present so the string is
 * always parsed as UTC.
 *
 * @param isoDate  ISO timestamp string as returned by Supabase (UTC, no timezone suffix)
 * @param nowMs    Optional override for current time (ms since epoch). Used in tests.
 */
export function formatPublishDate(
  isoDate: string | null | undefined,
  nowMs: number = Date.now()
): string {
  if (!isoDate) return '';

  let date: Date;
  try {
    // Supabase returns UTC timestamps without a timezone designator.
    // Append 'Z' when absent so they are parsed as UTC, not as local time.
    const hasTimezone = /Z$|[+-]\d{2}:?\d{2}$/.test(isoDate);
    const utcIso = hasTimezone ? isoDate : isoDate + 'Z';
    date = new Date(utcIso);
    if (isNaN(date.getTime())) return '';
  } catch {
    return '';
  }

  const diffMs = nowMs - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  // Older than 7 days: show date in UTC to avoid off-by-one near day boundary
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

/**
 * Truncate text to a maximum number of lines worth of characters.
 * Approximation: ~60 chars per line on mobile.
 */
export function truncateDescription(text: string | null, maxLines = 3): string {
  if (!text) return '';
  const maxChars = maxLines * 60;
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars).trimEnd() + '…';
}
