"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import AuthModal from "@/components/ugc/AuthModal";
import { getSupabaseBrowser } from "@/lib/supabase";

const MUSTARD = "#b8860b";
const TRIATHLON_ACCENT = "#1B4D3E";

/** Cockpit quick links (see `app/ugc/cockpit/page.tsx` → this client). Brain Triathlon is first so it stays visible on narrow grids. */
const COCKPIT_TILES: { href: string; title: string; description: string; accent: string }[] = [
  {
    href: "/triathlon/dashboard",
    title: "Brain Triathlon",
    description: "ZCI trends, streaks, and full session history.",
    accent: TRIATHLON_ACCENT,
  },
  { href: "/ugc/profile", title: "Profile", description: "Update display name and avatar.", accent: MUSTARD },
  { href: "/ugc/create", title: "Create Game", description: "Make a new brackets or balance game.", accent: MUSTARD },
  { href: "/ugc/history", title: "Play History", description: "Review what you played.", accent: "#f59e0b" },
  { href: "/ugc/my-games", title: "My Games", description: "Manage visibility and delete.", accent: MUSTARD },
  { href: "/bracket", title: "Bracket", description: "Browse community creations.", accent: "#b8860b" },
];

type ProfileLite = {
  display_name: string | null;
  avatar_url: string | null;
};

export default function UgcCockpitClient() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileLite | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(async ({ data }) => {
      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      if (!sessionUser) return;
      const { data: profileRow } = await supabase
        .from("profiles")
        .select("display_name,avatar_url")
        .eq("id", sessionUser.id)
        .single();
      setProfile(profileRow ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  const username = profile?.display_name?.trim() || user?.email?.split("@")[0] || "Player";

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "20px 16px 56px" }}>
      <AuthModal
        open={!user}
        onClose={() => (window.location.href = "/bracket")}
        footer={
          <Link
            href="/triathlon/dashboard"
            style={{
              display: "block",
              textAlign: "center",
              fontSize: 13,
              fontWeight: 800,
              color: TRIATHLON_ACCENT,
              textDecoration: "none",
            }}
          >
            Brain Triathlon — ZCI dashboard →
          </Link>
        }
      />
      <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.02em" }}>Cockpit</h1>
      <p style={{ fontSize: 13, color: "var(--text-2)", marginTop: 6 }}>Your command center for community games.</p>

      <section
        style={{
          marginTop: 14,
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 14,
          background: "var(--bg-card)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt={`${username} avatar`} style={{ width: 64, height: 64, borderRadius: "999px", objectFit: "cover", border: "1px solid var(--border)" }} />
        ) : (
          <div style={{ width: 64, height: 64, borderRadius: "999px", border: "1px solid var(--border)", display: "grid", placeItems: "center", fontSize: 28, color: "var(--text-3)" }}>
            👤
          </div>
        )}
        <div>
          <div style={{ fontSize: 10, color: MUSTARD, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Welcome Back</div>
          <div style={{ marginTop: 4, fontSize: 24, fontWeight: 900 }}>{username}</div>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3" style={{ marginTop: 14 }}>
        {COCKPIT_TILES.map((t) => (
          <CockpitTile key={t.href} href={t.href} title={t.title} description={t.description} accent={t.accent} />
        ))}
        <button
          onClick={async () => {
            await supabase?.auth.signOut();
            window.location.href = "/bracket";
          }}
          style={{
            textAlign: "left",
            border: "1px solid var(--border)",
            borderLeft: `4px solid ${MUSTARD}`,
            borderRadius: 12,
            padding: "14px 12px",
            background: "var(--bg-card)",
            cursor: "pointer",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-1)" }}>Logout</div>
          <div style={{ marginTop: 4, fontSize: 12, color: "var(--text-2)" }}>Sign out from your account.</div>
        </button>
      </section>
    </div>
  );
}

function CockpitTile({ href, title, description, accent }: { href: string; title: string; description: string; accent: string }) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <article style={{ border: "1px solid var(--border)", borderLeft: `4px solid ${accent}`, borderRadius: 12, padding: "14px 12px", background: "var(--bg-card)" }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--text-1)" }}>{title}</h2>
        <p style={{ marginTop: 4, fontSize: 12, color: "var(--text-2)" }}>{description}</p>
      </article>
    </Link>
  );
}
