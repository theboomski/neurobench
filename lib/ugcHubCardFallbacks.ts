import type { SupabaseClient } from "@supabase/supabase-js";

/** Hub / feed card row: optional text preview for balance games without a cover image. */
export type UgcHubCardGameBase = {
  id: string;
  type: string;
  cover_image_url: string | null;
  balance_preview_label?: string | null;
};

function noCover(g: UgcHubCardGameBase) {
  return !String(g.cover_image_url ?? "").trim();
}

function firstBracketImageByGameId(items: { game_id: string; image_url: string | null; order: number | null }[] | null) {
  const best = new Map<string, { order: number; url: string }>();
  for (const row of items ?? []) {
    const gid = String(row.game_id);
    const url = String(row.image_url ?? "").trim();
    if (!url) continue;
    const ord = Number(row.order ?? 0);
    const cur = best.get(gid);
    if (!cur || ord < cur.order) best.set(gid, { order: ord, url });
  }
  return new Map([...best.entries()].map(([k, v]) => [k, v.url]));
}

function firstBalanceLabelByGameId(items: { game_id: string; option_a: string; order: number | null }[] | null) {
  const best = new Map<string, { order: number; label: string }>();
  for (const row of items ?? []) {
    const gid = String(row.game_id);
    const label = String(row.option_a ?? "").trim();
    if (!label) continue;
    const ord = Number(row.order ?? 0);
    const cur = best.get(gid);
    if (!cur || ord < cur.order) best.set(gid, { order: ord, label });
  }
  return new Map([...best.entries()].map(([k, v]) => [k, v.label]));
}

/**
 * Hub cards: bracket games with no `cover_image_url` use the first contender's
 * `image_url` (lowest `order` in `ugc_brackets_items`). Balance games with no
 * cover get `balance_preview_label` from the first row's `option_a`.
 */
export async function withUgcHubCardFallbacks<T extends UgcHubCardGameBase>(supabase: SupabaseClient, games: T[]): Promise<T[]> {
  const bracketIds = games.filter((g) => g.type === "brackets" && noCover(g)).map((g) => g.id);
  const balanceIds = games.filter((g) => g.type === "balance" && noCover(g)).map((g) => g.id);

  const [bracketRes, balanceRes] = await Promise.all([
    bracketIds.length
      ? supabase.from("ugc_brackets_items").select("game_id,image_url,order").in("game_id", bracketIds)
      : Promise.resolve({ data: [] as { game_id: string; image_url: string | null; order: number | null }[], error: null }),
    balanceIds.length
      ? supabase.from("ugc_balance_options").select("game_id,option_a,order").in("game_id", balanceIds)
      : Promise.resolve({ data: [] as { game_id: string; option_a: string; order: number | null }[], error: null }),
  ]);

  const urlByGame = bracketRes.error ? new Map<string, string>() : firstBracketImageByGameId(bracketRes.data ?? []);
  const labelByGame = balanceRes.error ? new Map<string, string>() : firstBalanceLabelByGameId(balanceRes.data ?? []);

  return games.map((g) => {
    if (!noCover(g)) return g;
    if (g.type === "brackets") {
      const u = urlByGame.get(g.id);
      return u ? { ...g, cover_image_url: u } : g;
    }
    if (g.type === "balance") {
      const lab = labelByGame.get(g.id);
      return lab ? { ...g, balance_preview_label: lab } : g;
    }
    return g;
  });
}
