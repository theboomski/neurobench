"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function UserMenu() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isCompact, setIsCompact] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const supabase = useMemo(() => getSupabaseBrowser(), []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(async ({ data }) => {
      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      if (!sessionUser) {
        setAvatarUrl(null);
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("avatar_url").eq("id", sessionUser.id).single();
      setAvatarUrl(profile?.avatar_url ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) setAvatarUrl(null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!supabase || !user) return;
    void supabase.from("profiles").upsert({
      id: user.id,
      email: user.email ?? null,
      display_name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User"
    }, { onConflict: "id", ignoreDuplicates: true });
  }, [supabase, user]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 900px)");
    const sync = () => setIsCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <div ref={rootRef} style={{ position: "relative", flexShrink: 0, marginRight: isCompact ? 20 : 0 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 34,
          height: 34,
          borderRadius: "999px",
          border: "1px solid var(--border-md)",
          background: "var(--bg-elevated)",
          color: "var(--text-1)",
          fontWeight: 900,
          overflow: "hidden",
          cursor: "pointer",
          boxSizing: "border-box",
        }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="Profile avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span
            style={{
              display: "grid",
              placeItems: "center",
              width: "100%",
              height: "100%",
              fontSize: 14,
            }}
          >
            👤
          </span>
        )}
      </button>
      {open && (
        <div style={{ position: "absolute", right: 0, top: 42, minWidth: 180, border: "1px solid var(--border)", background: "var(--bg-card)", borderRadius: 10, overflow: "hidden", zIndex: 50, boxShadow: "var(--card-shadow-hover)" }}>
          {user ? (
            <>
              <Link onClick={() => setOpen(false)} href="/ugc/cockpit" style={{ display: "block", padding: "10px 12px", textDecoration: "none", color: "var(--text-1)", borderBottom: "1px solid var(--border)" }}>Cockpit</Link>
              <Link onClick={() => setOpen(false)} href="/ugc/profile" style={{ display: "block", padding: "10px 12px", textDecoration: "none", color: "var(--text-1)", borderBottom: "1px solid var(--border)" }}>Profile</Link>
              <Link onClick={() => setOpen(false)} href="/ugc/create" style={{ display: "block", padding: "10px 12px", textDecoration: "none", color: "var(--text-1)", borderBottom: "1px solid var(--border)" }}>Create Game</Link>
              <Link onClick={() => setOpen(false)} href="/ugc/history" style={{ display: "block", padding: "10px 12px", textDecoration: "none", color: "var(--text-1)", borderBottom: "1px solid var(--border)" }}>Play History</Link>
              <Link onClick={() => setOpen(false)} href="/ugc/my-games" style={{ display: "block", padding: "10px 12px", textDecoration: "none", color: "var(--text-1)", borderBottom: "1px solid var(--border)" }}>My Games</Link>
              <button
                onClick={() => {
                  setOpen(false);
                  void supabase?.auth.signOut();
                }}
                style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 12px", background: "transparent", color: "#f87171", border: "none" }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link onClick={() => setOpen(false)} href="/ugc/cockpit" style={{ display: "block", padding: "10px 12px", textDecoration: "none", color: "var(--text-1)", borderBottom: "1px solid var(--border)" }}>
                Log in
              </Link>
              <Link onClick={() => setOpen(false)} href="/ugc/cockpit" style={{ display: "block", padding: "10px 12px", textDecoration: "none", color: "var(--text-1)" }}>
                Sign up
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
