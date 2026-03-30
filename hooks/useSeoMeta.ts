"use client";

import { useEffect } from "react";
import { useLanguage, type Language } from "@/hooks/useLanguage";

const SEO: Record<Exclude<Language, "org">, { title: string; description: string }> = {
  en: {
    title: "SkyCatchy – Cheap Flights & Travel Deals",
    description:
      "Find the best flight deals and travel offers from multiple sources in one place.",
  },
  de: {
    title: "SkyCatchy – Günstige Flüge & Reiseangebote",
    description:
      "Finde die besten Flugangebote und Reise-Deals aus verschiedenen Quellen an einem Ort.",
  },
  cs: {
    title: "SkyCatchy – Levné letenky a cestovní nabídky",
    description:
      "Najděte nejlepší nabídky letenek a cestování z různých zdrojů na jednom místě.",
  },
};

/**
 * Dynamically updates <title>, <html lang>, and meta tags when the user
 * switches language. Static/SSR metadata is set via app/layout.tsx metadata export.
 */
export function useSeoMeta() {
  const { language } = useLanguage();

  useEffect(() => {
    const lang = language === "org" ? "cs" : language;
    const { title, description } = SEO[lang];

    document.title = title;
    document.documentElement.lang = lang;

    const setMeta = (selector: string, attr: string, value: string) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute(attr, value);
    };

    setMeta('meta[name="description"]', "content", description);
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", description);
  }, [language]);
}
