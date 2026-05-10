import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import UgcBalanceClient from "@/components/ugc/UgcBalanceClient";
import {
  UGC_SITE_BASE,
  balancePlayMetadata,
  countUgcBalanceOptions,
  fetchUgcGameForSeo,
  nsfwLabel,
  ugcGameJsonLdParts,
} from "@/lib/ugcSeo";
import { getSupabaseServer } from "@/lib/supabase";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = getSupabaseServer();
  if (!supabase) return {};
  const row = await fetchUgcGameForSeo(supabase, slug, "balance");
  if (!row) notFound();
  const optionCount = await countUgcBalanceOptions(supabase, row.id);
  return balancePlayMetadata(row, optionCount);
}

export default async function UgcBalancePlayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = getSupabaseServer();
  if (!supabase) notFound();

  const { data: game } = await supabase
    .from("ugc_games")
    .select("id,type,title,description,slug,visibility,is_approved,play_count,balance_a_pick_count,balance_b_pick_count,is_nsfw,cover_image_url,category:ugc_categories(name,slug)")
    .eq("slug", slug)
    .eq("type", "balance")
    .single();
  if (!game) notFound();

  const cat = Array.isArray(game.category) ? game.category[0] ?? null : game.category;
  const gameUrl = `${UGC_SITE_BASE}/ugc/balance/${game.slug}`;
  const gameTitleSeo = nsfwLabel(game.title, game.is_nsfw);
  const gameDesc = game.description?.trim() || `Play ${game.title} on ZAZAZA.`;
  const crumbs = [
    { name: "Home", url: `${UGC_SITE_BASE}/` },
    { name: "Balance", url: `${UGC_SITE_BASE}/ugc` },
    ...(cat ? [{ name: cat.name, url: `${UGC_SITE_BASE}/ugc/balance/category/${cat.slug}` }] : []),
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
              background: "var(--accent)",
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

  const { data: options } = await supabase
    .from("ugc_balance_options")
    .select("id,option_a,option_b,round,order")
    .eq("game_id", game.id)
    .order("order", { ascending: true });
  if (!options?.length) notFound();
  const { data: winnerRows } = await supabase
    .from("ugc_play_history")
    .select("winner_option")
    .eq("game_id", game.id)
    .not("winner_option", "is", null);
  const totalFinals = winnerRows?.length ?? 0;
  const aFinalWins = (winnerRows ?? []).filter((x) => x.winner_option === "a").length;
  const bFinalWins = totalFinals - aFinalWins;

  const { category: _c, cover_image_url: _cover, is_nsfw: _n, ...gameForClient } = game;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: gameJsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }} />
      <UgcBalanceClient
        game={gameForClient}
        options={options}
        summary={{
          aFinalWins,
          bFinalWins,
          totalPlays: game.play_count,
          aRoundWins: Number(game.balance_a_pick_count ?? 0),
          bRoundWins: Number(game.balance_b_pick_count ?? 0),
        }}
      />
    </>
  );
}
