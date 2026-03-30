export const RELEVANT_AIRPORTS = [
  // CZ
  "PRG", "BRQ", "OSR", "PED",
  // AT
  "VIE", "SZG", "GRZ", "INN", "LNZ", "KLU",
  // DE
  "FRA", "MUC", "BER", "NUE", "FMM", "LEJ",
  // HU
  "BUD",
  // SK
  "BTS",
  // PL
  "KTW", "KRK", "WRO",
  // IT
  "BGY", "MXP", "VCE",
  // CH
  "ZRH", "BSL",
];

const LOCATION_KEYWORDS = [
  // CZ
  "prague", "praha", "praga", "brno", "ostrava", "pardubice",
  // AT
  "vienna", "wien", "vídeň", "salzburg", "graz", "innsbruck", "linz", "klagenfurt",
  // DE
  "frankfurt", "munich", "münchen", "muenchen", "mnichov", "berlin", "berlín",
  "nuremberg", "nürnberg", "norimberk", "leipzig", "lipsko", "memmingen",
  // HU
  "budapest", "budapešť",
  // SK
  "bratislava",
  // PL
  "katowice", "katovice", "krakow", "kraków", "krakov", "wroclaw", "wrocław", "vratislav",
  // IT
  "milan", "milano", "milán", "bergamo", "venice", "venezia", "benátky",
  // CH
  "zurich", "zürich", "curych", "basel", "basilej",
];

const EXCLUDED_DEPARTURES = [
  "los angeles", "new york", "san francisco", "toronto", "vancouver",
  "tokyo", "sydney", "melbourne", "seattle", "chicago", "dallas",
  "houston", "atlanta", "miami", "boston", "denver", "phoenix",
  "las vegas", "honolulu", "auckland", "singapore", "hong kong",
  "mumbai", "delhi", "dubai", "johannesburg", "cape town",
  "são paulo", "buenos aires", "mexico city", "lima",
];

export function isRelevantDeal(deal: {
  name: string;
  description: string | null;
}): boolean {
  const text = `${deal.name} ${deal.description || ""}`;
  const upper = text.toUpperCase();
  const lower = text.toLowerCase();

  const airportMatch = RELEVANT_AIRPORTS.some((code) => {
    const regex = new RegExp(`(?<![A-Z])${code}(?![A-Z])`);
    return regex.test(upper);
  });
  if (airportMatch) return true;

  const cityMatch = LOCATION_KEYWORDS.some((kw) => lower.includes(kw));
  if (cityMatch) return true;

  const isFarAway = EXCLUDED_DEPARTURES.some((loc) => lower.includes(loc));
  if (isFarAway) return false;

  return true;
}
