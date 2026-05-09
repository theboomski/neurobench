"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import AuthModal from "@/components/ugc/AuthModal";
import { getSupabaseBrowser } from "@/lib/supabase";
import { toUgcPath } from "@/lib/ugc";

type Row = {
  id: string;
  played_at: string;
  winner_option: "a" | "b" | null;
  ugc_games: { title: string; slug: string; type: "brackets" | "balance" } | null;
};
type RawRow = {
  id: string;
  played_at: string;
  winner_option: "a" | "b" | null;
  ugc_games:
    | { title: string; slug: string; type: "brackets" | "balance" }
    | Array<{ title: string; slug: string; type: "brackets" | "balance" }>
    | null;
};

export default function UgcHistoryClient() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [user, setUser] = useState<User | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (!u) return;
      const { data: history } = await supabase
        .from("ugc_play_history")
        .select("id,played_at,winner_option,ugc_games(title,slug,type)")
        .eq("user_id", u.id)
        .order("played_at", { ascending: false })
        .limit(100);
      const normalized = ((history as RawRow[] | null) ?? []).map((entry) => ({
        ...entry,
        ugc_games: Array.isArray(entry.ugc_games) ? (entry.ugc_games[0] ?? null) : entry.ugc_games,
      }));
      setRows(normalized);
    });
  }, [supabase]);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "22px 16px 56px" }}>
      <AuthModal open={!user} />
      <h1 style={{ fontSize: 26, fontWeight: 900 }}>Play History</h1>
      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        {rows.map((row) => (
          <div key={row.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 10, background: "var(--bg-card)" }}>
            <div style={{ fontWeight: 700 }}>{row.ugc_games?.title ?? "Unknown game"}</div>
            <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 4 }}>{new Date(row.played_at).toLocaleString()}</div>
            <div style={{ marginTop: 6 }}>
              {row.ugc_games && (
                <Link href={toUgcPath({ type: row.ugc_games.type, slug: row.ugc_games.slug })} style={{ fontSize: 12, color: "#D4823A", textDecoration: "none", fontWeight: 800 }}>
                  Play again →
                </Link>
              )}
            </div>
          </div>
        ))}
        {!rows.length && <p style={{ fontSize: 12, color: "var(--text-2)" }}>No history yet.</p>}
      </div>
    </div>
  );
}
