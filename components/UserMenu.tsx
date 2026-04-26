"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

function initialsFromUser(user: User) {
  const source = user.user_metadata?.full_name || user.email || "U";
  return String(source).trim().slice(0, 1).toUpperCase();
}

export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !user) return;
    void supabase.from("profiles").upsert({
      id: user.id,
      email: user.email ?? null,
      display_name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User",
      avatar_url: user.user_metadata?.avatar_url ?? null,
    });
  }, [supabase, user]);

  if (!user) {
    return (
      <Link href="/ugc/create" style={{ marginLeft: "auto", fontSize: 11, fontWeight: 800, color: "#00FF94", textDecoration: "none", fontFamily: "var(--font-mono)" }}>
        LOGIN / SIGNUP
      </Link>
    );
  }

  return (
    <div style={{ marginLeft: "auto", position: "relative" }}>
      <button onClick={() => setOpen((v) => !v)} style={{ width: 34, height: 34, borderRadius: "999px", border: "1px solid var(--border)", background: "var(--bg-card)", color: "var(--text-1)", fontWeight: 900 }}>
        {initialsFromUser(user)}
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: 42, minWidth: 180, border: "1px solid var(--border)", background: "var(--bg-card)", borderRadius: 10, overflow: "hidden", zIndex: 50 }}>
          <Link href="/ugc/profile" style={{ display: "block", padding: "10px 12px", textDecoration: "none", color: "var(--text-1)", borderBottom: "1px solid var(--border)" }}>Profile</Link>
          <Link href="/ugc/history" style={{ display: "block", padding: "10px 12px", textDecoration: "none", color: "var(--text-1)", borderBottom: "1px solid var(--border)" }}>Play History</Link>
          <Link href="/ugc/my-games" style={{ display: "block", padding: "10px 12px", textDecoration: "none", color: "var(--text-1)", borderBottom: "1px solid var(--border)" }}>My Games</Link>
          <button
            onClick={() => {
              setOpen(false);
              void supabase?.auth.signOut();
            }}
            style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 12px", background: "transparent", color: "#f87171", border: "none" }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
