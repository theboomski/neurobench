/** Single pick for one triathlon leg (focus / memory / speed). */
export type DailyTriathlonPick = {
  id: string;
  name: string;
  category: string;
  path: string;
};

/**
 * Pool for the daily triathlon. IDs and paths match live routes in this app
 * (spec used `memory-matrix` / `word-association-iq` + brain-age paths; here
 * `number-memory` is Memory Matrix, `word-association` lives under word-iq).
 */
export const TRIATHLON_GAMES = {
  focus: [
    { id: "color-conflict", name: "Color Conflict", category: "Focus", path: "/brain-age/color-conflict" },
    { id: "color-conflict-2", name: "Color Conflict 2", category: "Focus", path: "/brain-age/color-conflict-2" },
  ],
  memory: [
    { id: "sequence-memory", name: "Sequence Memory", category: "Memory", path: "/brain-age/sequence-memory" },
    { id: "number-memory", name: "Memory Matrix", category: "Memory", path: "/brain-age/number-memory" },
    { id: "visual-memory", name: "Visual Memory", category: "Memory", path: "/brain-age/visual-memory" },
    { id: "chimp-test", name: "Chimp Test", category: "Memory", path: "/brain-age/chimp-test" },
    { id: "verbal-memory", name: "Verbal Memory", category: "Memory", path: "/brain-age/verbal-memory" },
  ],
  speed: [
    { id: "instant-comparison", name: "Instant Comparison", category: "Speed", path: "/brain-age/instant-comparison" },
    { id: "fish-frenzy", name: "Fish Frenzy", category: "Speed", path: "/brain-age/fish-frenzy" },
    { id: "word-association", name: "Word Association IQ", category: "Speed", path: "/word-iq/word-association" },
  ],
} as const;

const ALL_PICKS: DailyTriathlonPick[] = [
  ...TRIATHLON_GAMES.focus,
  ...TRIATHLON_GAMES.memory,
  ...TRIATHLON_GAMES.speed,
];

const PICK_BY_ID = new Map<string, DailyTriathlonPick>(ALL_PICKS.map((p) => [p.id, p]));

const ALLOWED_TRIATHLON_IDS = new Set(ALL_PICKS.map((p) => p.id));

export function isAllowedTriathlonGameId(id: string): boolean {
  return ALLOWED_TRIATHLON_IDS.has(id);
}

export function getTriathlonPathForGameId(id: string): string | null {
  return PICK_BY_ID.get(id)?.path ?? null;
}

export function getTriathlonNameForGameId(id: string): string {
  return PICK_BY_ID.get(id)?.name ?? id;
}

/** Safe first-leg URL if daily picks ever fail validation (must exist as a route). */
export const TRIATHLON_FALLBACK_PLAY_PATH = "/brain-age/color-conflict";

/** Append `mode=triathlon` for in-flow game URLs (chain + Sequence Memory triathlon mode). */
export function appendTriathlonModeQuery(path: string | null | undefined): string {
  const base =
    path != null && typeof path === "string" && path.length > 0
      ? path.startsWith("/")
        ? path
        : `/${path}`
      : TRIATHLON_FALLBACK_PLAY_PATH;
  const joiner = base.includes("?") ? "&" : "?";
  return `${base}${joiner}mode=triathlon`;
}

function seededRandom(seed: number, index: number): number {
  const x = Math.sin(seed + index) * 10000;
  return x - Math.floor(x);
}

function pickIndex(seed: number, slot: number, len: number): number {
  if (len <= 0) return 0;
  const r = seededRandom(seed, slot);
  const idx = Math.floor(r * len);
  return Math.min(len - 1, Math.max(0, idx));
}

function isValidPick(p: unknown): p is DailyTriathlonPick {
  if (p == null || typeof p !== "object") return false;
  const o = p as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    o.id.length > 0 &&
    typeof o.path === "string" &&
    o.path.length > 0 &&
    typeof o.name === "string" &&
    typeof o.category === "string"
  );
}

/** Same UTC calendar day yields the same three picks; category play order is also seeded. */
export function getDailyGames(date = new Date()): DailyTriathlonPick[] {
  const today = date;
  const seed = today.getUTCFullYear() * 10000 + (today.getUTCMonth() + 1) * 100 + today.getUTCDate();

  const focusPick = TRIATHLON_GAMES.focus[pickIndex(seed, 0, TRIATHLON_GAMES.focus.length)];
  const memoryPick = TRIATHLON_GAMES.memory[pickIndex(seed, 1, TRIATHLON_GAMES.memory.length)];
  const speedPick = TRIATHLON_GAMES.speed[pickIndex(seed, 2, TRIATHLON_GAMES.speed.length)];

  const picks = [focusPick, memoryPick, speedPick];
  const orderSeed = pickIndex(seed, 3, 6);
  const orders = [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0],
  ] as const;
  const perm = orders[orderSeed] ?? orders[0];
  const ordered = perm.map((i) => picks[i]).filter(isValidPick);

  if (ordered.length === 3) return ordered;

  return [
    { id: "color-conflict", name: "Color Conflict", category: "Focus", path: "/brain-age/color-conflict" },
    { id: "sequence-memory", name: "Sequence Memory", category: "Memory", path: "/brain-age/sequence-memory" },
    { id: "instant-comparison", name: "Instant Comparison", category: "Speed", path: "/brain-age/instant-comparison" },
  ];
}
