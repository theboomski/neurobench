import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import UgcBracketsClient from "@/components/ugc/UgcBracketsClient";
import {
  UGC_SITE_BASE,
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
  if (!row || (!row.is_approved && row.visibility !== "private")) notFound();
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
  if (!game || (!game.is_approved && game.visibility !== "private")) notFound();

  const cat = Array.isArray(game.category) ? game.category[0] ?? null : game.category;
  const gameUrl = `${UGC_SITE_BASE}/ugc/brackets/${game.slug}`;
  const gameTitleSeo = nsfwLabel(game.title, game.is_nsfw);
  const gameDesc = game.description?.trim() || `Vote in ${game.title} on ZAZAZA.`;
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
              background: "#00FF94",
              color: "#06311d",
              fontWeight: 800,
            }}
          >
            Back to Brackets
          </Link>
        </div>
      </>
    );
  }

  const { data: items } = await supabase
    .from("ugc_brackets_items")
    .select("id,name,image_url,order,win_count,match_count")
    .eq("game_id", game.id)
    .order("order", { ascending: true });
  if (!items?.length) notFound();

  const { data: winners } = await supabase
    .from("ugc_play_history")
    .select("winner_item_id")
    .eq("game_id", game.id)
    .not("winner_item_id", "is", null);

  const finalWins = new Map<string, number>();
  for (const row of winners ?? []) {
    const id = row.winner_item_id as string | null;
    if (!id) continue;
    finalWins.set(id, (finalWins.get(id) ?? 0) + 1);
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

  const { category: _c, cover_image_url: _cover, is_nsfw: _n, ...gameForClient } = game;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: gameJsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }} />
      <UgcBracketsClient game={gameForClient} items={items} scoreboard={scoreboard} />
    </>
  );
}
