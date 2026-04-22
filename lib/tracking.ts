import { getSupabaseBrowser } from "@/lib/supabase";

export type LeaderboardEntry = {
  id: string;
  game_id: string;
  nickname: string;
  score: number;
  country_code: string;
  created_at: string;
};

/**
 * Fire-and-forget play log via same-origin API (server uses service role / anon).
 * Never throws and never blocks gameplay.
 */
export function trackPlay(gameId: string, countryCode: string = "US"): void {
  if (typeof window === "undefined") return;
  void fetch("/api/plays", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameId, countryCode }),
  }).then((res) => {
    if (!res.ok && process.env.NODE_ENV === "development") {
      void res.text().then((t) => console.warn("[trackPlay] POST failed", res.status, t?.slice(0, 200)));
    }
  }).catch(() => {
    /* ignore */
  });
}

export type SaveLeaderboardResult =
  | { ok: true; id: string }
  | { ok: false; message: string };

/**
 * Persist via same-origin API (server has URL + service role or anon key).
 * Avoids silent client failures when NEXT_PUBLIC_* is missing in the browser bundle.
 */
type LeaderboardPostJson = {
  id?: string;
  error?: string;
  errorFull?: { message?: string; code?: string; details?: string; hint?: string };
};

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

    const text = await res.text();
    let j: LeaderboardPostJson = {};
    try {
      j = text ? (JSON.parse(text) as LeaderboardPostJson) : {};
    } catch {
      return {
        ok: false,
        message: text?.slice(0, 200) || `Invalid JSON from server (HTTP ${res.status})`,
      };
    }

    if (!res.ok) {
      const parts = [
        j.errorFull?.code ? `[${j.errorFull.code}]` : "",
        j.error,
        j.errorFull?.details,
        j.errorFull?.hint,
      ].filter(Boolean);
      const message = parts.length ? parts.join(" — ") : `Request failed (${res.status})`;
      if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
        console.warn("[saveToLeaderboard] POST failed", res.status, j);
      }
      return { ok: false, message };
    }

    if (!j.id || typeof j.id !== "string") {
      const message = j.error ?? "Server returned 200 but no id — insert may not have persisted.";
      if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
        console.warn("[saveToLeaderboard] missing id in body", j);
      }
      return { ok: false, message };
    }

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
    const { count, error } = await sb
      .from("game_plays")
      .select("*", { count: "exact", head: true })
      .eq("game_id", gameId);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}
