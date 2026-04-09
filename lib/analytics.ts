declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
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
