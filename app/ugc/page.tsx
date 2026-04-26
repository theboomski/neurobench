import type { Metadata } from "next";
import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase";
import { toUgcPath } from "@/lib/ugc";

export const metadata: Metadata = {
  title: "UGC Hub – Community Brackets & Balance Games | ZAZAZA",
  description: "Play community-made brackets and balance games. Create your own UGC games and challenge friends.",
};

export default async function UgcHubPage() {
  const supabase = getSupabaseServer();
  const { data: games } = supabase
    ? await supabase
        .from("ugc_games")
        .select("id,type,title,description,cover_image_url,play_count,slug,created_at,category_id,user_id")
        .eq("visibility", "public")
        .eq("is_approved", true)
        .order("created_at", { ascending: false })
        .limit(80)
    : { data: [] };

  const userIds = [...new Set((games ?? []).map((g) => g.user_id))];
  const categoryIds = [...new Set((games ?? []).map((g) => g.category_id).filter(Boolean))];
  const [{ data: profiles }, { data: categories }] = await Promise.all([
    supabase && userIds.length ? supabase.from("profiles").select("id,display_name,avatar_url").in("id", userIds) : Promise.resolve({ data: [] }),
    supabase && categoryIds.length ? supabase.from("ugc_categories").select("id,name").in("id", categoryIds as number[]) : Promise.resolve({ data: [] }),
  ]);
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const categoryMap = new Map((categories ?? []).map((c) => [c.id, c]));

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 16px 56px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.02em" }}>UGC Hub</h1>
          <p style={{ fontSize: 13, color: "var(--text-2)" }}>Community brackets and balance battles</p>
        </div>
        <Link href="/ugc/create" style={{ textDecoration: "none", fontSize: 12, fontWeight: 900, background: "#00FF94", color: "#05291a", padding: "10px 12px", borderRadius: 10 }}>
          CREATE UGC
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
        {(games ?? []).map((game) => {
          const creator = profileMap.get(game.user_id);
          const category = game.category_id ? categoryMap.get(game.category_id) : null;
          return (
            <Link key={game.id} href={toUgcPath(game)} style={{ textDecoration: "none" }}>
              <article
                style={{
                  position: "relative",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  overflow: "hidden",
                  aspectRatio: "4 / 3",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  background: game.cover_image_url
                    ? `linear-gradient(180deg, rgba(0,0,0,.15), rgba(0,0,0,.80)), url(${game.cover_image_url}) center/cover`
                    : "linear-gradient(160deg, #202028, #101015)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", padding: 8 }}>
                  <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", background: "#00000075", padding: "3px 6px", borderRadius: 999 }}>UGC · {game.type === "brackets" ? "⊞" : "⚖"}</span>
                  <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", background: "#00000075", padding: "3px 6px", borderRadius: 999 }}>▶ {game.play_count}</span>
                </div>
                <div style={{ padding: 10, background: "linear-gradient(180deg, transparent, rgba(0,0,0,.9))" }}>
                  <div style={{ fontSize: 10, color: "#9fffd2", fontFamily: "var(--font-mono)" }}>{category?.name ?? "Uncategorized"}</div>
                  <h3 style={{ marginTop: 3, fontSize: 15, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>{game.title}</h3>
                  {game.description && <p style={{ marginTop: 2, fontSize: 11, color: "#d7d7db", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{game.description}</p>}
                  <div style={{ marginTop: 6, fontSize: 10, color: "#d8d8dd" }}>by {creator?.display_name ?? "Anonymous"}</div>
                </div>
              </article>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
