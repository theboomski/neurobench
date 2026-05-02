import { isAllowedTriathlonGameId } from "@/lib/triathlonDailyGames";

export const TRIATHLON_STORAGE_KEY = "triathlonSession";

export type TriathlonSession = {
  /** Three game ids from the daily pool, in play order. */
  games: string[];
  currentIndex: number;
  scores: Array<{ game: string; score: number }>;
  startedAt: number;
};

export function createInitialTriathlonSession(gameIds: string[]): TriathlonSession {
  if (gameIds.length !== 3 || !gameIds.every((id) => isAllowedTriathlonGameId(id))) {
    throw new Error("createInitialTriathlonSession: invalid game ids");
  }
  return {
    games: [...gameIds],
    currentIndex: 0,
    scores: [],
    startedAt: Date.now(),
  };
}

export function parseTriathlonSession(raw: string | null): TriathlonSession | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<TriathlonSession>;
    if (!Array.isArray(o.games) || o.games.length !== 3) return null;
    if (typeof o.currentIndex !== "number" || o.currentIndex < 0) return null;
    if (!Array.isArray(o.scores)) return null;
    if (typeof o.startedAt !== "number") return null;
    if (!o.games.every((g) => typeof g === "string" && isAllowedTriathlonGameId(g))) return null;
    return o as TriathlonSession;
  } catch {
    return null;
  }
}

/** Average of triathlon normalized scores (0–100 each), scaled to 0–1000. */
export function brainScoreFromTriathlonScores(scores: Array<{ score: number }>): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((a, s) => a + s.score, 0);
  return Math.round((sum / scores.length / 100) * 1000);
}

/**
 * In development, React Strict Mode runs effects twice; the first run would
 * `removeItem` before the second could read. We keep one in-memory copy after
 * a successful read so the second run still returns data. Cleared when starting
 * a new triathlon (`clearTriathlonCompletePageMemory`).
 */
let triathlonCompletePageMemory: TriathlonSession | null = null;

export function clearTriathlonCompletePageMemory(): void {
  triathlonCompletePageMemory = null;
}

/**
 * For `/triathlon/complete` only: read session from sessionStorage, parse, copy
 * into React state via caller, then clear storage. If storage was already
 * cleared (e.g. Strict Mode re-run), returns the in-memory copy once.
 */
export function readTriathlonSessionForCompletePage(): TriathlonSession | null {
  if (typeof window === "undefined") return null;
  if (triathlonCompletePageMemory) {
    return triathlonCompletePageMemory;
  }
  const raw = sessionStorage.getItem(TRIATHLON_STORAGE_KEY);
  if (!raw) return null;
  const parsed = parseTriathlonSession(raw);
  if (!parsed || parsed.scores.length === 0) {
    sessionStorage.removeItem(TRIATHLON_STORAGE_KEY);
    return null;
  }
  triathlonCompletePageMemory = parsed;
  sessionStorage.removeItem(TRIATHLON_STORAGE_KEY);
  return parsed;
}
