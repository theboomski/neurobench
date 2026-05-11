import { unstable_cache } from "next/cache";
import { ALL_GAMES } from "@/lib/games";
import { leaderboardUsesAscendingScore } from "@/lib/leaderboardConfig";
import { fetchGamePlayCountsFromDb } from "@/lib/serverGamePlayCounts";
import { getSupabaseServer } from "@/lib/supabase";

export type CountryRankRow = {
  countryCode: string;
  points: number;
};

export type HallOfFameRow = {
  gameId: string;
  gameTitle: string;
  gamePath: string;
  nickname: string | null;
  score: number | null;
  countryCode: string | null;
  playCount: number;
  hasAllTimeScore: boolean;
  streakDays: number | null;
};

export type WeeklyLeaderRow = {
  gameId: string;
  gameTitle: string;
  gamePath: string;
  nickname: string | null;
  score: number | null;
  countryCode: string | null;
  playCount: number;
  hasWeeklyScore: boolean;
};

type LeaderboardRow = {
  game_id: string;
  nickname: string;
  score: number;
  country_code: string;
  created_at: string;
};

const RANK_POINTS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

function calendarDaysHeld(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

export function getUtcWeekStart(now = new Date()): Date {
  const day = now.getUTCDay();
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMonday, 0, 0, 0, 0));
}

function compareRowsByGameRules(a: LeaderboardRow, b: LeaderboardRow): number {
  const asc = leaderboardUsesAscendingScore(a.game_id);
  if (a.score !== b.score) return asc ? a.score - b.score : b.score - a.score;
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

function buildCountryRankings(rows: LeaderboardRow[]): CountryRankRow[] {
  const grouped = new Map<string, LeaderboardRow[]>();
  for (const row of rows) {
    const key = row.game_id;
    const existing = grouped.get(key);
    if (existing) existing.push(row);
    else grouped.set(key, [row]);
  }

  const countryPoints = new Map<string, number>();
  for (const gameRows of grouped.values()) {
    const top = [...gameRows].sort(compareRowsByGameRules).slice(0, 10);
    top.forEach((entry, idx) => {
      const code = (entry.country_code || "US").toUpperCase();
      countryPoints.set(code, (countryPoints.get(code) ?? 0) + (RANK_POINTS[idx] ?? 0));
    });
  }

  return [...countryPoints.entries()]
    .map(([countryCode, points]) => ({
      countryCode,
      points,
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.countryCode.localeCompare(b.countryCode);
    });
}

function buildHallOfFame(rows: LeaderboardRow[], playCounts: Record<string, number>): HallOfFameRow[] {
  const leaderboardGames = ALL_GAMES.filter((game) => game.hasLeaderboard);
  const nameById = new Map(leaderboardGames.map((game) => [game.id, game.title]));
  const grouped = new Map<string, LeaderboardRow[]>();

  for (const row of rows) {
    if (!nameById.has(row.game_id)) continue;
    const existing = grouped.get(row.game_id);
    if (existing) existing.push(row);
    else grouped.set(row.game_id, [row]);
  }

  const hallRows: HallOfFameRow[] = [];
  for (const game of leaderboardGames) {
    const entries = grouped.get(game.id) ?? [];
    const best = entries.length > 0 ? [...entries].sort(compareRowsByGameRules)[0] : null;
    hallRows.push({
      gameId: game.id,
      gameTitle: game.title,
      gamePath: `/${game.category}/${game.id}`,
      nickname: best?.nickname ?? null,
      score: best?.score ?? null,
      countryCode: best ? (best.country_code || "US").toUpperCase() : null,
      playCount: playCounts[game.id] ?? 0,
      hasAllTimeScore: !!best,
      streakDays: best?.created_at ? calendarDaysHeld(best.created_at) : null,
    });
  }

  return hallRows.sort((a, b) => {
    if (b.playCount !== a.playCount) return b.playCount - a.playCount;
    return a.gameTitle.localeCompare(b.gameTitle);
  });
}

function buildWeeklyLeaders(rows: LeaderboardRow[], playCounts: Record<string, number>): WeeklyLeaderRow[] {
  const leaderboardGames = ALL_GAMES.filter((game) => game.hasLeaderboard);
  const nameById = new Map(leaderboardGames.map((game) => [game.id, game.title]));
  const grouped = new Map<string, LeaderboardRow[]>();

  for (const row of rows) {
    if (!nameById.has(row.game_id)) continue;
    const existing = grouped.get(row.game_id);
    if (existing) existing.push(row);
    else grouped.set(row.game_id, [row]);
  }

  const weeklyRows: WeeklyLeaderRow[] = [];
  for (const game of leaderboardGames) {
    const entries = grouped.get(game.id) ?? [];
    if (entries.length === 0) {
      weeklyRows.push({
        gameId: game.id,
        gameTitle: game.title,
        gamePath: `/${game.category}/${game.id}`,
        nickname: null,
        score: null,
        countryCode: null,
        playCount: playCounts[game.id] ?? 0,
        hasWeeklyScore: false,
      });
    } else {
      const best = [...entries].sort(compareRowsByGameRules)[0];
      weeklyRows.push({
        gameId: game.id,
        gameTitle: game.title,
        gamePath: `/${game.category}/${game.id}`,
        nickname: best.nickname,
        score: best.score,
        countryCode: (best.country_code || "US").toUpperCase(),
        playCount: playCounts[game.id] ?? 0,
        hasWeeklyScore: true,
      });
    }
  }

  return weeklyRows.sort((a, b) => {
    if (b.playCount !== a.playCount) return b.playCount - a.playCount;
    return a.gameTitle.localeCompare(b.gameTitle);
  });
}

async function fetchAllLeaderboardRows(): Promise<LeaderboardRow[]> {
  const sb = getSupabaseServer();
  if (!sb) return [];

  const rows: LeaderboardRow[] = [];
  const batch = 1000;
  let from = 0;
  while (true) {
    const to = from + batch - 1;
    const { data, error } = await sb
      .from("leaderboard")
      .select("game_id,nickname,score,country_code,created_at")
      .order("created_at", { ascending: true })
      .range(from, to);
    if (error) break;
    const list = (data ?? []) as LeaderboardRow[];
    rows.push(...list);
    if (list.length < batch) break;
    from += batch;
  }
  return rows;
}

export type ArenaLeaderboardSnapshot = {
  countryRankings: CountryRankRow[];
  weeklyLeaders: WeeklyLeaderRow[];
  hallOfFame: HallOfFameRow[];
};

/** Shared cache for Arena page and home triathlon preview (same revalidate as former arena-only cache). */
export const getCachedArenaLeaderboardData = unstable_cache(
  async (): Promise<ArenaLeaderboardSnapshot> => {
    const [allRows, playCountsResult] = await Promise.all([fetchAllLeaderboardRows(), fetchGamePlayCountsFromDb()]);
    const playCounts = playCountsResult.ok ? playCountsResult.counts : {};
    const weekStart = getUtcWeekStart();
    const weeklyRows = allRows.filter((row) => new Date(row.created_at).getTime() >= weekStart.getTime());
    return {
      countryRankings: buildCountryRankings(weeklyRows),
      weeklyLeaders: buildWeeklyLeaders(weeklyRows, playCounts),
      hallOfFame: buildHallOfFame(allRows, playCounts),
    };
  },
  ["arena-data-v2"],
  { revalidate: 60 },
);
