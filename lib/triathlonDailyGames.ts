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

function seededRandom(seed: number, index: number): number {
  const x = Math.sin(seed + index) * 10000;
  return x - Math.floor(x);
}

/** Same calendar day in the user agent yields the same three picks (local date). */
export function getDailyGames(date = new Date()): DailyTriathlonPick[] {
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();

  const focusIndex = Math.floor(seededRandom(seed, 0) * TRIATHLON_GAMES.focus.length);
  const memoryIndex = Math.floor(seededRandom(seed, 1) * TRIATHLON_GAMES.memory.length);
  const speedIndex = Math.floor(seededRandom(seed, 2) * TRIATHLON_GAMES.speed.length);

  return [
    TRIATHLON_GAMES.focus[focusIndex],
    TRIATHLON_GAMES.memory[memoryIndex],
    TRIATHLON_GAMES.speed[speedIndex],
  ];
}
