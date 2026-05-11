import { isAllowedTriathlonGameId } from "@/lib/triathlonDailyGames";

export const TRIATHLON_STORAGE_KEY = "triathlonSession";

/** Linear 0–100 normalization ranges per triathlon leg (raw score from game). */
export const TRIATHLON_NORMALIZATION: Record<
  string,
  { min: number; max: number }
> = {
  "color-conflict": { min: 0, max: 75 },
  "color-conflict-2": { min: 0, max: 75 },
  "sequence-memory": { min: 4, max: 19 },
  "number-memory": { min: 4, max: 19 },
  "visual-memory": { min: 4, max: 19 },
  "chimp-test": { min: 4, max: 19 },
  "verbal-memory": { min: 0, max: 100 },
  "instant-comparison": { min: 0, max: 150 },
  "fish-frenzy": { min: 0, max: 50 },
};

export type TriathlonScore = {
  game: string;
  /** Raw score from the game (same units as high score / finalScore). */
  score: number;
  /** 0–100 linear normalized for ZCI (see TRIATHLON_NORMALIZATION). */
  normalizedScore: number;
};

export type TriathlonSession = {
  /** Three game ids from the daily pool, in play order. */
  games: string[];
  currentIndex: number;
  scores: TriathlonScore[];
  startedAt: number;
};

export function normalizeTriathlonRawScore(raw: number, gameId: string): number {
  const cfg = TRIATHLON_NORMALIZATION[gameId];
  if (!cfg) return 0;
  const span = cfg.max - cfg.min;
  if (span <= 0) return 0;
  const t = ((Number(raw) - cfg.min) / span) * 100;
  return Math.round(Math.max(0, Math.min(100, t)));
}

export function calculateZCI(scores: TriathlonScore[]): number {
  if (scores.length === 0) return 0;
  const avg = scores.reduce((sum, s) => sum + s.normalizedScore, 0) / scores.length;
  return Math.round(avg);
}

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

function normalizeScoreRow(game: string, raw: number, normalizedMaybe: unknown): TriathlonScore | null {
  if (typeof game !== "string" || !isAllowedTriathlonGameId(game)) return null;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  let normalizedScore: number;
  if (typeof normalizedMaybe === "number" && Number.isFinite(normalizedMaybe)) {
    normalizedScore = Math.round(Math.max(0, Math.min(100, normalizedMaybe)));
  } else {
    normalizedScore = normalizeTriathlonRawScore(raw, game);
  }
  return { game, score: raw, normalizedScore };
}

export function parseTriathlonSession(raw: string | null): TriathlonSession | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<TriathlonSession> & { scores?: unknown[] };
    if (!Array.isArray(o.games) || o.games.length !== 3) return null;
    if (typeof o.currentIndex !== "number" || o.currentIndex < 0) return null;
    if (!Array.isArray(o.scores)) return null;
    if (typeof o.startedAt !== "number") return null;
    if (!o.games.every((g) => typeof g === "string" && isAllowedTriathlonGameId(g))) return null;

    const scores: TriathlonScore[] = [];
    for (const row of o.scores) {
      if (!row || typeof row !== "object") return null;
      const r = row as Record<string, unknown>;
      const g = r.game;
      const raw = r.score;
      const norm = r.normalizedScore;
      if (typeof g !== "string") return null;
      if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
      const parsed = normalizeScoreRow(g, raw, norm);
      if (!parsed) return null;
      scores.push(parsed);
    }

    return {
      games: o.games as string[],
      currentIndex: o.currentIndex,
      scores,
      startedAt: o.startedAt,
    };
  } catch {
    return null;
  }
}

/** @deprecated Prefer calculateZCI(session.scores) */
export function brainScoreFromTriathlonScores(scores: TriathlonScore[]): number {
  return calculateZCI(scores);
}

let triathlonCompletePageMemory: TriathlonSession | null = null;

export function clearTriathlonCompletePageMemory(): void {
  triathlonCompletePageMemory = null;
}

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
