export const TRIATHLON_STORAGE_KEY = "triathlonSession";

/** Session `games` uses triathlon keys; `reaction-time` maps to `neural-latency`. */
export type TriathlonGameKey = "color-conflict" | "sequence-memory" | "neural-latency";

export type TriathlonSession = {
  games: TriathlonGameKey[];
  currentIndex: number;
  scores: Array<{ game: string; score: number }>;
  startedAt: number;
};

export const TRIATHLON_GAME_ORDER: TriathlonGameKey[] = ["color-conflict", "sequence-memory", "neural-latency"];

export function createInitialTriathlonSession(): TriathlonSession {
  return {
    games: [...TRIATHLON_GAME_ORDER],
    currentIndex: 0,
    scores: [],
    startedAt: Date.now(),
  };
}

export function gameIdToTriathlonKey(gameId: string): TriathlonGameKey | null {
  if (gameId === "color-conflict") return "color-conflict";
  if (gameId === "sequence-memory") return "sequence-memory";
  if (gameId === "reaction-time") return "neural-latency";
  return null;
}

export function triathlonKeyToPath(key: string): string | null {
  if (key === "color-conflict") return "/brain-age/color-conflict";
  if (key === "sequence-memory") return "/brain-age/sequence-memory";
  if (key === "neural-latency") return "/brain-age/reaction-time";
  return null;
}

export function triathlonKeyToNextButtonTitle(key: string): string {
  if (key === "color-conflict") return "Color Conflict";
  if (key === "sequence-memory") return "Sequence Memory";
  if (key === "neural-latency") return "Neural Latency";
  return "Next";
}

export function triathlonKeyToCompleteRowTitle(key: string): string {
  return triathlonKeyToNextButtonTitle(key);
}

export function parseTriathlonSession(raw: string | null): TriathlonSession | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<TriathlonSession>;
    if (!Array.isArray(o.games) || o.games.length !== 3) return null;
    if (typeof o.currentIndex !== "number" || o.currentIndex < 0) return null;
    if (!Array.isArray(o.scores)) return null;
    if (typeof o.startedAt !== "number") return null;
    const allowed = new Set<string>(TRIATHLON_GAME_ORDER);
    if (!o.games.every((g) => typeof g === "string" && allowed.has(g))) return null;
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
