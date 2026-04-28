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

export function deriveItemNameFromFilename(fileName: string): string {
  const base = fileName.replace(/\.[^/.]+$/, "");
  return base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

export function sanitizeStorageFileName(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  const hasExt = lastDot > 0;
  const rawBase = hasExt ? fileName.slice(0, lastDot) : fileName;
  const rawExt = hasExt ? fileName.slice(lastDot + 1).toLowerCase() : "bin";
  const safeBase = rawBase
    .normalize("NFKD")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  const safeExt = rawExt.replace(/[^a-z0-9]+/g, "");
  return `${safeBase || "file"}.${safeExt || "bin"}`;
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
