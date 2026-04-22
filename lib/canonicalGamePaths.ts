import type { GameData } from "@/lib/types";

const DEDICATED_STATIC_KEYS = new Set(["korean-tv:red-light-green-light", "brain-age:sudoku"]);

export function isDedicatedStaticGame(game: GameData): boolean {
  return DEDICATED_STATIC_KEYS.has(`${game.category}:${game.id}`);
}

/** Canonical play URL (matches static routes where applicable). */
export function canonicalGamePath(game: GameData): string {
  const key = `${game.category}:${game.id}`;
  if (key === "brain-age:sudoku") return "/brain-age/sudoku";
  if (key === "korean-tv:red-light-green-light") return "/korean-tv/red-light-green-light";
  return `/${game.category}/${game.id}`;
}

/** Canonical shareable result URL. */
export function canonicalResultPath(game: GameData): string {
  const key = `${game.category}:${game.id}`;
  if (key === "brain-age:sudoku") return "/brain-age/sudoku/result";
  if (key === "korean-tv:red-light-green-light") return "/korean-tv/red-light-green-light/result";
  return `/${game.category}/${game.id}/result`;
}
