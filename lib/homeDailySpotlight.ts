import { canonicalGamePath } from "@/lib/canonicalGamePaths";
import { ALL_GAMES } from "@/lib/games";
import type { GameData } from "@/lib/types";

const TOP_N = 6;
/** Distinct from triathlon daily slots — stable pick among today’s top-N pool. */
const SPOTLIGHT_PICK_SLOT = 901;

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

function orderedTopNGamesByPlayCount(counts: Record<string, number>, n: number): GameData[] {
  const indexed = ALL_GAMES.map((g, idx) => ({
    game: g,
    idx,
    c: counts[g.id] ?? 0,
  }));
  indexed.sort((a, b) => {
    if (b.c !== a.c) return b.c - a.c;
    return a.idx - b.idx;
  });
  return indexed.slice(0, n).map((x) => x.game);
}

/**
 * Daily spotlight among the top `TOP_N` games by play count (ties: catalog order).
 * Uses the same play-count snapshot for “today” and “yesterday” so the pool is stable;
 * if the seeded pick matches yesterday’s pick, rotates to the next slot in the pool (no back-to-back).
 */
export function resolveHomeDailySpotlight(date: Date, counts: Record<string, number>): GameData {
  const pool = orderedTopNGamesByPlayCount(counts, TOP_N);
  if (pool.length === 0) return ALL_GAMES[0];
  if (pool.length === 1) return pool[0];

  const yesterday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - 1, 12, 0, 0, 0));
  const ySeed = utcDateSeed(yesterday);
  const tSeed = utcDateSeed(date);
  const yIdx = pickIndex(ySeed, SPOTLIGHT_PICK_SLOT, pool.length);
  const yId = pool[yIdx].id;

  let tIdx = pickIndex(tSeed, SPOTLIGHT_PICK_SLOT, pool.length);
  let pick = pool[tIdx];
  if (pick.id === yId) {
    tIdx = (tIdx + 1) % pool.length;
    pick = pool[tIdx];
  }
  return pick;
}

export function spotlightPlayPath(game: GameData): string {
  return canonicalGamePath(game);
}
