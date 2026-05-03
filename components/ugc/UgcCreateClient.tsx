"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import AuthModal from "@/components/ugc/AuthModal";
import { normalizeImageToWebp, UGC_ACCEPT_IMAGE_INPUT } from "@/lib/imageUpload";
import { ISO_LANGUAGE_OPTIONS } from "@/lib/isoLanguages";
import { deriveItemNameFromFilename, sanitizeStorageFileName } from "@/lib/ugc";
import { getSupabaseBrowser } from "@/lib/supabase";
import type { UgcCategory, UgcVisibility } from "@/lib/ugcTypes";

type BracketDraftItem = {
  /** Stable React list key (never use `name` — it changes while editing). */
  draftKey: string;
  name: string;
  preview: string;
  file?: File;
  externalUrl?: string;
  source: "upload" | "url" | "youtube";
};

type BalanceDraftItem = { optionA: string; optionB: string };
type TextEntry = { text: string; font: string; size: "small" | "medium" | "large"; color: string; background: string };

type ContentTab = "bracket-image" | "bracket-video" | "balance-text";
type VideoTab = "single" | "bulk";
type TextTab = "single" | "bulk";

const MUSTARD = "#b8860b";
const MUSTARD_BG = "rgba(184,134,11,0.18)";
const TITLE_MAX = 64;
const DESC_MAX = 256;
const MAX_PARTICIPANTS = 64;
const MAX_TEXT_ENTRIES = 1024;
const DRAFT_KEY = "ugc-create-draft-v2";
const FONT_OPTIONS = ["Inter", "Pretendard", "Noto Sans", "Arial", "Georgia"];

function newBracketDraftKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `bracket-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function formatPublishError(e: unknown): string {
  if (e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string") {
    return (e as { message: string }).message;
  }
  if (e instanceof Error) return e.message;
  return "Failed to publish.";
}

function buildYouTubeWatchUrl(videoId: string, startSec?: number, endSec?: number): string {
  const u = new URL(`https://www.youtube.com/watch?v=${videoId}`);
  if (typeof startSec === "number" && startSec >= 0) u.searchParams.set("start", String(startSec));
  if (typeof endSec === "number" && endSec > 0) u.searchParams.set("end", String(endSec));
  return u.toString();
}

function parseOptionalSeconds(raw: string): number | undefined {
  const v = Number(raw.trim());
  if (!Number.isFinite(v) || v < 0) return undefined;
  return Math.floor(v);
}

export default function UgcCreateClient() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [user, setUser] = useState<User | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [categories, setCategories] = useState<UgcCategory[]>([]);
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [language, setLanguage] = useState("en");
  const [visibility, setVisibility] = useState<UgcVisibility>("public");

  const [contentTab, setContentTab] = useState<ContentTab>("bracket-image");
  const [videoTab, setVideoTab] = useState<VideoTab>("single");
  const [textTab, setTextTab] = useState<TextTab>("single");

  const [bracketItems, setBracketItems] = useState<BracketDraftItem[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState("");

  const [videoSingleUrl, setVideoSingleUrl] = useState("");
  const [videoStart, setVideoStart] = useState("");
  const [videoEnd, setVideoEnd] = useState("");
  const [videoBulk, setVideoBulk] = useState("");

  const [textEntries, setTextEntries] = useState<TextEntry[]>([]);
  const [textSingle, setTextSingle] = useState("");
  const [textBulk, setTextBulk] = useState("");
  const [textFont, setTextFont] = useState(FONT_OPTIONS[0]);
  const [textSize, setTextSize] = useState<"small" | "medium" | "large">("medium");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [textBgColor, setTextBgColor] = useState("#1a1a2e");

  const [isDropOver, setIsDropOver] = useState(false);
  const [isCoverDropOver, setIsCoverDropOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    void fetch("/api/ugc/categories")
      .then((r) => r.json())
      .then((json) => setCategories(json.categories ?? []));
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(async ({ data }) => {
      const sessionUser = data.session?.user ?? null;
      if (sessionUser) {
        const { data: refreshed } = await supabase.auth.getUser();
        setUser(refreshed.user ?? sessionUser);
        setNeedsAuth(false);
      } else {
        setUser(null);
        setNeedsAuth(true);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, session) => {
      if (!session?.user) {
        setUser(null);
        setNeedsAuth(true);
        return;
      }
      void supabase.auth.getUser().then(({ data }) => {
        setUser(data.user ?? session.user);
        setNeedsAuth(false);
      });
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as {
        title?: string;
        description?: string;
        categoryId?: number | "";
        language?: string;
        visibility?: UgcVisibility;
        contentTab?: ContentTab;
        bracketItems?: Array<{ draftKey?: string; name: string; preview: string; externalUrl?: string; source: "upload" | "url" | "youtube" }>;
        textEntries?: TextEntry[];
      };
      if (draft.title) setTitle(draft.title);
      if (draft.description) setDescription(draft.description);
      if (typeof draft.categoryId !== "undefined") setCategoryId(draft.categoryId);
      if (draft.language) setLanguage(draft.language);
      if (draft.visibility) setVisibility(draft.visibility);
      if (draft.contentTab) setContentTab(draft.contentTab);
      if (draft.bracketItems?.length)
        setBracketItems(
          draft.bracketItems.map((x) => ({
            ...x,
            draftKey: x.draftKey ?? newBracketDraftKey(),
          })),
        );
      if (draft.textEntries?.length) setTextEntries(draft.textEntries);
    } catch {
      // ignore malformed drafts
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const draft = {
        title: title.trim(),
        description: description.trim(),
        categoryId,
        language,
        visibility,
        contentTab,
        bracketItems: bracketItems.map((x) => ({ draftKey: x.draftKey, name: x.name, preview: x.preview, externalUrl: x.externalUrl, source: x.source })),
        textEntries,
      };
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      setLastSavedAt(new Date());
    }, 500);
    return () => window.clearTimeout(id);
  }, [title, description, categoryId, language, visibility, contentTab, bracketItems, textEntries]);

  const emailVerified = Boolean(user?.email_confirmed_at || user?.app_metadata?.provider === "google");
  const blockedByVerification = Boolean(user && !emailVerified);
  const participantsRemaining = Math.max(0, MAX_PARTICIPANTS - bracketItems.length);
  const textRemaining = Math.max(0, MAX_TEXT_ENTRIES - textEntries.length);

  const deriveNameFromUrl = (rawUrl: string) => {
    try {
      const url = new URL(rawUrl);
      const leaf = url.pathname.split("/").filter(Boolean).pop() ?? "Untitled";
      return deriveItemNameFromFilename(decodeURIComponent(leaf)) || "Untitled";
    } catch {
      return "Untitled";
    }
  };

  const parseYouTubeUrl = (url: string): string | null => {
    try {
      const u = new URL(url.trim());
      if (u.hostname.includes("youtu.be")) return u.pathname.replace("/", "") || null;
      if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
      return null;
    } catch {
      return null;
    }
  };

  const fetchYouTubeMeta = async (url: string): Promise<{ title: string; thumbnail: string }> => {
    const oembed = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
    if (!oembed.ok) throw new Error("Could not fetch YouTube title.");
    const json = (await oembed.json()) as { title?: string; thumbnail_url?: string };
    return { title: json.title?.trim() || "Untitled Video", thumbnail: json.thumbnail_url ?? "" };
  };

  const onUploadCover = async (file: File | null) => {
    if (!file) return;
    setStatus("Optimizing thumbnail...");
    setError(null);
    try {
      const webp = await normalizeImageToWebp(file);
      setCover(webp);
      if (coverPreview) URL.revokeObjectURL(coverPreview);
      setCoverPreview(URL.createObjectURL(webp));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to process thumbnail.");
    } finally {
      setStatus(null);
    }
  };

  const onUploadBracketFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    setStatus("Optimizing participant images...");
    try {
      const freeSlots = Math.max(0, MAX_PARTICIPANTS - bracketItems.length);
      const picked = Array.from(files).slice(0, freeSlots);
      const next = await Promise.all(
        picked.map(async (f) => {
          const webp = await normalizeImageToWebp(f);
          return {
            draftKey: newBracketDraftKey(),
            file: webp,
            name: deriveItemNameFromFilename(f.name) || "Untitled",
            preview: URL.createObjectURL(webp),
            source: "upload" as const,
          };
        }),
      );
      setBracketItems((prev) => [...prev, ...next]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Image conversion failed.");
    } finally {
      setStatus(null);
    }
  };

  const addImageUrls = () => {
    const urls = imageUrlInput
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, participantsRemaining);
    if (!urls.length) return;
    const next = urls.map((url) => ({
      draftKey: newBracketDraftKey(),
      name: deriveNameFromUrl(url),
      preview: url,
      externalUrl: url,
      source: "url" as const,
    }));
    setBracketItems((prev) => [...prev, ...next]);
    setImageUrlInput("");
  };

  const addVideoSingle = async () => {
    const url = videoSingleUrl.trim();
    if (!url || !participantsRemaining) return;
    const videoId = parseYouTubeUrl(url);
    if (!videoId) {
      setError("Please enter a valid YouTube URL.");
      return;
    }
    setError(null);
    setStatus("Fetching video info...");
    try {
      const meta = await fetchYouTubeMeta(url);
      const startSec = parseOptionalSeconds(videoStart);
      const endSec = parseOptionalSeconds(videoEnd);
      const watchUrl = buildYouTubeWatchUrl(videoId, startSec, endSec);
      const label = [meta.title, videoStart.trim() ? `@${videoStart.trim()}s` : "", videoEnd.trim() ? `-${videoEnd.trim()}s` : ""]
        .filter(Boolean)
        .join(" ");
      setBracketItems((prev) => [
        ...prev,
        {
          draftKey: newBracketDraftKey(),
          name: label,
          preview: meta.thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          externalUrl: watchUrl,
          source: "youtube",
        },
      ]);
      setVideoSingleUrl("");
      setVideoStart("");
      setVideoEnd("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add video.");
    } finally {
      setStatus(null);
    }
  };

  const addVideoBulk = async () => {
    const urls = videoBulk
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, participantsRemaining);
    if (!urls.length) return;
    setError(null);
    setStatus("Fetching video titles...");
    try {
      const next: BracketDraftItem[] = [];
      for (const url of urls) {
        const videoId = parseYouTubeUrl(url);
        if (!videoId) continue;
        const meta = await fetchYouTubeMeta(url);
        next.push({
          draftKey: newBracketDraftKey(),
          name: meta.title,
          preview: meta.thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          externalUrl: url,
          source: "youtube",
        });
      }
      setBracketItems((prev) => [...prev, ...next].slice(0, MAX_PARTICIPANTS));
      setVideoBulk("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add some videos.");
    } finally {
      setStatus(null);
    }
  };

  const addTextSingle = () => {
    const text = textSingle.trim();
    if (!text || !textRemaining) return;
    setTextEntries((prev) => [...prev, { text, font: textFont, size: textSize, color: textColor, background: textBgColor }]);
    setTextSingle("");
  };

  const addTextBulk = () => {
    const lines = textBulk
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, textRemaining);
    if (!lines.length) return;
    setTextEntries((prev) => [...prev, ...lines.map((text) => ({ text, font: textFont, size: textSize, color: textColor, background: textBgColor }))]);
    setTextBulk("");
  };

  const removeBracketItem = (idx: number) => {
    setBracketItems((prev) => {
      const target = prev[idx];
      if (target?.source === "upload") URL.revokeObjectURL(target.preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const saveDraftNow = () => {
    const draft = {
      title: title.trim(),
      description: description.trim(),
      categoryId,
      language,
      visibility,
      contentTab,
      bracketItems: bracketItems.map((x) => ({ draftKey: x.draftKey, name: x.name, preview: x.preview, externalUrl: x.externalUrl, source: x.source })),
      textEntries,
    };
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    setLastSavedAt(new Date());
    setStatus("Draft saved.");
    window.setTimeout(() => setStatus(null), 1500);
  };

  const publish = async () => {
    if (!supabase || !user) return;
    setBusy(true);
    setError(null);
    setStatus("Preparing...");
    try {
      if (!title.trim()) throw new Error("Title is required.");
      if (!categoryId) throw new Error("Please select a category.");

      if ((contentTab === "bracket-image" || contentTab === "bracket-video") && bracketItems.length < 2) {
        throw new Error("Brackets needs at least 2 participants.");
      }

      if (contentTab === "balance-text" && textEntries.length < 2) {
        throw new Error("Balance text needs at least 2 entries.");
      }

      const profilePayload = {
        id: user.id,
        email: user.email ?? null,
        display_name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User",
        avatar_url: user.user_metadata?.avatar_url ?? null,
      };
      await supabase.from("profiles").upsert(profilePayload, { onConflict: "id", ignoreDuplicates: true });

      let coverUrl: string | null = null;
      if (cover) {
        setStatus("Uploading thumbnail...");
        const key = `${user.id}/${Date.now()}-${sanitizeStorageFileName(cover.name)}`;
        const { error: uploadErr } = await supabase.storage
          .from("ugc-covers")
          .upload(key, cover, { upsert: false, cacheControl: "31536000", contentType: "image/webp" });
        if (uploadErr) throw uploadErr;
        coverUrl = supabase.storage.from("ugc-covers").getPublicUrl(key).data.publicUrl;
      } else if ((contentTab === "bracket-image" || contentTab === "bracket-video") && bracketItems[0]) {
        coverUrl = bracketItems[0].preview;
      }

      const slugRes = await fetch(`/api/ugc/next-slug?title=${encodeURIComponent(title.trim())}`);
      const slugJson = (await slugRes.json()) as { slug?: string; error?: string };
      if (!slugRes.ok) throw new Error(slugJson.error ?? "Could not allocate URL slug.");
      const slug = slugJson.slug;
      if (!slug) throw new Error("Could not allocate URL slug.");

      const gameType = contentTab === "balance-text" ? "balance" : "brackets";
      const gameVisibility = visibility === "closed" ? "closed" : "public";

      setStatus("Creating game...");
      const { data: game, error: gameErr } = await supabase
        .from("ugc_games")
        .insert({
          user_id: user.id,
          type: gameType,
          title: title.trim(),
          description: description.trim() || null,
          cover_image_url: coverUrl,
          category_id: categoryId,
          language,
          visibility: gameVisibility,
          is_nsfw: false,
          is_approved: true,
          slug,
        })
        .select("id,type,slug")
        .single();
      if (gameErr || !game) throw gameErr ?? new Error("Failed to create game.");

      try {
        if (gameType === "brackets") {
          setStatus("Saving participants...");
          const payload: Array<{ game_id: string; name: string; image_url: string; order: number; video_url?: string }> = [];
          for (let i = 0; i < bracketItems.length; i += 1) {
            const item = bracketItems[i];
            let imageUrl = item.preview;
            let videoUrl: string | null = null;
            if (item.file) {
              const key = `${user.id}/${game.id}/${Date.now()}-${i}-${sanitizeStorageFileName(item.file.name)}`;
              const { error: itemUploadErr } = await supabase.storage
                .from("brackets")
                .upload(key, item.file, { upsert: false, cacheControl: "31536000", contentType: "image/webp" });
              if (itemUploadErr) throw itemUploadErr;
              imageUrl = supabase.storage.from("brackets").getPublicUrl(key).data.publicUrl;
            } else if (item.source === "youtube") {
              videoUrl = item.externalUrl ?? null;
              imageUrl = item.preview;
            } else {
              imageUrl = item.externalUrl ?? item.preview;
            }
            const row: { game_id: string; name: string; image_url: string; order: number; video_url?: string } = {
              game_id: game.id,
              name: item.name.trim() || `Participant ${i + 1}`,
              image_url: imageUrl,
              order: i,
            };
            // Omit when absent so DBs without `video_url` still accept image-only brackets (migration: 20260502_ugc_bracket_video_items.sql).
            if (videoUrl != null && String(videoUrl).trim() !== "") row.video_url = videoUrl;
            payload.push(row);
          }
          const { error: itemsErr } = await supabase.from("ugc_brackets_items").insert(payload);
          if (itemsErr) throw itemsErr;
        } else {
          setStatus("Saving balance pairs...");
          if (textEntries.length % 2 !== 0) throw new Error("Balance text entries must be an even number.");
          const payload = [];
          for (let i = 0; i < textEntries.length; i += 2) {
            payload.push({
              game_id: game.id,
              option_a: textEntries[i].text,
              option_b: textEntries[i + 1].text,
              round: i / 2 + 1,
              order: i / 2,
            });
          }
          const { error: balErr } = await supabase.from("ugc_balance_options").insert(payload);
          if (balErr) throw balErr;
        }

        window.localStorage.removeItem(DRAFT_KEY);
        router.push(game.type === "brackets" ? `/ugc/brackets/${game.slug}` : `/ugc/balance/${game.slug}`);
      } catch (inner) {
        await supabase.from("ugc_games").delete().eq("id", game.id);
        throw inner;
      }
    } catch (e) {
      setError(formatPublishError(e));
    } finally {
      setStatus(null);
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "20px 16px 60px" }}>
      <AuthModal open={needsAuth} onClose={() => router.push("/bracket")} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900 }}>Create Quiz</h1>
          <p style={{ marginTop: 6, fontSize: 13, color: "var(--text-2)" }}>Single-page create flow for Bracket and Balance games.</p>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-3)" }}>{lastSavedAt ? `Draft saved ${lastSavedAt.toLocaleTimeString()}` : "Draft not saved yet"}</div>
      </div>

      {blockedByVerification && (
        <div style={{ marginTop: 12, border: "1px solid #f59e0b66", background: "#f59e0b14", borderRadius: 12, padding: 12 }}>
          Please verify your email before creating games.
        </div>
      )}

      <section style={{ marginTop: 18, border: "1px solid var(--border)", borderRadius: 14, padding: 14, background: "var(--bg-card)" }}>
        <h2 style={{ fontSize: 16, fontWeight: 900, marginBottom: 10 }}>Basic Information</h2>
        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, color: "var(--text-2)" }}>Title (required)</span>
            <input value={title} maxLength={TITLE_MAX} onChange={(e) => setTitle(e.target.value)} placeholder="Title" style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", background: "var(--bg-elevated)" }} />
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>{title.length}/{TITLE_MAX}</span>
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontSize: 12, color: "var(--text-2)" }}>Description (optional)</span>
            <textarea value={description} maxLength={DESC_MAX} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Description" style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", background: "var(--bg-elevated)" }} />
            <span style={{ fontSize: 11, color: "var(--text-3)" }}>{description.length}/{DESC_MAX}</span>
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, color: "var(--text-2)" }}>Visibility</span>
              <select value={visibility === "closed" ? "closed" : "public"} onChange={(e) => setVisibility(e.target.value as UgcVisibility)} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "9px 10px", background: "var(--bg-elevated)" }}>
                <option value="public">Public</option>
                <option value="closed">Closed</option>
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, color: "var(--text-2)" }}>Language</span>
              <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "9px 10px", background: "var(--bg-elevated)" }}>
                {ISO_LANGUAGE_OPTIONS.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 12, color: "var(--text-2)" }}>Category</span>
              <select value={String(categoryId)} onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "9px 10px", background: "var(--bg-elevated)" }}>
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 14, border: "1px solid var(--border)", borderRadius: 14, padding: 14, background: "var(--bg-card)" }}>
        <h2 style={{ fontSize: 16, fontWeight: 900, marginBottom: 10 }}>Quiz Content</h2>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsCoverDropOver(true);
          }}
          onDragLeave={() => setIsCoverDropOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsCoverDropOver(false);
            void onUploadCover(e.dataTransfer.files?.[0] ?? null);
          }}
          style={{
            border: `2px dashed ${isCoverDropOver ? MUSTARD : "var(--border)"}`,
            borderRadius: 12,
            padding: 14,
            background: isCoverDropOver ? MUSTARD_BG : "var(--bg-elevated)",
          }}
        >
          <div style={{ fontSize: 12, color: "var(--text-2)" }}>Quiz Thumbnail (optional)</div>
          <div style={{ marginTop: 4, fontSize: 11, color: "var(--text-3)" }}>If no thumbnail is provided, the first contender will be used</div>
          <label style={{ marginTop: 8, display: "inline-block", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", cursor: "pointer", fontSize: 12 }}>
            Upload thumbnail
            <input type="file" accept={UGC_ACCEPT_IMAGE_INPUT} style={{ display: "none" }} onChange={(e) => void onUploadCover(e.target.files?.[0] ?? null)} />
          </label>
          {coverPreview && (
            <div style={{ marginTop: 10 }}>
              <img src={coverPreview} alt="Thumbnail preview" style={{ width: "100%", maxWidth: 320, borderRadius: 10, border: "1px solid var(--border)" }} />
            </div>
          )}
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setContentTab("bracket-image")} style={tabStyle(contentTab === "bracket-image")}>Bracket (Image)</button>
          <button onClick={() => setContentTab("bracket-video")} style={tabStyle(contentTab === "bracket-video")}>Bracket (Video)</button>
          <button onClick={() => setContentTab("balance-text")} style={tabStyle(contentTab === "balance-text")}>Balance Game (Text)</button>
        </div>

        {(contentTab === "bracket-image" || contentTab === "bracket-video") && (
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <div style={{ fontSize: 12, color: "var(--text-2)" }}>Participant count: {bracketItems.length} / {MAX_PARTICIPANTS}{contentTab === "bracket-video" ? " (YouTube)" : ""}</div>

            {contentTab === "bracket-image" && (
              <>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDropOver(true);
                  }}
                  onDragLeave={() => setIsDropOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDropOver(false);
                    void onUploadBracketFiles(e.dataTransfer.files);
                  }}
                  style={{ border: `1px dashed ${isDropOver ? MUSTARD : "var(--border)"}`, borderRadius: 10, padding: 12, background: isDropOver ? MUSTARD_BG : "var(--bg-elevated)" }}
                >
                  <div style={{ fontSize: 12, color: "var(--text-2)" }}>Drag and drop images (max 64, 5MB each)</div>
                  <label style={{ marginTop: 8, display: "inline-block", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", cursor: "pointer", fontSize: 12 }}>
                    Add image files
                    <input type="file" accept={UGC_ACCEPT_IMAGE_INPUT} multiple style={{ display: "none" }} onChange={(e) => void onUploadBracketFiles(e.target.files)} />
                  </label>
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-2)" }}>
                    <span>Image URLs (one per line)</span>
                    <span>{participantsRemaining} remaining</span>
                  </div>
                  <textarea value={imageUrlInput} onChange={(e) => setImageUrlInput(e.target.value)} rows={4} placeholder={"https://...\nhttps://..."} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", background: "var(--bg-elevated)" }} />
                  <button type="button" onClick={addImageUrls} style={smallBtn()}>Add URLs</button>
                </div>
              </>
            )}

            {contentTab === "bracket-video" && (
              <>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={() => setVideoTab("single")} style={subTabStyle(videoTab === "single")}>Single Video</button>
                  <button type="button" onClick={() => setVideoTab("bulk")} style={subTabStyle(videoTab === "bulk")}>Bulk Add</button>
                </div>
                {videoTab === "single" ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    <input value={videoSingleUrl} onChange={(e) => setVideoSingleUrl(e.target.value)} placeholder="YouTube URL" style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "9px 10px", background: "var(--bg-elevated)" }} />
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8 }}>
                      <input value={videoStart} onChange={(e) => setVideoStart(e.target.value)} placeholder="Start (s)" style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "9px 10px", background: "var(--bg-elevated)" }} />
                      <input value={videoEnd} onChange={(e) => setVideoEnd(e.target.value)} placeholder="End (s)" style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "9px 10px", background: "var(--bg-elevated)" }} />
                      <button type="button" onClick={() => void addVideoSingle()} style={smallBtn()}>Add</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-2)" }}>
                      <span>YouTube URLs (one per line)</span>
                      <span>{participantsRemaining} remaining</span>
                    </div>
                    <textarea value={videoBulk} onChange={(e) => setVideoBulk(e.target.value)} rows={5} placeholder={"https://youtube...\nhttps://youtube..."} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", background: "var(--bg-elevated)" }} />
                    <button type="button" onClick={() => void addVideoBulk()} style={smallBtn()}>Add Videos</button>
                  </div>
                )}
              </>
            )}

            <div style={{ display: "grid", gap: 8 }}>
              {bracketItems.map((item, idx) => (
                <div key={item.draftKey} style={{ display: "grid", gridTemplateColumns: "56px 1fr auto", gap: 8, alignItems: "center" }}>
                  <img src={item.preview} alt={item.name} style={{ width: 56, height: 56, borderRadius: 8, objectFit: "cover", border: "1px solid var(--border)" }} />
                  <input value={item.name} onChange={(e) => setBracketItems((prev) => prev.map((p, i) => (i === idx ? { ...p, name: e.target.value } : p)))} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", background: "var(--bg-elevated)" }} />
                  <button type="button" onClick={() => removeBracketItem(idx)} style={{ ...smallBtn(), color: "#f87171" }}>Remove</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {contentTab === "balance-text" && (
          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <div style={{ fontSize: 12, color: "var(--text-2)" }}>Participant entry count: {textEntries.length} / {MAX_TEXT_ENTRIES} text entries</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setTextTab("single")} style={subTabStyle(textTab === "single")}>Single Entry</button>
              <button type="button" onClick={() => setTextTab("bulk")} style={subTabStyle(textTab === "bulk")}>Bulk Add</button>
            </div>
            {textTab === "single" ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
                  <input value={textSingle} onChange={(e) => setTextSingle(e.target.value)} placeholder="Enter text..." style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "9px 10px", background: "var(--bg-elevated)" }} />
                  <button type="button" onClick={addTextSingle} style={smallBtn()}>+ Add</button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 8 }}>
                  <label style={{ display: "grid", gap: 5 }}>
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>Font</span>
                    <select value={textFont} onChange={(e) => setTextFont(e.target.value)} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", background: "var(--bg-elevated)" }}>
                      {FONT_OPTIONS.map((f) => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: "grid", gap: 5 }}>
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>Size</span>
                    <select value={textSize} onChange={(e) => setTextSize(e.target.value as "small" | "medium" | "large")} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", background: "var(--bg-elevated)" }}>
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </label>
                  <label style={{ display: "grid", gap: 5 }}>
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>Text Color ({textColor} {textColor.length}/7)</span>
                    <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} style={{ width: "100%", height: 34, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-elevated)" }} />
                  </label>
                  <label style={{ display: "grid", gap: 5 }}>
                    <span style={{ fontSize: 11, color: "var(--text-3)" }}>Background ({textBgColor} {textBgColor.length}/7)</span>
                    <input type="color" value={textBgColor} onChange={(e) => setTextBgColor(e.target.value)} style={{ width: "100%", height: 34, border: "1px solid var(--border)", borderRadius: 8, background: "var(--bg-elevated)" }} />
                  </label>
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-2)" }}>
                  <span>Entries (one per line)</span>
                  <span>{textRemaining} remaining</span>
                </div>
                <textarea value={textBulk} onChange={(e) => setTextBulk(e.target.value)} rows={6} placeholder={"Entry 1\nEntry 2\nEntry 3"} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", background: "var(--bg-elevated)" }} />
                <button type="button" onClick={addTextBulk} style={smallBtn()}>Add Entries</button>
              </>
            )}

            <div style={{ display: "grid", gap: 6 }}>
              {textEntries.map((entry, idx) => (
                <div key={`${entry.text}-${idx}`} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}>
                  <input value={entry.text} onChange={(e) => setTextEntries((prev) => prev.map((p, i) => (i === idx ? { ...p, text: e.target.value } : p)))} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", background: "var(--bg-elevated)" }} />
                  <button type="button" onClick={() => setTextEntries((prev) => prev.filter((_, i) => i !== idx))} style={{ ...smallBtn(), color: "#f87171" }}>Remove</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={saveDraftNow} disabled={busy} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", background: "var(--bg-card)", cursor: "pointer" }}>
          Save Draft
        </button>
        <button type="button" onClick={publish} disabled={busy || blockedByVerification} style={{ border: "none", borderRadius: 10, padding: "10px 14px", background: MUSTARD, color: "#231600", fontWeight: 900, cursor: "pointer" }}>
          {busy ? "Creating..." : "Create"}
        </button>
      </div>

      {status && <p style={{ marginTop: 10, fontSize: 12, color: "var(--text-2)" }}>{status}</p>}
      {error && <p style={{ marginTop: 8, color: "#f87171", fontSize: 12 }}>{error}</p>}
    </div>
  );
}

function tabStyle(active: boolean) {
  return {
    border: `1px solid ${active ? "#b8860b" : "var(--border)"}`,
    borderRadius: 999,
    padding: "7px 12px",
    background: active ? "rgba(184,134,11,0.2)" : "transparent",
    color: active ? "#b8860b" : "var(--text-2)",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
  } as const;
}

function subTabStyle(active: boolean) {
  return {
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "7px 10px",
    background: active ? "rgba(184,134,11,0.2)" : "var(--bg-elevated)",
    color: active ? "#b8860b" : "var(--text-2)",
    fontSize: 12,
    cursor: "pointer",
    fontWeight: 700,
  } as const;
}

function smallBtn() {
  return {
    border: "1px solid var(--border)",
    borderRadius: 8,
    padding: "8px 10px",
    background: "var(--bg-card)",
    cursor: "pointer",
    fontSize: 12,
  } as const;
}
