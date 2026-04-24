/**
 * Games where a lower numeric score ranks higher on the leaderboard
 * (must match `app/api/leaderboard/route.ts` ordering).
 */
export const LEADERBOARD_SCORE_ASC_GAME_IDS = new Set([
  "reaction-time",
  "temporal-pulse",
  "dont-blink",
  "angle-precision",
  "boss-slapper",
  "mini-speed-sudoku",
]);

export function leaderboardUsesAscendingScore(gameId: string): boolean {
  return LEADERBOARD_SCORE_ASC_GAME_IDS.has(gameId);
}
