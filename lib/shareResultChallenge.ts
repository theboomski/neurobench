const SITE = "https://zazaza.app";
const PENDING_SHARE_KEY = "zazaza_pending_share_after_redirect_v1";
const PENDING_MAX_AGE_MS = 5 * 60 * 1000;

export type ShareChallengeOptions = {
  title: string;
  /** Full message including URL (some platforms ignore separate `url`). */
  text: string;
  /** Canonical https URL for this result (Web Share `url` field). */
  url: string;
  onCopied?: () => void;
  /** Defaults to true: navigate to result URL first, then share from there. */
  redirectToResultFirst?: boolean;
  /** Internal escape hatch for pending-share replay. */
  skipRedirectCheck?: boolean;
};

type PendingSharePayload = { title: string; text: string; url: string; createdAt: number };

function normalizeAbsoluteUrl(url: string): string {
  return url.startsWith("http") ? url : `${SITE}${url.startsWith("/") ? url : `/${url}`}`;
}

function currentWithoutHash(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}${window.location.pathname}${window.location.search}`;
}

function queuePendingShare(p: PendingSharePayload): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PENDING_SHARE_KEY, JSON.stringify(p));
  } catch {
    // ignore storage issues
  }
}

function loadPendingShareRaw(): PendingSharePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PENDING_SHARE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PendingSharePayload;
    if (!parsed?.url || Date.now() - parsed.createdAt > PENDING_MAX_AGE_MS) {
      sessionStorage.removeItem(PENDING_SHARE_KEY);
      return null;
    }
    return parsed;
  } catch {
    sessionStorage.removeItem(PENDING_SHARE_KEY);
    return null;
  }
}

export async function shareZazazaChallenge({
  title,
  text,
  url,
  onCopied,
  redirectToResultFirst = true,
  skipRedirectCheck = false,
}: ShareChallengeOptions): Promise<void> {
  const absolute = normalizeAbsoluteUrl(url);
  if (typeof window !== "undefined" && redirectToResultFirst && !skipRedirectCheck) {
    const current = currentWithoutHash();
    if (current && current !== absolute) {
      queuePendingShare({ title, text, url: absolute, createdAt: Date.now() });
      window.location.assign(absolute);
      return;
    }
  }

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, text, url: absolute });
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

export async function consumePendingShareForCurrentUrl(onCopied?: () => void): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const pending = loadPendingShareRaw();
  if (!pending) return false;
  if (normalizeAbsoluteUrl(pending.url) !== currentWithoutHash()) return false;
  sessionStorage.removeItem(PENDING_SHARE_KEY);
  await shareZazazaChallenge({
    title: pending.title,
    text: pending.text,
    url: pending.url,
    onCopied,
    redirectToResultFirst: false,
    skipRedirectCheck: true,
  });
  return true;
}
