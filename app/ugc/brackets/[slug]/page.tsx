import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import UgcBracketsClient from "@/components/ugc/UgcBracketsClient";
import {
  UGC_SITE_BASE,
  bracketsPlayDescription,
  bracketsPlayMetadata,
  countUgcBracketItems,
  fetchUgcGameForSeo,
  nsfwLabel,
  ugcGameJsonLdParts,
} from "@/lib/ugcSeo";
import { getSupabaseServer } from "@/lib/supabase";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = getSupabaseServer();
  if (!supabase) return {};
  const row = await fetchUgcGameForSeo(supabase, slug, "brackets");
  if (!row) notFound();
  const itemCount = await countUgcBracketItems(supabase, row.id);
  return bracketsPlayMetadata(row, itemCount);
}

export default async function UgcBracketsPlayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = getSupabaseServer();
  if (!supabase) notFound();

  const { data: game } = await supabase
    .from("ugc_games")
    .select("id,type,title,description,slug,visibility,is_approved,play_count,is_nsfw,cover_image_url,category:ugc_categories(name,slug)")
    .eq("slug", slug)
    .eq("type", "brackets")
    .single();
  if (!game) notFound();

  const cat = Array.isArray(game.category) ? game.category[0] ?? null : game.category;
  const gameUrl = `${UGC_SITE_BASE}/ugc/brackets/${game.slug}`;
  const gameTitleSeo = nsfwLabel(game.title, game.is_nsfw);
  const { count: itemCount } = await supabase.from("ugc_brackets_items").select("*", { count: "exact", head: true }).eq("game_id", game.id);
  const gameDesc = bracketsPlayDescription(game.title, Number(game.play_count ?? 0), Number(itemCount ?? 0));
  const crumbs = [
    { name: "Home", url: `${UGC_SITE_BASE}/` },
    { name: "Brackets", url: `${UGC_SITE_BASE}/bracket` },
    ...(cat ? [{ name: cat.name, url: `${UGC_SITE_BASE}/ugc/brackets/category/${cat.slug}` }] : []),
    { name: gameTitleSeo, url: gameUrl },
  ];
  const { gameJsonLd, breadcrumbJsonLd } = ugcGameJsonLdParts({
    name: gameTitleSeo,
    description: gameDesc,
    url: gameUrl,
    breadcrumbs: crumbs,
  });

  if (game.visibility === "closed") {
    return (
      <>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: gameJsonLd }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }} />
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 16px 56px" }}>
          <h1 style={{ fontSize: 28, fontWeight: 900 }}>{game.title}</h1>
          <p style={{ color: "var(--text-2)", marginTop: 8 }}>This game is closed and not accepting new plays.</p>
          <Link
            href="/bracket"
            style={{
              display: "inline-block",
              marginTop: 14,
              textDecoration: "none",
              borderRadius: 10,
              padding: "10px 12px",
              background: "#D4823A",
              color: "#0F0D0B",
              fontWeight: 800,
            }}
          >
            Back to Brackets
          </Link>
        </div>
      </>
    );
  }

  let items:
    | Array<{
        id: string;
        name: string;
        image_url: string;
        video_url?: string | null;
        order: number;
        win_count: number | null;
        match_count: number | null;
      }>
    | null
    | undefined;

  const withVideo = await supabase
    .from("ugc_brackets_items")
    .select("id,name,image_url,video_url,order,win_count,match_count")
    .eq("game_id", game.id)
    .order("order", { ascending: true });

  if (!withVideo.error) {
    items = withVideo.data;
  } else {
    // Backward compatibility: if DB migration for `video_url` is not applied yet,
    // fall back to legacy shape so bracket pages never 404.
    const legacy = await supabase
      .from("ugc_brackets_items")
      .select("id,name,image_url,order,win_count,match_count")
      .eq("game_id", game.id)
      .order("order", { ascending: true });
    items = legacy.data?.map((row) => ({ ...row, video_url: null }));
  }
  if (!items?.length) notFound();

  const finalWins = new Map<string, number>();
  const { data: finalRows } = await supabase.rpc("ugc_bracket_final_wins", { p_game_id: game.id });
  for (const row of finalRows ?? []) {
    const id = (row as { winner_item_id?: string | null }).winner_item_id ?? null;
    if (!id) continue;
    const count = Number((row as { final_wins?: number | string }).final_wins ?? 0);
    finalWins.set(id, count);
  }

  const scoreboard = items.map((item) => {
    const finalWinsCount = finalWins.get(item.id) ?? 0;
    return {
      id: item.id,
      name: item.name,
      image_url: item.image_url,
      matchCount: Number(item.match_count ?? 0),
      winCount: Number(item.win_count ?? 0),
      finalWinsCount,
    };
  });
  const itemsForClient = items.map((item) => ({
    ...item,
    video_url: item.video_url ?? null,
    win_count: Number(item.win_count ?? 0),
    match_count: Number(item.match_count ?? 0),
  }));

  const { category: _c, cover_image_url: _cover, is_nsfw: _n, ...gameForClient } = game;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: gameJsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }} />
      <UgcBracketsClient game={gameForClient} items={itemsForClient} scoreboard={scoreboard} />
    </>
  );
}
