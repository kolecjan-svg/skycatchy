// lib/formatters.ts – Display formatting utilities

/**
 * Format an ISO publish_date string into a human-readable relative time.
 * Examples: "5 min ago", "2h ago", "3 days ago", "Jan 15"
 */
export function formatPublishDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '';

  let date: Date;
  try {
    date = new Date(isoDate);
    if (isNaN(date.getTime())) return '';
  } catch {
    return '';
  }

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  // Older than 7 days: show date
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
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
