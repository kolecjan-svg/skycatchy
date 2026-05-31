// lib/htmlUtils.ts – HTML entity decoding for deal content from RSS scraping

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&#038;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#34;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&nbsp;': ' ',
  '&#160;': ' ',
  '&ndash;': '–',
  '&#8211;': '–',
  '&mdash;': '—',
  '&#8212;': '—',
  '&hellip;': '…',
  '&#8230;': '…',
  '&euro;': '€',
  '&#8364;': '€',
  '&laquo;': '«',
  '&raquo;': '»',
};

const ENTITY_REGEX = /&[#\w]+;/g;

/**
 * Decode HTML entities and strip HTML/script content from scraped RSS text.
 * Safe for React Native text display.
 *
 * Processing order:
 * 1. Strip jQuery/inline script fragments (common in fly4free.com RSS)
 * 2. Strip <script> blocks
 * 3. Strip actual HTML tags
 * 4. Decode HTML entities (including entity-encoded < > that were not real tags)
 * 5. Normalize whitespace
 */
export function decodeHtmlEntities(text: string | null | undefined): string {
  if (!text) return '';

  let clean = text
    // 1. Strip jQuery snippets embedded in descriptions
    .replace(/jQuery\s*\([^)]*\)[^;]*;/g, '')
    .replace(/\$\s*\([^)]*\)[^;]*;/g, '')
    // 2. Strip script blocks
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    // 3. Strip actual HTML tags
    .replace(/<[^>]+>/g, ' ')
    // 4. Decode HTML entities
    .replace(ENTITY_REGEX, (match) => ENTITIES[match] ?? match)
    // 5. Second pass: strip any HTML tags revealed by entity decoding (&lt;b&gt; → <b>)
    .replace(/<[^>]+>/g, ' ')
    // 6. Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();

  return clean;
}
