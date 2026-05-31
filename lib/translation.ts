// lib/translation.ts – Translation lookup logic
// Strategy: device lang → deal_translations match → fallback to original

import type { Deal, DealDisplay, DealTranslation } from '../types';

/**
 * Normalise a locale string to 2-char lang code.
 * 'cs-CZ' → 'cs', 'en-US' → 'en', 'cs' → 'cs'
 */
export function normaliseLang(locale: string): string {
  if (!locale) return 'en';
  return locale.substring(0, 2).toLowerCase();
}

/**
 * Given a deal (with optional deal_translations) and the device locale,
 * return a DealDisplay with the best available content.
 */
export function getDisplayDeal(deal: Deal, deviceLocale: string): DealDisplay {
  const lang = normaliseLang(deviceLocale);

  const translation: DealTranslation | undefined = deal.deal_translations?.find(
    (t) => t.lang === lang
  );

  // publish_date is NULL in production DB; fall back to created_at for display
  const displayDate = deal.publish_date || deal.created_at;

  if (translation) {
    return {
      id: deal.id,
      name: translation.name,
      description: translation.description,
      link: deal.link,
      image: deal.image,
      source: deal.source,
      publish_date: displayDate,
      lang: translation.lang,
      isTranslated: true,
    };
  }

  return {
    id: deal.id,
    name: deal.name,
    description: deal.description,
    link: deal.link,
    image: deal.image,
    source: deal.source,
    publish_date: displayDate,
    lang: deal.lang,
    isTranslated: false,
  };
}
