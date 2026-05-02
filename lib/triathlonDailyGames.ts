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

/** Append `mode=triathlon` for in-flow game URLs (chain + Sequence Memory triathlon mode). */
export function appendTriathlonModeQuery(path: string): string {
  const joiner = path.includes("?") ? "&" : "?";
  return `${path}${joiner}mode=triathlon`;
}

function seededRandom(seed: number, index: number): number {
  const x = Math.sin(seed + index) * 10000;
  return x - Math.floor(x);
}

/** Same UTC calendar day yields the same three picks; category play order is also seeded. */
export function getDailyGames(date = new Date()): DailyTriathlonPick[] {
  const today = date;
  const seed = today.getUTCFullYear() * 10000 + (today.getUTCMonth() + 1) * 100 + today.getUTCDate();

  const focusPick = TRIATHLON_GAMES.focus[Math.floor(seededRandom(seed, 0) * TRIATHLON_GAMES.focus.length)];
  const memoryPick = TRIATHLON_GAMES.memory[Math.floor(seededRandom(seed, 1) * TRIATHLON_GAMES.memory.length)];
  const speedPick = TRIATHLON_GAMES.speed[Math.floor(seededRandom(seed, 2) * TRIATHLON_GAMES.speed.length)];

  const picks = [focusPick, memoryPick, speedPick];
  const orderSeed = Math.floor(seededRandom(seed, 3) * 6);
  const orders = [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0],
  ];
  return orders[orderSeed].map((i) => picks[i]);
}
