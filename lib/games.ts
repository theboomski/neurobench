import type { GameData } from "@/lib/types";
import gamesJson from "@/content/games.json";

export type CategoryMeta = {
  id: string;
  name: string;
  emoji: string;
  description: string;
};

type GamesBundle = { categories: CategoryMeta[]; games: GameData[] };

/**
 * Used when games.json is a legacy flat array, or when `categories` is missing/empty
 * (e.g. bad merge). Keeps the homepage and nav from rendering zero categories.
 */
const DEFAULT_CATEGORY_META: CategoryMeta[] = [
  { id: "brain-age", name: "Brain Age Test", emoji: "🧠", description: "Memory, reaction time, attention & processing speed. Find your cognitive brain age." },
  { id: "office-iq", name: "Office IQ Test", emoji: "💼", description: "Workplace survival instincts, negotiation timing & professional boundary recognition." },
  { id: "focus-test", name: "Focus & Attention", emoji: "🎯", description: "Attention span, distraction resistance & cognitive flexibility." },
  { id: "dark-personality", name: "Dark Personality", emoji: "🌑", description: "Dark Triad score, empathy index & manipulation detection." },
  { id: "word-iq", name: "Vocab & Word IQ", emoji: "📚", description: "Vocabulary age, word recognition speed & semantic intelligence." },
  { id: "relationship", name: "Relationship IQ", emoji: "💔", description: "Red flags, attachment styles, love languages." },
  { id: "money", name: "Money IQ", emoji: "💰", description: "Mindset, risk tolerance, financial literacy." },
  { id: "korean-tv", name: "Korean TV Shows", emoji: "🎮", description: "Inspired by crazy Korean TV shows. Can you survive?" },
];

function fillCategoriesIfMissing(games: GameData[], categories: CategoryMeta[]): CategoryMeta[] {
  if (categories.length > 0) return categories;
  if (games.length === 0) return [];

  const ids = new Set(games.map(g => g.category));
  const ordered: CategoryMeta[] = [];

  for (const c of DEFAULT_CATEGORY_META) {
    if (ids.has(c.id as GameData["category"])) ordered.push(c);
  }

  for (const id of ids) {
    if (ordered.some(c => c.id === id)) continue;
    const g = games.find(x => x.category === id);
    ordered.push({
      id,
      name: g?.categoryLabel ?? id,
      emoji: "🎮",
      description: "Browse tests in this category.",
    });
  }

  return ordered;
}

function loadGames(): { games: GameData[]; categories: CategoryMeta[] } {
  const raw = gamesJson as unknown as GameData[] | GamesBundle;
  if (Array.isArray(raw)) {
    const games = raw as GameData[];
    return { games, categories: fillCategoriesIfMissing(games, []) };
  }
  const b = raw as GamesBundle;
  const games = (b.games ?? []) as GameData[];
  const categories = fillCategoriesIfMissing(games, b.categories ?? []);
  return { games, categories };
}

const loaded = loadGames();
export const ALL_GAMES = loaded.games;
export const CATEGORY_META = loaded.categories;
