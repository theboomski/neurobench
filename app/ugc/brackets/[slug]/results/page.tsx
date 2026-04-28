import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { bracketsResultsMetadata, fetchUgcGameForSeo } from "@/lib/ugcSeo";
import { getSupabaseServer } from "@/lib/supabase";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = getSupabaseServer();
  if (!supabase) return {};
  const row = await fetchUgcGameForSeo(supabase, slug, "brackets");
  if (!row || (!row.is_approved && row.visibility !== "private")) notFound();
  return bracketsResultsMetadata(row);
}

export default async function UgcBracketsResultsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = getSupabaseServer();
  if (!supabase) notFound();

  const { data: game } = await supabase.from("ugc_games").select("id,title,slug,visibility,is_approved").eq("slug", slug).eq("type", "brackets").single();
  if (!game || (!game.is_approved && game.visibility !== "private")) notFound();
  const { data: items } = await supabase
    .from("ugc_brackets_items")
    .select("id,name,image_url,win_count,match_count")
    .eq("game_id", game.id)
    .order("win_count", { ascending: false });

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "22px 16px 56px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 900 }}>{game.title} Results</h1>
      <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
        {(items ?? []).map((item) => {
          const rate = item.match_count > 0 ? Math.round((item.win_count / item.match_count) * 100) : 0;
          return (
            <div
              key={item.id}
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: 8,
                background: "var(--bg-card)",
              }}
            >
              <img src={item.image_url} alt={item.name} style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{item.name}</div>
                <div style={{ fontSize: 12, color: "var(--text-2)" }}>
                  Win rate {rate}% · {item.win_count}/{item.match_count}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <Link
        href={`/ugc/brackets/${game.slug}`}
        style={{
          display: "inline-block",
          marginTop: 14,
          padding: "10px 12px",
          borderRadius: 10,
          background: "#00FF94",
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
