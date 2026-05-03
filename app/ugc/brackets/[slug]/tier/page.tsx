import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import UgcImageCard from "@/components/ugc/UgcImageCard";
import UgcTierShareButton from "@/components/ugc/UgcTierShareButton";
import { bracketsTierMetadata, fetchUgcGameForSeo } from "@/lib/ugcSeo";
import { getSupabaseServer } from "@/lib/supabase";

type TierKey = "S" | "A" | "B" | "C" | "D";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = getSupabaseServer();
  if (!supabase) return {};
  const row = await fetchUgcGameForSeo(supabase, slug, "brackets");
  if (!row) notFound();
  return bracketsTierMetadata(row);
}

function getTier(ratio: number): TierKey {
  if (ratio >= 40) return "S";
  if (ratio >= 30) return "A";
  if (ratio >= 20) return "B";
  if (ratio >= 10) return "C";
  return "D";
}

export default async function UgcBracketsTierPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = getSupabaseServer();
  if (!supabase) notFound();

  const { data: game } = await supabase
    .from("ugc_games")
    .select("id,title,description,slug,visibility,is_approved,play_count")
    .eq("slug", slug)
    .eq("type", "brackets")
    .single();
  if (!game) notFound();

  const { data: items } = await supabase
    .from("ugc_brackets_items")
    .select("id,name,image_url")
    .eq("game_id", game.id)
    .order("order", { ascending: true });
  if (!items?.length) notFound();

  const { data: finalRows } = await supabase.rpc("ugc_bracket_final_wins", { p_game_id: game.id });
  const finalWins = new Map<string, number>();
  for (const row of finalRows ?? []) {
    const id = (row as { winner_item_id?: string | null }).winner_item_id ?? null;
    if (!id) continue;
    const count = Number((row as { final_wins?: number | string }).final_wins ?? 0);
    finalWins.set(id, count);
  }

  const totalPlays = Math.max(0, Number(game.play_count ?? 0));
  const tiers: Record<TierKey, Array<{ id: string; name: string; image_url: string; ratio: number }>> = { S: [], A: [], B: [], C: [], D: [] };
  for (const item of items) {
    const wins = finalWins.get(item.id) ?? 0;
    const ratio = totalPlays > 0 ? (wins / totalPlays) * 100 : 0;
    tiers[getTier(ratio)].push({ id: item.id, name: item.name, image_url: item.image_url, ratio });
  }

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px 56px" }}>
      <h1 style={{ fontSize: 34, fontWeight: 900 }}>{game.title}</h1>
      {game.description && <p style={{ marginTop: 8, color: "var(--text-2)", fontSize: 14, maxWidth: 760 }}>{game.description}</p>}
      <p style={{ marginTop: 8, color: "var(--text-3)", fontSize: 12 }}>Tiers based on current votes.</p>

      <div style={{ display: "flex", gap: 10, marginTop: 14, marginBottom: 12 }}>
        <UgcTierShareButton title={game.title} slug={game.slug} playCount={totalPlays} style={{ background: "#b8860b", border: "none", color: "#231600", fontWeight: 900 }} />
        <Link
          href={`/ugc/brackets/${game.slug}`}
          style={{ borderRadius: 10, border: "1px solid var(--border)", padding: "10px 12px", background: "#000", color: "#fff", fontWeight: 800, textDecoration: "none" }}
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
                  .map((item) => (
                    <div key={item.id} style={{ width: 112 }}>
                      <UgcImageCard src={item.image_url} alt={item.name} size={112} borderRadius={10} style={{ width: 112 }} />
                      <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, lineHeight: 1.25 }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{item.ratio.toFixed(1)}%</div>
                    </div>
                  ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
