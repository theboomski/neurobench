declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/** GA4 `share` event — `method` / `content_type` / `item_id` (snake_case per GA). */
export function trackShareEvent(params: { content_type: string; item_id: string; method: string }): void {
  try {
    if (typeof window === "undefined") return;
    const g = window.gtag;
    if (typeof g !== "function") return;
    g("event", "share", {
      content_type: params.content_type,
      item_id: params.item_id,
      method: params.method,
    });
  } catch {
    // ad blockers / missing gtag
  }
}

/** Maps route category (`GameData.category` or share payload) to GA `content_type` buckets. */
export function shareContentTypeFromGameCategory(category: string): string {
  switch (category) {
    case "brain-age":
    case "office-iq":
      return "brain_test";
    case "focus-test":
      return "focus";
    case "dark-personality":
      return "personality";
    case "word-iq":
      return "word_iq";
    case "relationship":
      return "relationship";
    case "money":
      return "money";
    case "korean-tv":
      return "korean_tv";
    default:
      return "brain_test";
  }
}

export function trackEvent(
  eventName: string,
  params?: Record<string, string | number>
) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, params);
  }
}

export function trackGameStart(gameId: string, category: string) {
  trackEvent("game_start", { game_id: gameId, category });
}

export function trackViewResult(
  gameId: string,
  category: string,
  rank: string,
  score: number
) {
  trackEvent("view_result", { game_id: gameId, category, rank, score });
}
