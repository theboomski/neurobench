"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import AuthModal from "@/components/ugc/AuthModal";
import { ISO_LANGUAGE_OPTIONS } from "@/lib/isoLanguages";
import { deriveItemNameFromFilename, slugifyTitle, withUniqueSuffix } from "@/lib/ugc";
import { getSupabaseBrowser } from "@/lib/supabase";
import type { UgcCategory, UgcGameType, UgcVisibility } from "@/lib/ugcTypes";

type BracketDraftItem = { file: File; name: string; preview: string };
type BalanceDraftItem = { optionA: string; optionB: string };

const ROUND_OPTIONS = [2, 4, 8, 16, 32];

export default function UgcCreateClient() {
  const router = useRouter();
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [user, setUser] = useState<User | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [step, setStep] = useState(1);
  const [type, setType] = useState<UgcGameType>("brackets");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState<File | null>(null);
  const [bracketItems, setBracketItems] = useState<BracketDraftItem[]>([]);
  const [balanceRounds, setBalanceRounds] = useState(2);
  const [balanceItems, setBalanceItems] = useState<BalanceDraftItem[]>([{ optionA: "", optionB: "" }]);
  const [categories, setCategories] = useState<UgcCategory[]>([]);
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [language, setLanguage] = useState("en");
  const [visibility, setVisibility] = useState<UgcVisibility>("public");
  const [isNsfw, setIsNsfw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isDropOver, setIsDropOver] = useState(false);

  useEffect(() => {
    void fetch("/api/ugc/categories").then((r) => r.json()).then((json) => setCategories(json.categories ?? []));
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setNeedsAuth(!data.session?.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, session) => {
      setUser(session?.user ?? null);
      setNeedsAuth(!session?.user);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    setBalanceItems(Array.from({ length: balanceRounds / 2 }, (_, i) => balanceItems[i] ?? { optionA: "", optionB: "" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balanceRounds]);

  const emailVerified = Boolean(user?.email_confirmed_at || (user?.app_metadata?.provider === "google"));
  const blockedByVerification = Boolean(user && !emailVerified);

  const onUploadBracketFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const next = Array.from(files).map((f) => ({
      file: f,
      name: deriveItemNameFromFilename(f.name) || "Untitled",
      preview: URL.createObjectURL(f),
    }));
    setBracketItems((prev) => [...prev, ...next]);
  };

  const removeBracketItem = (targetIndex: number) => {
    setBracketItems((prev) => {
      const target = prev[targetIndex];
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((_, idx) => idx !== targetIndex);
    });
  };

  const publish = async () => {
    if (!supabase || !user) return;
    setBusy(true);
    setError(null);
    setStatus("Preparing draft...");
    try {
      if (!title.trim()) throw new Error("Title is required.");
      if (type === "brackets" && !cover) throw new Error("Cover image is required for brackets.");
      if (type === "brackets" && bracketItems.length < 2) throw new Error("Brackets needs at least 2 images.");
      if (type === "balance" && balanceItems.some((it) => !it.optionA.trim() || !it.optionB.trim())) throw new Error("Fill all balance options.");

      const profilePayload = {
        id: user.id,
        email: user.email ?? null,
        display_name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User",
        avatar_url: user.user_metadata?.avatar_url ?? null,
      };
      await supabase.from("profiles").upsert(profilePayload);

      let coverUrl: string | null = null;
      if (cover) {
        setStatus("Uploading cover image...");
        const key = `${user.id}/${Date.now()}-${cover.name}`;
        const { error: uploadErr } = await supabase.storage.from("ugc-covers").upload(key, cover, { upsert: false });
        if (uploadErr) throw uploadErr;
        coverUrl = supabase.storage.from("ugc-covers").getPublicUrl(key).data.publicUrl;
      }

      const slug = withUniqueSuffix(slugifyTitle(title));
      setStatus("Creating game...");
      const { data: game, error: gameErr } = await supabase
        .from("ugc_games")
        .insert({
          user_id: user.id,
          type,
          title: title.trim(),
          description: description.trim() || null,
          cover_image_url: coverUrl,
          category_id: categoryId || null,
          language,
          visibility,
          is_nsfw: isNsfw,
          slug,
        })
        .select("id,type,slug")
        .single();
      if (gameErr || !game) throw gameErr ?? new Error("Failed to create game.");

      if (type === "brackets") {
        setStatus("Uploading bracket items...");
        const payload: { game_id: string; name: string; image_url: string; order: number }[] = [];
        for (let i = 0; i < bracketItems.length; i += 1) {
          const item = bracketItems[i];
          const key = `${user.id}/${game.id}/${Date.now()}-${i}-${item.file.name}`;
          const { error: itemUploadErr } = await supabase.storage.from("brackets").upload(key, item.file, { upsert: false });
          if (itemUploadErr) throw itemUploadErr;
          const imageUrl = supabase.storage.from("brackets").getPublicUrl(key).data.publicUrl;
          payload.push({ game_id: game.id, name: item.name.trim() || `Item ${i + 1}`, image_url: imageUrl, order: i });
        }
        const { error: itemsErr } = await supabase.from("ugc_brackets_items").insert(payload);
        if (itemsErr) throw itemsErr;
      } else {
        setStatus("Saving balance rounds...");
        const payload = balanceItems.map((it, i) => ({
          game_id: game.id,
          option_a: it.optionA.trim(),
          option_b: it.optionB.trim(),
          round: i + 1,
          order: i,
        }));
        const { error: balErr } = await supabase.from("ugc_balance_options").insert(payload);
        if (balErr) throw balErr;
      }

      router.push(game.type === "brackets" ? `/ugc/brackets/${game.slug}` : `/ugc/balance/${game.slug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to publish.");
    } finally {
      setStatus(null);
      setBusy(false);
    }
  };

  const canGoStep2 = true;
  const canGoStep3 = title.trim().length > 0;
  const canGoStep4 = type === "brackets" ? bracketItems.length >= 2 : balanceItems.every((it) => it.optionA.trim() && it.optionB.trim());

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px 60px" }}>
      <AuthModal open={needsAuth} />
      <h1 style={{ fontSize: 28, fontWeight: 900 }}>Create UGC</h1>
      <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 14 }}>Build a Brackets or Balance game in 4 steps.</p>
      {blockedByVerification && (
        <div style={{ border: "1px solid #f59e0b66", background: "#f59e0b14", borderRadius: 12, padding: 12, marginBottom: 14 }}>
          Please verify your email before creating games.
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[1, 2, 3, 4].map((n) => (
          <button
            key={n}
            onClick={() => setStep(n)}
            disabled={blockedByVerification || (n === 2 && !canGoStep2) || (n === 3 && !canGoStep3) || (n === 4 && !canGoStep4)}
            style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", background: step === n ? "#00FF9422" : "transparent" }}
          >
            Step {n}
          </button>
        ))}
      </div>

      {step === 1 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button onClick={() => setType("brackets")} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 18, background: type === "brackets" ? "#00FF9418" : "transparent" }}>🖼️ Brackets</button>
          <button onClick={() => setType("balance")} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 18, background: type === "balance" ? "#00FF9418" : "transparent" }}>⚖️ Balance</button>
        </div>
      )}

      {step === 2 && (
        <div style={{ display: "grid", gap: 8 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", background: "var(--bg-card)" }} />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" rows={3} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", background: "var(--bg-card)" }} />
          <label style={{ fontSize: 12, color: "var(--text-2)" }}>Cover image {type === "brackets" ? "(required)" : "(optional)"}</label>
          <input type="file" accept="image/png,image/jpeg" onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
        </div>
      )}

      {step === 3 && type === "brackets" && (
        <div>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDropOver(true);
            }}
            onDragLeave={() => setIsDropOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDropOver(false);
              onUploadBracketFiles(e.dataTransfer.files);
            }}
            style={{
              border: `1px dashed ${isDropOver ? "#00FF94" : "var(--border)"}`,
              borderRadius: 10,
              padding: 14,
              background: isDropOver ? "#00FF9414" : "var(--bg-card)",
              marginBottom: 8,
            }}
          >
            <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 8 }}>Drop images here or select files.</div>
            <input type="file" accept="image/png,image/jpeg" multiple onChange={(e) => onUploadBracketFiles(e.target.files)} />
          </div>
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {bracketItems.map((item, idx) => (
              <div key={`${item.file.name}-${idx}`} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <img src={item.preview} alt={item.name} style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8 }} />
                <input
                  value={item.name}
                  onChange={(e) => setBracketItems((prev) => prev.map((p, i) => (i === idx ? { ...p, name: e.target.value } : p)))}
                  style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", background: "var(--bg-card)" }}
                />
                <button onClick={() => removeBracketItem(idx)} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", background: "transparent", color: "#f87171" }}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 3 && type === "balance" && (
        <div style={{ display: "grid", gap: 10 }}>
          <select value={balanceRounds} onChange={(e) => setBalanceRounds(Number(e.target.value))} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", background: "var(--bg-card)" }}>
            {ROUND_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r} rounds
              </option>
            ))}
          </select>
          {balanceItems.map((item, idx) => (
            <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <input value={item.optionA} onChange={(e) => setBalanceItems((prev) => prev.map((p, i) => (i === idx ? { ...p, optionA: e.target.value } : p)))} placeholder={`Round ${idx + 1} option A`} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", background: "var(--bg-card)" }} />
              <input value={item.optionB} onChange={(e) => setBalanceItems((prev) => prev.map((p, i) => (i === idx ? { ...p, optionB: e.target.value } : p)))} placeholder={`Round ${idx + 1} option B`} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", background: "var(--bg-card)" }} />
            </div>
          ))}
        </div>
      )}

      {step === 4 && (
        <div style={{ display: "grid", gap: 8 }}>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", background: "var(--bg-card)" }}>
            {ISO_LANGUAGE_OPTIONS.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name} ({lang.code})
              </option>
            ))}
          </select>
          <select value={String(categoryId)} onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", background: "var(--bg-card)" }}>
            <option value="">Select category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <select value={visibility} onChange={(e) => setVisibility(e.target.value as UgcVisibility)} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", background: "var(--bg-card)" }}>
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="closed">Closed</option>
          </select>
          <label style={{ fontSize: 12 }}>
            <input type="checkbox" checked={isNsfw} onChange={(e) => setIsNsfw(e.target.checked)} /> NSFW
          </label>
          <button onClick={publish} disabled={busy || blockedByVerification} style={{ border: "none", borderRadius: 10, padding: "11px 14px", background: "#00FF94", color: "#022e1b", fontWeight: 900 }}>
            {busy ? "Publishing..." : "Publish"}
          </button>
          {status && <p style={{ fontSize: 12, color: "var(--text-2)" }}>{status}</p>}
        </div>
      )}
      {error && <p style={{ marginTop: 10, color: "#f87171", fontSize: 12 }}>{error}</p>}
    </div>
  );
}
