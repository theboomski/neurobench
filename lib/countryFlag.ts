/** ISO 3166-1 alpha-2 → regional indicator flag emoji */
export function countryCodeToFlag(code: string): string {
  const c = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return "🌍";
  return c.replace(/./g, (ch) => String.fromCodePoint(ch.charCodeAt(0) + 127397));
}
