import type { Language } from "@/hooks/useLanguage";

const labels = {
  en: {
    just_added: "Just added",
    about_minutes: (v: number) => `about ${v} minute${v !== 1 ? "s" : ""} ago`,
    about_hours: (v: number) => `about ${v} hour${v !== 1 ? "s" : ""} ago`,
    about_days: (v: number) => `about ${v} day${v !== 1 ? "s" : ""} ago`,
  },
  de: {
    just_added: "Gerade hinzugefügt",
    about_minutes: (v: number) => `vor etwa ${v} Minute${v !== 1 ? "n" : ""}`,
    about_hours: (v: number) => `vor etwa ${v} Stunde${v !== 1 ? "n" : ""}`,
    about_days: (v: number) => `vor etwa ${v} Tag${v !== 1 ? "en" : ""}`,
  },
  cs: {
    just_added: "Právě přidáno",
    about_minutes: (v: number) =>
      `přibližně před ${v} ${v === 1 ? "minutou" : "minutami"}`,
    about_hours: (v: number) =>
      `přibližně před ${v} ${v === 1 ? "hodinou" : "hodinami"}`,
    about_days: (v: number) => `přibližně před ${v} ${v === 1 ? "dnem" : "dny"}`,
  },
} as const;

export function formatDealTime(dateStr: string, language: Language = "en"): string {
  const lang = language === "org" ? "cs" : language;
  const t = labels[lang];
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);
  if (minutes < 1) return t.just_added;
  if (minutes < 60) return t.about_minutes(minutes);
  if (hours < 24) return t.about_hours(hours);
  return t.about_days(days);
}
