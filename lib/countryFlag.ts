/** ISO 3166-1 alpha-2 → regional indicator flag emoji */
export function countryCodeToFlag(code: string): string {
  const c = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return "🌍";
  return c.replace(/./g, (ch) => String.fromCodePoint(ch.charCodeAt(0) + 127397));
}

/** English labels for leaderboard UI (consistent for all players). */
const REGION_NAMES_EN = new Intl.DisplayNames(["en"], { type: "region" });

/**
 * ISO 3166-1 alpha-2 → English region name (e.g. "KR" → "South Korea").
 * Always uses `en`, not the browser locale, so the leaderboard matches the rest of the site copy.
 */
export function countryCodeToRegionName(code: string): string {
  const c = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return code;
  try {
    return REGION_NAMES_EN.of(c) ?? c;
  } catch {
    return c;
  }
}
