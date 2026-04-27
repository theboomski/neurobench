import Link from "next/link";
import { notFound } from "next/navigation";
import UgcBalanceClient from "@/components/ugc/UgcBalanceClient";
import { getSupabaseServer } from "@/lib/supabase";

export default async function UgcBalancePlayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = getSupabaseServer();
  if (!supabase) notFound();

  const { data: game } = await supabase
    .from("ugc_games")
    .select("id,type,title,description,slug,visibility,is_approved,play_count,balance_a_pick_count,balance_b_pick_count")
    .eq("slug", slug)
    .eq("type", "balance")
    .single();
  if (!game) notFound();
  if (game.visibility === "closed") {
    return (
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 16px 56px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>{game.title}</h1>
        <p style={{ color: "var(--text-2)", marginTop: 8 }}>This game is closed and not accepting new plays.</p>
        <Link href="/bracket" style={{ display: "inline-block", marginTop: 14, textDecoration: "none", borderRadius: 10, padding: "10px 12px", background: "#00FF94", color: "#06311d", fontWeight: 800 }}>
          Back to Brackets
        </Link>
      </div>
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

  return (
    <UgcBalanceClient
      game={game}
      options={options}
      summary={{
        aFinalWins,
        bFinalWins,
        totalPlays: game.play_count,
        aRoundWins: Number(game.balance_a_pick_count ?? 0),
        bRoundWins: Number(game.balance_b_pick_count ?? 0),
      }}
    />
  );
}
