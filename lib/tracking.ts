import { getSupabaseBrowser } from "@/lib/supabase";

export type LeaderboardEntry = {
  id: string;
  game_id: string;
  nickname: string;
  score: number;
  country_code: string;
  created_at: string;
};

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

export type SaveLeaderboardResult =
  | { ok: true; id: string }
  | { ok: false; message: string };

/**
 * Persist via same-origin API (server has URL + service role or anon key).
 * Avoids silent client failures when NEXT_PUBLIC_* is missing in the browser bundle.
 */
export async function saveToLeaderboard(
  gameId: string,
  nickname: string,
  score: number,
  countryCode: string = "US",
): Promise<SaveLeaderboardResult> {
  try {
    const res = await fetch("/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, nickname, score, countryCode }),
    });
    const j = (await res.json()) as { id?: string; error?: string };
    if (!res.ok) {
      return { ok: false, message: j.error ?? `Request failed (${res.status})` };
    }
    if (!j.id) return { ok: false, message: j.error ?? "No id returned" };
    return { ok: true, id: j.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network error";
    return { ok: false, message: msg };
  }
}

/** Top 10 global rows for a game (best scores first). */
export async function getLeaderboard(gameId: string): Promise<LeaderboardEntry[]> {
  try {
    const res = await fetch(`/api/leaderboard?gameId=${encodeURIComponent(gameId)}`);
    const j = (await res.json()) as { rows?: LeaderboardEntry[] };
    return Array.isArray(j.rows) ? j.rows : [];
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
