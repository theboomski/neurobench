"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import AuthModal from "@/components/ugc/AuthModal";
import { getSupabaseBrowser } from "@/lib/supabase";
import { toUgcPath } from "@/lib/ugc";
import type { UgcGameType } from "@/lib/ugcTypes";

type MyGame = {
  id: string;
  type: UgcGameType;
  title: string;
  slug: string;
  visibility: "public" | "private" | "closed";
  play_count: number;
  created_at: string;
};

export default function UgcMyGamesClient() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [user, setUser] = useState<User | null>(null);
  const [games, setGames] = useState<MyGame[]>([]);
  const [tab, setTab] = useState<UgcGameType>("brackets");

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (!u) return;
      const { data: myGames } = await supabase
        .from("ugc_games")
        .select("id,type,title,slug,visibility,play_count,created_at")
        .eq("user_id", u.id)
        .order("created_at", { ascending: false });
      setGames((myGames as MyGame[]) ?? []);
    });
  }, [supabase]);

  const visible = games.filter((g) => g.type === tab);

  const deleteGame = async (id: string) => {
    if (!supabase) return;
    await supabase.from("ugc_games").delete().eq("id", id);
    setGames((prev) => prev.filter((g) => g.id !== id));
  };

  const updateVisibility = async (id: string, visibility: MyGame["visibility"]) => {
    if (!supabase) return;
    const { error } = await supabase.from("ugc_games").update({ visibility }).eq("id", id);
    if (error) return;
    setGames((prev) => prev.map((g) => (g.id === id ? { ...g, visibility } : g)));
  };

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "22px 16px 56px" }}>
      <AuthModal open={!user} />
      <h1 style={{ fontSize: 26, fontWeight: 900 }}>My Games</h1>
      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <button onClick={() => setTab("brackets")} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", background: tab === "brackets" ? "rgba(27,77,62,0.14)" : "transparent" }}>Brackets</button>
        <button onClick={() => setTab("balance")} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", background: tab === "balance" ? "rgba(27,77,62,0.14)" : "transparent" }}>Balance</button>
      </div>
      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        {visible.map((game) => (
          <div key={game.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 10, background: "var(--bg-card)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{game.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-2)" }}>{game.visibility} · plays {game.play_count}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Link href={toUgcPath({ type: game.type, slug: game.slug })} style={{ fontSize: 12, color: "#1B4D3E", textDecoration: "none", fontWeight: 800 }}>
                  Open
                </Link>
                <select
                  value={game.visibility}
                  onChange={(e) => updateVisibility(game.id, e.target.value as MyGame["visibility"])}
                  style={{ fontSize: 11, border: "1px solid var(--border)", borderRadius: 8, background: "transparent", color: "var(--text-2)", padding: "2px 6px" }}
                >
                  <option value="public">public</option>
                  <option value="private">private</option>
                  <option value="closed">closed</option>
                </select>
                <button onClick={() => deleteGame(game.id)} style={{ border: "none", background: "transparent", color: "#f87171", fontSize: 12 }}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        {!visible.length && <p style={{ fontSize: 12, color: "var(--text-2)" }}>No games yet in this tab.</p>}
      </div>
    </div>
  );
}
