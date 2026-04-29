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

function firstBracketImageByGameId(items: Array<{ game_id?: string | null; image_url?: string | null; order?: number | string | null }> | null) {
  const best = new Map<string, { order: number; url: string }>();
  for (const row of items ?? []) {
    const gid = String(row.game_id ?? "");
    if (!gid) continue;
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

async function applyBracketCoverFallbacks<T extends UgcHubCardGameBase>(supabase: SupabaseClient, games: T[]): Promise<T[]> {
  const bracketIds = games.filter((g) => g.type === "brackets" && noCover(g)).map((g) => g.id);
  if (!bracketIds.length) return games;

  const { data: items, error } = await supabase.from("ugc_brackets_items").select("game_id,image_url,order").in("game_id", bracketIds);
  if (error || !items?.length) return games;

  const urlByGame = firstBracketImageByGameId(items);
  if (!urlByGame.size) return games;

  return games.map((g) => {
    if (!noCover(g) || g.type !== "brackets") return g;
    const u = urlByGame.get(g.id);
    return u ? { ...g, cover_image_url: u } : g;
  });
}

async function applyBalanceTextFallbacks<T extends UgcHubCardGameBase>(supabase: SupabaseClient, games: T[]): Promise<T[]> {
  const balanceIds = games.filter((g) => g.type === "balance" && noCover(g)).map((g) => g.id);
  if (!balanceIds.length) return games;

  const { data: items, error } = await supabase.from("ugc_balance_options").select("game_id,option_a,order").in("game_id", balanceIds);
  if (error || !items?.length) return games;

  const labelByGame = firstBalanceLabelByGameId(items);
  if (!labelByGame.size) return games;

  return games.map((g) => {
    if (!noCover(g) || g.type !== "balance") return g;
    const label = labelByGame.get(g.id);
    return label ? { ...g, balance_preview_label: label } : g;
  });
}

/**
 * Hub cards: bracket games with no `cover_image_url` use the first contender's
 * `image_url` (lowest `order` in `ugc_brackets_items`). Balance games with no
 * cover get `balance_preview_label` from the first row's `option_a`.
 */
export async function withUgcHubCardFallbacks<T extends UgcHubCardGameBase>(supabase: SupabaseClient, games: T[]): Promise<T[]> {
  const withBracketCovers = await applyBracketCoverFallbacks(supabase, games);
  return applyBalanceTextFallbacks(supabase, withBracketCovers);
}
