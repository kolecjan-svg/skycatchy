"use client";

import { useState, useEffect, useMemo } from "react";
import { supabaseExternal as supabase } from "@/lib/supabase/external-client";
import type { Deal } from "@/components/deals/DealCard";
import { isRelevantDeal } from "@/lib/airportRelevance";
import { useLanguage, type Language } from "./useLanguage";

interface TranslationRow {
  deal_id: string;
  lang: string;
  name: string;
  description: string | null;
}

// Module-level cache — survives re-renders, reset on full page reload
let cachedTranslations: TranslationRow[] = [];
let cachedFingerprint = "";
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function fetchTranslationsForDeals(dealIds: string[]): Promise<TranslationRow[]> {
  if (dealIds.length === 0) return [];

  const fingerprint = JSON.stringify(dealIds);
  if (
    cachedTranslations.length > 0 &&
    fingerprint === cachedFingerprint &&
    Date.now() - cacheTimestamp < CACHE_TTL
  ) {
    return cachedTranslations;
  }

  let all: TranslationRow[] = [];
  const batchSize = 200;

  for (let i = 0; i < dealIds.length; i += batchSize) {
    const batch = dealIds.slice(i, i + batchSize);
    const { data, error } = await supabase
      .from("deal_translations" as any)
      .select("deal_id, lang, name, description")
      .in("deal_id", batch);

    if (error) {
      console.error("Failed to fetch translations:", error);
      continue;
    }
    all = all.concat((data as TranslationRow[]) ?? []);
  }

  cachedTranslations = all;
  cachedFingerprint = fingerprint;
  cacheTimestamp = Date.now();
  return all;
}

const FALLBACK_ORDER: Language[] = ["en", "de", "cs"];

export function useTranslatedDeals(deals: Deal[]): {
  translatedDeals: Deal[];
  isTranslating: boolean;
} {
  const safeDeals = Array.isArray(deals) ? deals : [];
  const { language } = useLanguage();
  const [translations, setTranslations] = useState<TranslationRow[]>(cachedTranslations);

  const dealIds = useMemo(() => safeDeals.map((d) => d.id).sort(), [JSON.stringify(safeDeals.map(d => d.id))]);

  useEffect(() => {
    if (dealIds.length === 0) return;
    fetchTranslationsForDeals(dealIds).then(data => {
      setTranslations(data);
      console.log("Translations loaded:", data.length, "rows");
      console.log("Languages:", [...new Set(data.map((t: TranslationRow) => t.lang))]);
    });
  }, [dealIds]);

  const translatedDeals = useMemo(() => {
    if (!safeDeals.length) return [];
    if (language === "org") return safeDeals;

    const map = new Map<string, TranslationRow[]>();
    for (const t of translations) {
      if (!t.deal_id) continue;
      if (!map.has(t.deal_id)) map.set(t.deal_id, []);
      map.get(t.deal_id)!.push(t);
    }

    return safeDeals.map((deal) => {
      if (!deal?.id) return deal;
      const dealTranslations = map.get(deal.id) ?? [];

      let selected = dealTranslations.find((t) => t.lang === language);
      if (!selected) {
        for (const lang of FALLBACK_ORDER) {
          selected = dealTranslations.find((t) => t.lang === lang);
          if (selected) break;
        }
      }

      const base = selected?.name
        ? { ...deal, name: selected.name, description: selected.description ?? deal.description }
        : deal;

      return { ...base, is_relevant: isRelevantDeal(base) };
    });
  }, [safeDeals, translations, language]);

  console.log("Language:", language, "Translated:", translatedDeals[0]?.name, "Original:", safeDeals[0]?.name);

  return {
    translatedDeals: translatedDeals.length > 0 ? translatedDeals : safeDeals,
    isTranslating: false,
  };
}
