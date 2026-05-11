import HomePageClient from "./HomePageClient";
import { getCachedArenaLeaderboardData } from "@/lib/arenaLeaderboardData";
import { fetchGamePlayCountsFromDb } from "@/lib/serverGamePlayCounts";

/** Home Popular uses DB counts; refresh periodically without reorder flash on first paint. */
export const revalidate = 120;

const ARENA_PREVIEW_N = 3;

export default async function HomePage() {
  const [playResult, arena] = await Promise.all([fetchGamePlayCountsFromDb(), getCachedArenaLeaderboardData()]);
  const initialPlayCounts = playResult.ok ? playResult.counts : {};
  const arenaPreview = {
    countryRankings: arena.countryRankings.slice(0, ARENA_PREVIEW_N),
    weeklyLeaders: arena.weeklyLeaders.slice(0, ARENA_PREVIEW_N),
    hallOfFame: arena.hallOfFame.slice(0, ARENA_PREVIEW_N),
  };
  return <HomePageClient initialPlayCounts={initialPlayCounts} arenaPreview={arenaPreview} />;
}
