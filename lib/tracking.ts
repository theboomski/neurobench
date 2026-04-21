import { getSupabaseBrowser } from "@/lib/supabase";

export type LeaderboardEntry = {
  id: string;
  game_id: string;
  nickname: string;
  score: number;
  country_code: string;
  created_at: string;
};

/** Lower raw score = better rank (ms, timing, tap speed). */
const LEADERBOARD_SCORE_ASC = new Set([
  "reaction-time",
  "temporal-pulse",
  "dont-blink",
  "angle-precision",
  "boss-slapper",
]);

function leaderboardAscending(gameId: string): boolean {
  return LEADERBOARD_SCORE_ASC.has(gameId);
}

/** Fire-and-forget play counter; never throws to caller. */
export function trackPlay(gameId: string): void {
  const sb = getSupabaseBrowser();
  if (!sb) return;
  void sb
    .from("plays")
    .insert({ game_id: gameId })
    .then(({ error }) => {
      if (error) console.warn("[trackPlay]", error.message);
    });
}

/**
 * Persist a score row. Fails silently (returns null) if Supabase is down or misconfigured.
 * Optional countryCode defaults to "US" when omitted.
 */
export async function saveToLeaderboard(
  gameId: string,
  nickname: string,
  score: number,
  countryCode: string = "US",
): Promise<string | null> {
  try {
    const sb = getSupabaseBrowser();
    if (!sb) return null;
    const row = {
      game_id: gameId,
      nickname: nickname.slice(0, 20),
      score: Math.round(score),
      country_code: countryCode.slice(0, 2).toUpperCase(),
    };
    const { data, error } = await sb.from("leaderboard").insert(row).select("id").single();
    if (error) {
      console.warn("[saveToLeaderboard]", error.message);
      return null;
    }
    return (data as { id: string } | null)?.id ?? null;
  } catch {
    return null;
  }
}

/** Top 10 global rows for a game (best scores first). */
export async function getLeaderboard(gameId: string): Promise<LeaderboardEntry[]> {
  try {
    const sb = getSupabaseBrowser();
    if (!sb) return [];
    const asc = leaderboardAscending(gameId);
    const { data, error } = await sb
      .from("leaderboard")
      .select("id, game_id, nickname, score, country_code, created_at")
      .eq("game_id", gameId)
      .order("score", { ascending: asc })
      .order("created_at", { ascending: true })
      .limit(10);
    if (error) {
      console.warn("[getLeaderboard]", error.message);
      return [];
    }
    return (data ?? []) as LeaderboardEntry[];
  } catch {
    return [];
  }
}

export async function getPlayCount(gameId: string): Promise<number> {
  try {
    const sb = getSupabaseBrowser();
    if (!sb) return 0;
    const { count, error } = await sb.from("plays").select("*", { count: "exact", head: true }).eq("game_id", gameId);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
