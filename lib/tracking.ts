import { getSupabaseBrowser } from "@/lib/supabase";

export type LeaderboardEntry = {
  id: string;
  game_id: string;
  nickname: string;
  score: number;
  country_code: string;
  created_at: string;
  /** Optional preset line shown under the row on the leaderboard. */
  trash_talk?: string | null;
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

type LeaderboardSessionJson = {
  nonce?: string;
  expiresAt?: string;
  signature?: string;
  error?: string;
};

export async function saveToLeaderboard(
  gameId: string,
  nickname: string,
  score: number,
  countryCode: string = "US",
  trashTalk?: string | null,
): Promise<SaveLeaderboardResult> {
  try {
    const sessionRes = await fetch("/api/leaderboard/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId }),
    });
    const sessionJson = (await sessionRes.json().catch(() => ({}))) as LeaderboardSessionJson;
    if (!sessionRes.ok || !sessionJson.nonce || !sessionJson.expiresAt || !sessionJson.signature) {
      return { ok: false, message: sessionJson.error ?? "Failed to create leaderboard session." };
    }

    const res = await fetch("/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameId,
        nickname,
        score,
        countryCode,
        nonce: sessionJson.nonce,
        expiresAt: sessionJson.expiresAt,
        signature: sessionJson.signature,
        ...(trashTalk != null && trashTalk !== "" ? { trashTalk } : {}),
      }),
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

/** Same as GET leaderboard plus `previewRank` for this score (1 = best), for podium-only UI. */
export async function getLeaderboardWithPreviewRank(
  gameId: string,
  previewScore: number,
): Promise<{ rows: LeaderboardEntry[]; previewRank?: number }> {
  try {
    const res = await fetch(
      `/api/leaderboard?gameId=${encodeURIComponent(gameId)}&previewRankForScore=${encodeURIComponent(String(previewScore))}`,
    );
    const j = (await res.json()) as { rows?: LeaderboardEntry[]; previewRank?: number };
    return {
      rows: Array.isArray(j.rows) ? j.rows : [],
      previewRank: typeof j.previewRank === "number" ? j.previewRank : undefined,
    };
  } catch {
    return { rows: [] };
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

/** Bulk play counts keyed by game id, fetched from server API. */
export async function getPlayCounts(): Promise<Record<string, number>> {
  try {
    const res = await fetch("/api/plays", { method: "GET" });
    if (!res.ok) return {};
    const j = (await res.json()) as { counts?: Record<string, number> };
    return j.counts ?? {};
  } catch {
    return {};
  }
}
