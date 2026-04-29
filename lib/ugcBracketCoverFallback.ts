import type { SupabaseClient } from "@supabase/supabase-js";

type GameWithCover = { id: string; type: string; cover_image_url: string | null };

/**
 * Hub cards: bracket games with no `cover_image_url` use the first contender's
 * `image_url` (lowest `order` in `ugc_brackets_items`).
 */
export async function withBracketHubCoverFallbacks<T extends GameWithCover>(supabase: SupabaseClient, games: T[]): Promise<T[]> {
  const needIds = games.filter((g) => g.type === "brackets" && !String(g.cover_image_url ?? "").trim()).map((g) => g.id);
  if (!needIds.length) return games;

  const { data: items, error } = await supabase.from("ugc_brackets_items").select("game_id,image_url,order").in("game_id", needIds);
  if (error || !items?.length) return games;

  const best = new Map<string, { order: number; url: string }>();
  for (const row of items) {
    const gid = String((row as { game_id: string }).game_id);
    const url = String((row as { image_url?: string | null }).image_url ?? "").trim();
    if (!url) continue;
    const ord = Number((row as { order?: number | null }).order ?? 0);
    const cur = best.get(gid);
    if (!cur || ord < cur.order) best.set(gid, { order: ord, url });
  }
  if (best.size === 0) return games;

  const urlByGameId = new Map([...best.entries()].map(([k, v]) => [k, v.url]));

  return games.map((g) => {
    if (String(g.cover_image_url ?? "").trim()) return g;
    const fb = g.type === "brackets" ? urlByGameId.get(g.id) : undefined;
    if (!fb) return g;
    return { ...g, cover_image_url: fb };
  });
}
