export type SourceCategory = "cz" | "sk" | "global";

const CZ_SOURCES = [
  "cestujlevne.com",
  "pelikan.cz",
  "honzovyletenky.cz",
  "zaletsi.cz",
  "lowkostak.cz",
  "levnocestovani.cz",
  "jaknaletenky.cz",
  "obletsvet.cz",
  "levny-letenky.cz",
  "levneletenkyzprahy.cz",
  "akcniletenky.com",
];

const SK_SOURCES = ["letenkyzababku.sk"];

export function getSourceCategory(sourceName: string): SourceCategory {
  const lower = sourceName.toLowerCase();
  if (CZ_SOURCES.some((s) => lower.includes(s))) return "cz";
  if (SK_SOURCES.some((s) => lower.includes(s))) return "sk";
  return "global";
}

export function groupSourcesByCategory(
  sources: string[],
): Record<SourceCategory, string[]> {
  const groups: Record<SourceCategory, string[]> = { cz: [], sk: [], global: [] };
  for (const s of sources) {
    groups[getSourceCategory(s)].push(s);
  }
  return groups;
}

export const CATEGORY_ORDER: SourceCategory[] = ["cz", "sk", "global"];
