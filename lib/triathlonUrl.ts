/** Normalize `mode` from Next `searchParams` (string or repeated key → array). */
export function triathlonModeFromSearchParams(
  searchParams: { mode?: string | string[] },
): boolean {
  const raw = searchParams.mode;
  const mode = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  return mode === "triathlon";
}
