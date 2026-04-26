import type { UgcGame, UgcGameType } from "@/lib/ugcTypes";

export function slugifyTitle(input: string): string {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "untitled";
}

export function withUniqueSuffix(slug: string): string {
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${slug}-${suffix}`;
}

export function deriveItemNameFromFilename(fileName: string): string {
  const base = fileName.replace(/\.[^/.]+$/, "");
  return base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

export function toUgcPath(game: Pick<UgcGame, "type" | "slug">): string {
  return game.type === "brackets" ? `/ugc/brackets/${game.slug}` : `/ugc/balance/${game.slug}`;
}

export function getUgcBadge(gameType: UgcGameType): string {
  return gameType === "brackets" ? "⊞" : "⚖";
}

export function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i];
    copy[i] = copy[j];
    copy[j] = tmp;
  }
  return copy;
}
