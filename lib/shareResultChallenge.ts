const SITE = "https://zazaza.app";

export type ShareChallengeOptions = {
  title: string;
  /** Full message including URL (some platforms ignore separate `url`). */
  text: string;
  /** Canonical https URL for this result (Web Share `url` field). */
  url: string;
  onCopied?: () => void;
  /** Defaults to true: update browser URL to the result page before sharing. */
  replaceUrlBeforeShare?: boolean;
};

function normalizeAbsoluteUrl(url: string): string {
  return url.startsWith("http") ? url : `${SITE}${url.startsWith("/") ? url : `/${url}`}`;
}

function replaceBrowserUrl(absolute: string): void {
  if (typeof window === "undefined") return;
  try {
    const next = new URL(absolute);
    if (next.origin !== window.location.origin) return;
    const pathWithQuery = `${next.pathname}${next.search}`;
    const current = `${window.location.pathname}${window.location.search}`;
    if (current === pathWithQuery) return;
    window.history.replaceState(window.history.state, "", pathWithQuery);
    // Let Next.js app-router react to the URL transition without full reload.
    window.dispatchEvent(new PopStateEvent("popstate"));
  } catch {
    // ignore URL/History issues and proceed with share
  }
}

export async function shareZazazaChallenge({
  title,
  text,
  url,
  onCopied,
  replaceUrlBeforeShare = true,
}: ShareChallengeOptions): Promise<void> {
  const absolute = normalizeAbsoluteUrl(url);
  if (replaceUrlBeforeShare) replaceBrowserUrl(absolute);

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      // Some share targets duplicate content when both `text` and `url` contain the same link.
      const textHasUrl = text.includes(absolute);
      await navigator.share(textHasUrl ? { title, text } : { title, text, url: absolute });
      return;
    } catch (e) {
      if ((e as Error)?.name === "AbortError") return;
    }
  }

  try {
    await navigator.clipboard.writeText(text.includes(absolute) ? text : `${text} ${absolute}`);
    onCopied?.();
  } catch {
    window.prompt("Copy this text:", text.includes(absolute) ? text : `${text} ${absolute}`);
  }
}
