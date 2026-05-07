/** Single pick for one triathlon leg (focus / memory / speed). */
export type DailyTriathlonPick = {
  id: string;
  name: string;
  category: string;
  path: string;
  /** Short cognitive label for triathlon result UI (e.g. "Inhibitory Control"). */
  cognitiveCategory: string;
};

/**
 * Pool for the daily triathlon. IDs and paths match live routes in this app
 * (spec used `memory-matrix` / `word-association-iq` + brain-age paths; here
 * `number-memory` is Memory Matrix, `word-association` lives under word-iq).
 */
export const TRIATHLON_GAMES = {
  focus: [
    {
      id: "color-conflict",
      name: "Color Conflict",
      category: "Focus",
      path: "/brain-age/color-conflict",
      cognitiveCategory: "Inhibitory Control",
    },
    {
      id: "color-conflict-2",
      name: "Color Conflict 2",
      category: "Focus",
      path: "/brain-age/color-conflict-2",
      cognitiveCategory: "Cognitive Interference",
    },
  ],
  memory: [
    {
      id: "sequence-memory",
      name: "Sequence Memory",
      category: "Memory",
      path: "/brain-age/sequence-memory",
      cognitiveCategory: "Working Memory",
    },
    {
      id: "number-memory",
      name: "Memory Matrix",
      category: "Memory",
      path: "/brain-age/number-memory",
      cognitiveCategory: "Digit Span Memory",
    },
    {
      id: "visual-memory",
      name: "Visual Memory",
      category: "Memory",
      path: "/brain-age/visual-memory",
      cognitiveCategory: "Spatial Memory",
    },
    {
      id: "chimp-test",
      name: "Chimp Test",
      category: "Memory",
      path: "/brain-age/chimp-test",
      cognitiveCategory: "Visuospatial Memory",
    },
    {
      id: "verbal-memory",
      name: "Verbal Memory",
      category: "Memory",
      path: "/brain-age/verbal-memory",
      cognitiveCategory: "Recognition Memory",
    },
  ],
  speed: [
    {
      id: "instant-comparison",
      name: "Instant Comparison",
      category: "Speed",
      path: "/brain-age/instant-comparison",
      cognitiveCategory: "Processing Speed",
    },
    {
      id: "fish-frenzy",
      name: "Fish Frenzy",
      category: "Speed",
      path: "/brain-age/fish-frenzy",
      cognitiveCategory: "Response Inhibition",
    },
  ],
} as const;

const ALL_PICKS: DailyTriathlonPick[] = [
  ...TRIATHLON_GAMES.focus,
  ...TRIATHLON_GAMES.memory,
  ...TRIATHLON_GAMES.speed,
];

const PICK_BY_ID = new Map<string, DailyTriathlonPick>(ALL_PICKS.map((p) => [p.id, p]));

const ALLOWED_TRIATHLON_IDS = new Set(ALL_PICKS.map((p) => p.id));

export type TriathlonPillar = "focus" | "memory" | "speed";

export function isAllowedTriathlonGameId(id: string): boolean {
  return ALLOWED_TRIATHLON_IDS.has(id);
}

export function triathlonPillarForGameId(id: string): TriathlonPillar | null {
  if (TRIATHLON_GAMES.focus.some((p) => p.id === id)) return "focus";
  if (TRIATHLON_GAMES.memory.some((p) => p.id === id)) return "memory";
  if (TRIATHLON_GAMES.speed.some((p) => p.id === id)) return "speed";
  return null;
}

export function getTriathlonPathForGameId(id: string): string | null {
  return PICK_BY_ID.get(id)?.path ?? null;
}

export function getTriathlonNameForGameId(id: string): string {
  return PICK_BY_ID.get(id)?.name ?? id;
}

export function getTriathlonCognitiveCategoryForGameId(id: string): string | null {
  return PICK_BY_ID.get(id)?.cognitiveCategory ?? null;
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

function utcDateSeed(date: Date): number {
  return date.getUTCFullYear() * 10000 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
}

function previousUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - 1, 0, 0, 0, 0));
}

function pickIndexNoBackToBack(todaySeed: number, yesterdaySeed: number, slot: number, len: number): number {
  if (len <= 1) return pickIndex(todaySeed, slot, len);
  const todayIdx = pickIndex(todaySeed, slot, len);
  const yesterdayIdx = pickIndex(yesterdaySeed, slot, len);
  return todayIdx === yesterdayIdx ? (todayIdx + 1) % len : todayIdx;
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
    typeof o.category === "string" &&
    typeof o.cognitiveCategory === "string" &&
    o.cognitiveCategory.length > 0
  );
}

/** Same UTC calendar day yields the same three picks; category play order is also seeded. */
export function getDailyGames(date = new Date()): DailyTriathlonPick[] {
  const todaySeed = utcDateSeed(date);
  const yesterdaySeed = utcDateSeed(previousUtcDay(date));

  const focusPick = TRIATHLON_GAMES.focus[pickIndexNoBackToBack(todaySeed, yesterdaySeed, 0, TRIATHLON_GAMES.focus.length)];
  const memoryPick = TRIATHLON_GAMES.memory[pickIndexNoBackToBack(todaySeed, yesterdaySeed, 1, TRIATHLON_GAMES.memory.length)];
  const speedPick = TRIATHLON_GAMES.speed[pickIndexNoBackToBack(todaySeed, yesterdaySeed, 2, TRIATHLON_GAMES.speed.length)];

  const picks = [focusPick, memoryPick, speedPick];
  const orderSeed = pickIndex(todaySeed, 3, 6);
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
    {
      id: "color-conflict",
      name: "Color Conflict",
      category: "Focus",
      path: "/brain-age/color-conflict",
      cognitiveCategory: "Inhibitory Control",
    },
    {
      id: "sequence-memory",
      name: "Sequence Memory",
      category: "Memory",
      path: "/brain-age/sequence-memory",
      cognitiveCategory: "Working Memory",
    },
    {
      id: "instant-comparison",
      name: "Instant Comparison",
      category: "Speed",
      path: "/brain-age/instant-comparison",
      cognitiveCategory: "Processing Speed",
    },
  ];
}
