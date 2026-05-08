"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import AuthModal from "@/components/ugc/AuthModal";
import { normalizeImageToWebp } from "@/lib/imageUpload";
import { getSupabaseBrowser } from "@/lib/supabase";

/** Extract storage object path from a public avatars URL, or null if not our bucket. */
function avatarsObjectPathFromPublicUrl(url: string): string | null {
  const marker = "/object/public/avatars/";
  const i = url.indexOf(marker);
  if (i === -1) return null;
  try {
    return decodeURIComponent(url.slice(i + marker.length));
  } catch {
    return null;
  }
}

export default function UgcProfileClient() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
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
    const nextName = displayName.trim();
    if (!nextName) {
      setMsg("Display name is required.");
      return;
    }
    if (nextName.length < 3 || nextName.length > 24) {
      setMsg("Display name must be 3-24 characters.");
      return;
    }
    const { data: duplicate } = await supabase
      .from("profiles")
      .select("id")
      .ilike("display_name", nextName)
      .neq("id", user.id)
      .limit(1);
    if (duplicate && duplicate.length > 0) {
      setMsg("Display name already taken. Try another one.");
      return;
    }
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      email: user.email ?? null,
      display_name: nextName,
      avatar_url: avatarUrl || null,
    });
    setMsg(error ? error.message : "Saved.");
  };

  const uploadAvatar = async (file: File | null) => {
    if (!file || !supabase || !user) return;
    setUploadingAvatar(true);
    setMsg("");
    try {
      const oldPath = avatarUrl ? avatarsObjectPathFromPublicUrl(avatarUrl) : null;
      if (oldPath && oldPath.startsWith(`${user.id}/`)) {
        await supabase.storage.from("avatars").remove([oldPath]);
      }
      const webp = await normalizeImageToWebp(file);
      const key = `${user.id}/${Date.now()}-avatar.webp`;
      const { error: uploadErr } = await supabase.storage.from("avatars").upload(key, webp, {
        upsert: false,
        cacheControl: "31536000",
        contentType: "image/webp",
      });
      if (uploadErr) throw uploadErr;
      const publicUrl = supabase.storage.from("avatars").getPublicUrl(key).data.publicUrl;
      setAvatarUrl(publicUrl);
      setMsg("Avatar uploaded. Click Save to apply.");
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Failed to upload avatar.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div style={{ maxWidth: 620, margin: "0 auto", padding: "22px 16px 56px" }}>
      <AuthModal open={!user} />
      <h1 style={{ fontSize: 26, fontWeight: 900 }}>Profile</h1>
      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display name" style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", background: "var(--bg-card)" }} />
        <div style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 10, background: "var(--bg-card)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar preview" style={{ width: 56, height: 56, borderRadius: "999px", objectFit: "cover", border: "1px solid var(--border)" }} />
            ) : (
              <div style={{ width: 56, height: 56, borderRadius: "999px", border: "1px solid var(--border)", display: "grid", placeItems: "center", color: "var(--text-3)" }}>
                👤
              </div>
            )}
            <label style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", cursor: "pointer", fontSize: 12 }}>
              {uploadingAvatar ? "Uploading..." : "Upload avatar"}
              <input type="file" accept="image/png,image/jpeg" style={{ display: "none" }} onChange={(e) => uploadAvatar(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        </div>
        <button onClick={save} style={{ borderRadius: 10, border: "none", padding: "10px 12px", background: "#1B4D3E", color: "#ffffff", fontWeight: 800, cursor: "pointer" }}>
          Save
        </button>
        {msg && <p style={{ fontSize: 12, color: "var(--text-2)" }}>{msg}</p>}
      </div>
    </div>
  );
}
