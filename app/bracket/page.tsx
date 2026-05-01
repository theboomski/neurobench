import type { Metadata } from "next";
import BracketHubClient from "@/components/ugc/BracketHubClient";
import { withUgcHubCardFallbacks } from "@/lib/ugcHubCardFallbacks";
import { getSupabaseServer } from "@/lib/supabase";

type HubGame = {
  id: string;
  user_id: string;
  type: "brackets" | "balance";
  title: string;
  description?: string | null;
  cover_image_url: string | null;
  bracket_preview_image_url?: string | null;
  balance_preview_label?: string | null;
  play_count: number;
  language: string;
  slug: string;
  category_id: number | null;
  creator: { display_name: string | null; avatar_url: string | null } | null;
  category: { name: string } | null;
};

export const metadata: Metadata = {
  title: "Free Bracket & Balance Games – Create & Play | ZAZAZA",
  description:
    "Play community-made bracket tournaments and balance games. Vote for your favorites, create your own, and share the results. Free, no signup.",
  openGraph: {
    title: "Free Bracket & Balance Games – Create & Play | ZAZAZA",
    description:
      "Play community-made bracket tournaments and balance games. Vote for your favorites, create your own, and share the results. Free, no signup.",
    url: "https://zazaza.app/bracket",
  },
};

async function getBracketBootstrap() {
  const supabase = getSupabaseServer();
  if (!supabase) return { games: [] as HubGame[], categories: [] as Array<{ id: number; name: string }>, languages: [] as Array<{ code: string; count: number }> };

  const [{ data: gamesRaw }, { data: categoriesRaw }, langRpc] = await Promise.all([
    supabase
      .from("ugc_games")
      .select("id,user_id,type,title,description,cover_image_url,category_id,language,play_count,slug,created_at")
      .eq("visibility", "public")
      .eq("is_approved", true)
      .eq("is_nsfw", false)
      .order("created_at", { ascending: false })
      .limit(16),
    supabase.from("ugc_categories").select("id,name").eq("is_active", true).order("order", { ascending: true }),
    supabase.rpc("get_ugc_public_language_counts"),
  ]);
  const langAgg = langRpc.error ? null : langRpc.data;

  const gameRows = (gamesRaw ?? []) as Array<Omit<HubGame, "creator" | "category">>;
  const userIds = [...new Set(gameRows.map((g) => g.user_id))];
  const categoryIds = [...new Set(gameRows.map((g) => g.category_id).filter((v): v is number => typeof v === "number"))];
  const [{ data: profiles }, { data: categoriesForGames }] = await Promise.all([
    userIds.length ? supabase.from("profiles").select("id,display_name,avatar_url").in("id", userIds) : Promise.resolve({ data: [] as Array<{ id: string; display_name: string | null; avatar_url: string | null }> }),
    categoryIds.length ? supabase.from("ugc_categories").select("id,name").in("id", categoryIds) : Promise.resolve({ data: [] as Array<{ id: number; name: string }> }),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const categoryMap = new Map((categoriesForGames ?? []).map((c) => [c.id, c]));
  const languages = (langAgg as { language: string; count: number }[] | null | undefined)?.length
    ? (langAgg as { language: string; count: number }[]).map((r) => ({
        code: String(r.language ?? "").trim().toLowerCase(),
        count: Number(r.count) || 0,
      }))
    : [];

  const gamesWithMeta = gameRows.map((g) => ({
    ...g,
    creator: profileMap.get(g.user_id) ?? null,
    category: g.category_id ? categoryMap.get(g.category_id) ?? null : null,
  }));
  const games = await withUgcHubCardFallbacks(supabase, gamesWithMeta);

  return {
    games,
    categories: (categoriesRaw ?? []).map((c) => ({ id: c.id, name: c.name })),
    languages,
  };
}

export default async function BracketHubPage() {
  const bootstrap = await getBracketBootstrap();
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 16px 56px" }}>
      <div style={{ marginBottom: 14 }}>
        <div className="ad-slot ad-banner">Advertisement</div>
      </div>

      <BracketHubClient initialGames={bootstrap.games} initialCategories={bootstrap.categories} initialLanguages={bootstrap.languages} />

      <div style={{ paddingTop: 20 }}>
        <div className="ad-slot ad-banner">Advertisement</div>
      </div>
    </div>
  );
}
