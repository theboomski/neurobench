import type { GameData } from "@/lib/types";
import gamesJson from "@/content/games.json";

export type CategoryMeta = {
  id: string;
  name: string;
  emoji: string;
  description: string;
};

type GamesBundle = { categories: CategoryMeta[]; games: GameData[] };

function loadGames(): { games: GameData[]; categories: CategoryMeta[] } {
  const raw = gamesJson as unknown as GameData[] | GamesBundle;
  if (Array.isArray(raw)) {
    return { games: raw as GameData[], categories: [] };
  }
  const b = raw as GamesBundle;
  return {
    games: (b.games ?? []) as GameData[],
    categories: b.categories ?? [],
  };
}

const loaded = loadGames();
export const ALL_GAMES = loaded.games;
export const CATEGORY_META = loaded.categories;
