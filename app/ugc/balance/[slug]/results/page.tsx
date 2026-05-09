import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { balanceResultsMetadata, fetchUgcGameForSeo } from "@/lib/ugcSeo";
import { getSupabaseServer } from "@/lib/supabase";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = getSupabaseServer();
  if (!supabase) return {};
  const row = await fetchUgcGameForSeo(supabase, slug, "balance");
  if (!row) notFound();
  return balanceResultsMetadata(row);
}

export default async function UgcBalanceResultsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = getSupabaseServer();
  if (!supabase) notFound();

  const { data: game } = await supabase
    .from("ugc_games")
    .select("id,title,slug,play_count,balance_a_pick_count,balance_b_pick_count,visibility,is_approved")
    .eq("slug", slug)
    .eq("type", "balance")
    .single();
  if (!game) notFound();

  const { data: options } = await supabase
    .from("ugc_balance_options")
    .select("id,option_a,option_b,round,order")
    .eq("game_id", game.id)
    .order("order", { ascending: true });
  if (!options?.length) notFound();

  const first = options[0];
  const optionALabel = first?.option_a?.trim() || "Option A";
  const optionBLabel = first?.option_b?.trim() || "Option B";

  const { data: winnerRows } = await supabase
    .from("ugc_play_history")
    .select("winner_option")
    .eq("game_id", game.id)
    .not("winner_option", "is", null);
  const totalFinals = winnerRows?.length ?? 0;
  const aFinalWins = (winnerRows ?? []).filter((x) => x.winner_option === "a").length;
  const bFinalWins = totalFinals - aFinalWins;

  const totalRound = Number(game.balance_a_pick_count ?? 0) + Number(game.balance_b_pick_count ?? 0);
  const aRoundRatio = totalRound > 0 ? Math.round((Number(game.balance_a_pick_count ?? 0) / totalRound) * 1000) / 10 : 0;
  const bRoundRatio = totalRound > 0 ? Math.round((Number(game.balance_b_pick_count ?? 0) / totalRound) * 1000) / 10 : 0;
  const totalPlays = Number(game.play_count ?? 0);
  const aFinalRatio = totalPlays > 0 ? Math.round((aFinalWins / totalPlays) * 1000) / 10 : 0;
  const bFinalRatio = totalPlays > 0 ? Math.round((bFinalWins / totalPlays) * 1000) / 10 : 0;

  const rows = [
    { id: "a", name: optionALabel, roundRatio: aRoundRatio, finalRatio: aFinalRatio },
    { id: "b", name: optionBLabel, roundRatio: bRoundRatio, finalRatio: bFinalRatio },
  ].sort((x, y) => (y.finalRatio !== x.finalRatio ? y.finalRatio - x.finalRatio : y.roundRatio - x.roundRatio));

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "22px 16px 56px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 900 }}>{game.title} Results</h1>
      <p style={{ marginTop: 8, color: "var(--text-2)", fontSize: 14 }}>Aggregate win ratios from all plays.</p>
      <div style={{ marginTop: 14, border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--bg-card)" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "64px minmax(120px,1fr) minmax(120px,1fr) minmax(120px,1fr)",
            gap: 10,
            alignItems: "center",
            padding: "10px 12px",
            borderBottom: "1px solid var(--border)",
            fontSize: 12,
            color: "var(--text-1)",
            fontFamily: "var(--font-mono)",
            fontWeight: 900,
            letterSpacing: "0.02em",
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div>Rank</div>
          <div>Option</div>
          <div>Round Win Ratio</div>
          <div>Final Win Ratio</div>
        </div>
        {rows.map((row, idx) => (
          <div
            key={row.id}
            style={{
              display: "grid",
              gridTemplateColumns: "64px minmax(120px,1fr) minmax(120px,1fr) minmax(120px,1fr)",
              gap: 10,
              alignItems: "center",
              padding: "10px 12px",
              borderBottom: idx === rows.length - 1 ? "none" : "1px solid var(--border)",
            }}
          >
            <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-2)", fontWeight: 800 }}>#{idx + 1}</div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>{row.name}</div>
            <div style={{ display: "grid", gap: 4 }}>
              <div style={{ height: 8, borderRadius: 999, background: "rgba(148,163,184,0.22)", overflow: "hidden" }}>
                <div style={{ width: `${Math.max(0, Math.min(100, row.roundRatio))}%`, height: "100%", background: "#22c55e" }} />
              </div>
              <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-2)" }}>{row.roundRatio.toFixed(1)}%</div>
            </div>
            <div style={{ display: "grid", gap: 4 }}>
              <div style={{ height: 8, borderRadius: 999, background: "rgba(148,163,184,0.22)", overflow: "hidden" }}>
                <div style={{ width: `${Math.max(0, Math.min(100, row.finalRatio))}%`, height: "100%", background: "#3b82f6" }} />
              </div>
              <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-2)" }}>{row.finalRatio.toFixed(1)}%</div>
            </div>
          </div>
        ))}
      </div>
      <Link
        href={`/ugc/balance/${game.slug}`}
        style={{
          display: "inline-block",
          marginTop: 14,
          padding: "10px 12px",
          borderRadius: 10,
          background: "#D4823A",
          color: "#05291a",
          fontWeight: 800,
          textDecoration: "none",
        }}
      >
        Play Again
      </Link>
    </div>
  );
}
