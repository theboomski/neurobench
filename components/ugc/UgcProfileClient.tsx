"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import AuthModal from "@/components/ugc/AuthModal";
import { getSupabaseBrowser } from "@/lib/supabase";

export default function UgcProfileClient() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (!u) return;
      const { data: profile } = await supabase.from("profiles").select("display_name,avatar_url").eq("id", u.id).single();
      setDisplayName(profile?.display_name ?? u.user_metadata?.full_name ?? "");
      setAvatarUrl(profile?.avatar_url ?? u.user_metadata?.avatar_url ?? "");
    });
  }, [supabase]);

  const save = async () => {
    if (!supabase || !user) return;
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email ?? null,
      display_name: displayName || user.email?.split("@")[0] || "User",
      avatar_url: avatarUrl || null,
    });
    setMsg(error ? error.message : "Saved.");
  };

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "22px 16px 56px" }}>
      <AuthModal open={!user} />
      <h1 style={{ fontSize: 26, fontWeight: 900 }}>Profile</h1>
      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name" style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", background: "var(--bg-card)" }} />
        <input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="Avatar URL (optional)" style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", background: "var(--bg-card)" }} />
        <button onClick={save} style={{ borderRadius: 10, border: "none", padding: "10px 12px", background: "#00FF94", color: "#042d1b", fontWeight: 800 }}>
          Save
        </button>
        {msg && <p style={{ fontSize: 12, color: "var(--text-2)" }}>{msg}</p>}
      </div>
    </div>
  );
}
