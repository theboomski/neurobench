import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import UgcTierShareButton from "@/components/ugc/UgcTierShareButton";
import { balanceTierMetadata, fetchUgcGameForSeo } from "@/lib/ugcSeo";
import { getSupabaseServer } from "@/lib/supabase";

type TierKey = "S" | "A" | "B" | "C" | "D";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = getSupabaseServer();
  if (!supabase) return {};
  const row = await fetchUgcGameForSeo(supabase, slug, "balance");
  if (!row) notFound();
  return balanceTierMetadata(row);
}

function getTier(ratio: number): TierKey {
  if (ratio >= 40) return "S";
  if (ratio >= 30) return "A";
  if (ratio >= 20) return "B";
  if (ratio >= 10) return "C";
  return "D";
}

function BalanceTierCard({ name, ratio }: { name: string; ratio: number }) {
  return (
    <div style={{ minWidth: 140, maxWidth: 220, border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", background: "rgba(255,255,255,0.02)" }}>
      <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.25 }}>{name}</div>
      <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{ratio.toFixed(1)}%</div>
    </div>
  );
}

export default async function UgcBalanceTierPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = getSupabaseServer();
  if (!supabase) notFound();

  const { data: game } = await supabase
    .from("ugc_games")
    .select("id,title,description,slug,visibility,is_approved,play_count")
    .eq("slug", slug)
    .eq("type", "balance")
    .single();
  if (!game) notFound();

  const { data: options } = await supabase.from("ugc_balance_options").select("option_a,option_b").eq("game_id", game.id).order("order", { ascending: true });
  if (!options?.length) notFound();
  const first = options[0];
  const optionALabel = first?.option_a?.trim() || "Option A";
  const optionBLabel = first?.option_b?.trim() || "Option B";

  const { data: winnerRows } = await supabase.from("ugc_play_history").select("winner_option").eq("game_id", game.id).not("winner_option", "is", null);
  const totalPlays = Math.max(0, Number(game.play_count ?? 0));
  const aWins = (winnerRows ?? []).filter((x) => x.winner_option === "a").length;
  const bWins = (winnerRows ?? []).filter((x) => x.winner_option === "b").length;

  const sideA = { id: "a" as const, name: optionALabel, ratio: totalPlays > 0 ? (aWins / totalPlays) * 100 : 0 };
  const sideB = { id: "b" as const, name: optionBLabel, ratio: totalPlays > 0 ? (bWins / totalPlays) * 100 : 0 };

  const tiers: Record<TierKey, Array<{ id: "a" | "b"; name: string; ratio: number }>> = { S: [], A: [], B: [], C: [], D: [] };
  tiers[getTier(sideA.ratio)].push(sideA);
  tiers[getTier(sideB.ratio)].push(sideB);

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px 56px" }}>
      <h1 style={{ fontSize: 34, fontWeight: 900 }}>{game.title}</h1>
      {game.description && <p style={{ marginTop: 8, color: "var(--text-2)", fontSize: 14, maxWidth: 760 }}>{game.description}</p>}
      <p style={{ marginTop: 8, color: "var(--text-3)", fontSize: 12 }}>Tiers based on current votes.</p>

      <div style={{ display: "flex", gap: 10, marginTop: 14, marginBottom: 12 }}>
        <UgcTierShareButton
          title={game.title}
          slug={game.slug}
          playCount={totalPlays}
          gameType="balance"
          style={{ background: "#b8860b", border: "none", color: "#231600", fontWeight: 900 }}
        />
        <Link
          href={`/ugc/balance/${game.slug}`}
          style={{
            borderRadius: 10,
            border: "1px solid var(--border)",
            padding: "10px 12px",
            background: "#000",
            color: "#fff",
            fontWeight: 800,
            textDecoration: "none",
          }}
        >
          Play Again
        </Link>
      </div>

      <div style={{ marginTop: 16, border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", background: "var(--bg-card)" }}>
        {(["S", "A", "B", "C", "D"] as TierKey[]).map((tier, idx, all) => (
          <div
            key={tier}
            style={{
              display: "grid",
              gridTemplateColumns: "88px 1fr",
              gap: 12,
              alignItems: "start",
              padding: "12px 14px",
              borderBottom: idx === all.length - 1 ? "none" : "1px solid var(--border)",
              background: tier === "S" ? "linear-gradient(90deg, rgba(184,134,11,0.20), transparent 42%)" : "transparent",
            }}
          >
            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 900, color: tier === "S" ? "#f4d48d" : "var(--text-2)", fontSize: 28, lineHeight: 1 }}>{tier}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {tiers[tier].length === 0 ? (
                <span style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>No entrants</span>
              ) : (
                tiers[tier]
                  .sort((a, b) => b.ratio - a.ratio)
                  .map((item) => <BalanceTierCard key={item.id} name={item.name} ratio={item.ratio} />)
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
