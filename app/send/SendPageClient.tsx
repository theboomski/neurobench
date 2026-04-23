"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { FUN_SEND_DEFAULT_FACE_RECT, FUN_SEND_TABS, type FunSendCategory, type FunSendTemplate } from "@/lib/funSendTemplates";
import { getSupabaseBrowser } from "@/lib/supabase";

export type SendPageClientProps = { templatesByCategory: Record<FunSendCategory, FunSendTemplate[]> };

function firstCategoryWithTemplatesList(by: Record<FunSendCategory, FunSendTemplate[]>): FunSendCategory {
  for (const { id } of FUN_SEND_TABS) {
    if ((by[id] ?? []).length > 0) return id;
  }
  return FUN_SEND_TABS[0]!.id;
}

const ACCENT = "#f472b6";
const ACCENT_SOFT = "rgba(244,114,182,0.14)";
/** Face clip guide on live preview (dashed ring) */
const FACE_PREVIEW_GUIDE_BLUE = "#0019fc";

const CARD_SIZE = 1080;
const FACE_SIZE_MIN = 80;
const FACE_SIZE_MAX = 420;
const FACE_NUDGE_COARSE = 10;
const FACE_NUDGE_FINE = 2;
const FACE_SIZE_STEP = 12;
/** Default name pill on 1080×1080 canvas (horizontally centered for w=500) */
const DEFAULT_NAME_RECT = { x: 290, y: 122, w: 500, h: 96 };
const NAME_W_MIN = 200;
const NAME_W_MAX = 1020;
const NAME_H_MIN = 36;
const NAME_H_MAX = 200;
const NAME_NUDGE_COARSE = 10;
const NAME_NUDGE_FINE = 2;
const NAME_GROW_FACTOR = 1.07;
const NAME_SHRINK_FACTOR = 1 / NAME_GROW_FACTOR;
const NAME_ACCENT = "#22d3ee";
const FUN_SEND_SHARE_DRAFT_KEY = "fun-send-share-draft";

/** Burned into preview + upload PNG in `renderComposite`. */
const FUN_SEND_WATERMARK_TEXT = "Make your own at Zazaza.app";

function drawFunSendWatermark(ctx: CanvasRenderingContext2D) {
  const fontSize = 27;
  const padX = 32;
  const padY = 28;
  ctx.save();
  ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, "Segoe UI", sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;
  const x = CARD_SIZE - padX;
  const y = CARD_SIZE - padY;
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(0,0,0,0.62)";
  ctx.strokeText(FUN_SEND_WATERMARK_TEXT, x, y);
  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.fillText(FUN_SEND_WATERMARK_TEXT, x, y);
  ctx.restore();
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

function clampFaceRect(x: number, y: number, size: number): { x: number; y: number; size: number } {
  const s = Math.min(FACE_SIZE_MAX, Math.max(FACE_SIZE_MIN, Math.round(size)));
  const maxX = CARD_SIZE - s;
  const maxY = CARD_SIZE - s;
  return {
    x: Math.min(Math.max(0, Math.round(x)), maxX),
    y: Math.min(Math.max(0, Math.round(y)), maxY),
    size: s,
  };
}

function nudgeFaceRect(prev: { x: number; y: number; size: number }, dx: number, dy: number) {
  return clampFaceRect(prev.x + dx, prev.y + dy, prev.size);
}

function resizeFaceRectCentered(prev: { x: number; y: number; size: number }, delta: number) {
  const cx = prev.x + prev.size / 2;
  const cy = prev.y + prev.size / 2;
  const nextSize = prev.size + delta;
  const s = Math.min(FACE_SIZE_MAX, Math.max(FACE_SIZE_MIN, Math.round(nextSize)));
  return clampFaceRect(cx - s / 2, cy - s / 2, s);
}

function clampNameRect(r: { x: number; y: number; w: number; h: number }): { x: number; y: number; w: number; h: number } {
  const w = Math.round(Math.min(NAME_W_MAX, Math.max(NAME_W_MIN, r.w)));
  const h = Math.round(Math.min(NAME_H_MAX, Math.max(NAME_H_MIN, r.h)));
  const maxX = CARD_SIZE - w;
  const maxY = CARD_SIZE - h;
  return {
    x: Math.min(Math.max(0, Math.round(r.x)), maxX),
    y: Math.min(Math.max(0, Math.round(r.y)), maxY),
    w,
    h,
  };
}

function nudgeNameRect(prev: { x: number; y: number; w: number; h: number }, dx: number, dy: number) {
  return clampNameRect({ ...prev, x: prev.x + dx, y: prev.y + dy });
}

function scaleNameRectCentered(prev: { x: number; y: number; w: number; h: number }, factor: number) {
  const cx = prev.x + prev.w / 2;
  const cy = prev.y + prev.h / 2;
  const nw = Math.round(prev.w * factor);
  const nh = Math.round(prev.h * factor);
  return clampNameRect({ x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh });
}

function createShortId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)] ?? "x";
  return out;
}

function UploadIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 4v12m0 0l-4-4m4 4l4-4M5 20h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SendPageClient({ templatesByCategory }: SendPageClientProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();
  /** Re-run draft sync when the real URL query changes (client navigation). */
  const resumeQueryKey = searchParams.toString();
  const initialCategory = firstCategoryWithTemplatesList(templatesByCategory);
  const initialTemplates = templatesByCategory[initialCategory] ?? [];
  const [category, setCategory] = useState<FunSendCategory>(() => initialCategory);
  const [selectedTemplateId, setSelectedTemplateId] = useState(() => initialTemplates[0]?.id ?? "");
  const [name, setName] = useState("");
  const [faceObjectUrl, setFaceObjectUrl] = useState<string | null>(null);
  const [hasFaceFile, setHasFaceFile] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  /** "Done!" / post-share UI only for this visit or `?resume=1` restore — resets on new entry so refresh/home→send shows Share. */
  const [postShareUi, setPostShareUi] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [shareProgress, setShareProgress] = useState(0);
  const [error, setError] = useState("");
  const [faceRect, setFaceRect] = useState(() => initialTemplates[0]?.faceDefault ?? FUN_SEND_DEFAULT_FACE_RECT);
  const [nameRect, setNameRect] = useState(() => ({ ...DEFAULT_NAME_RECT }));

  const templates = useMemo(() => templatesByCategory[category] ?? [], [templatesByCategory, category]);

  const templateAvailable = templates.length > 0;
  const currentTemplate = useMemo(() => {
    if (!templates.length) return null;
    return templates.find((t) => t.id === selectedTemplateId) ?? templates[0] ?? null;
  }, [templates, selectedTemplateId]);

  const firstCategoryWithTemplates = useMemo(
    () => FUN_SEND_TABS.find((c) => (templatesByCategory[c.id] ?? []).length > 0)?.label ?? "another category",
    [templatesByCategory],
  );

  const switchCategory = (next: FunSendCategory) => {
    setCategory(next);
    const list = templatesByCategory[next] ?? [];
    if (!list.length) {
      setSelectedTemplateId("");
      return;
    }
    const first = list[0]!;
    setSelectedTemplateId(first.id);
    setFaceRect(first.faceDefault ?? FUN_SEND_DEFAULT_FACE_RECT);
    setNameRect({ ...DEFAULT_NAME_RECT });
  };

  const selectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const list = templatesByCategory[category] ?? [];
    const t = list.find((x) => x.id === templateId);
    if (t) setFaceRect(t.faceDefault ?? FUN_SEND_DEFAULT_FACE_RECT);
    setNameRect({ ...DEFAULT_NAME_RECT });
  };

  const displayName = name.trim() || "Friend";
  const canNativeShare = typeof window !== "undefined" && "share" in navigator;

  useEffect(() => {
    const id = "fredoka-one-fun-sends";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Fredoka+One&display=swap";
    document.head.appendChild(link);
  }, []);

  /**
   * Single layout pass: restore from LS only when the browser URL has `?resume=1` (never RSC/searchParams alone —
   * those can disagree with `location` and showed "Done!" on desktop while mobile looked correct).
   */
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const resume = new URLSearchParams(window.location.search).get("resume") === "1";
    if (resume) {
      try {
        const raw = window.localStorage.getItem(FUN_SEND_SHARE_DRAFT_KEY);
        if (!raw) {
          setShareUrl("");
          setShareMessage("");
          setShareProgress(0);
          setPostShareUi(false);
          return;
        }
        const parsed = JSON.parse(raw) as { shareUrl?: unknown; shareMessage?: unknown };
        const url = typeof parsed.shareUrl === "string" ? parsed.shareUrl : "";
        setShareUrl(url);
        setShareMessage(typeof parsed.shareMessage === "string" ? parsed.shareMessage : "");
        setShareProgress(0);
        setPostShareUi(Boolean(url));
      } catch {
        setShareUrl("");
        setShareMessage("");
        setShareProgress(0);
        setPostShareUi(false);
      }
      return;
    }
    setShareUrl("");
    setShareMessage("");
    setShareProgress(0);
    setPostShareUi(false);
    try {
      window.localStorage.removeItem(FUN_SEND_SHARE_DRAFT_KEY);
    } catch {
      // ignore
    }
  }, [resumeQueryKey]);

  /** bfcache restore can resurrect pre-navigation React state — snap back to Share unless `?resume=1`. */
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      if (typeof window === "undefined") return;
      const resume = new URLSearchParams(window.location.search).get("resume") === "1";
      if (resume) return;
      setShareUrl("");
      setShareMessage("");
      setShareProgress(0);
      setPostShareUi(false);
      try {
        window.localStorage.removeItem(FUN_SEND_SHARE_DRAFT_KEY);
      } catch {
        // ignore
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  /** Persist successful share only. Do not clear LS here — `useLayoutEffect` owns removal to avoid racing before restore reads draft. */
  useEffect(() => {
    try {
      if (!shareUrl) return;
      window.localStorage.setItem(FUN_SEND_SHARE_DRAFT_KEY, JSON.stringify({ shareUrl, shareMessage }));
    } catch {
      // localStorage unavailable (private mode, etc.)
    }
  }, [shareUrl, shareMessage]);

  const renderComposite = useCallback(
    async (forUpload: boolean): Promise<{ blob: Blob; preview: string }> => {
      if (!currentTemplate) throw new Error("No template selected");

      const canvas = document.createElement("canvas");
      canvas.width = CARD_SIZE;
      canvas.height = CARD_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");

      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, CARD_SIZE, CARD_SIZE);

      try {
        const bg = await loadImage(currentTemplate.imageSrc);
        ctx.drawImage(bg, 0, 0, CARD_SIZE, CARD_SIZE);
      } catch {
        ctx.fillStyle = "#202020";
        ctx.fillRect(0, 0, CARD_SIZE, CARD_SIZE);
      }

      if (faceObjectUrl) {
        try {
          const face = await loadImage(faceObjectUrl);
          const { x: fx, y: fy, size: fs } = faceRect;
          const cx = fx + fs / 2;
          const cy = fy + fs / 2;
          const radius = fs / 2;
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(face, fx, fy, fs, fs);
          ctx.restore();
        } catch {
          // ignore face loading failure and keep base image
        }
      }

      const { x: nx, y: ny, w: nw, h: nh } = nameRect;
      const nameR = Math.min(nh / 2, nw / 2);
      drawRoundedRect(ctx, nx, ny, nw, nh, nameR);
      ctx.fillStyle = "rgba(255,255,255,0.98)";
      ctx.fill();

      ctx.fillStyle = "#111";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const fontPx = Math.min(72, Math.max(20, Math.round(nh * 0.58)));
      ctx.font = `700 ${fontPx}px "Fredoka One", "Arial Black", "Segoe UI", sans-serif`;
      ctx.fillText(displayName, nx + nw / 2, ny + nh / 2 + 1, nw - 16);

      drawFunSendWatermark(ctx);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (!b) {
              reject(new Error("Failed to create image blob"));
              return;
            }
            resolve(b);
          },
          "image/png",
          0.95,
        );
      });
      const preview = forUpload ? "" : canvas.toDataURL("image/png");
      return { blob, preview };
    },
    [currentTemplate, displayName, faceObjectUrl, faceRect, nameRect],
  );

  useEffect(() => {
    if (!templateAvailable) return;
    const typingTarget = (t: EventTarget | null) => {
      const el = t as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (el.isContentEditable) return true;
      return false;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (typingTarget(e.target)) return;
      const step = e.shiftKey ? FACE_NUDGE_FINE : FACE_NUDGE_COARSE;
      const nameStep = e.shiftKey ? NAME_NUDGE_FINE : NAME_NUDGE_COARSE;
      if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        if (e.key === "ArrowLeft") setNameRect((r) => nudgeNameRect(r, -nameStep, 0));
        else if (e.key === "ArrowRight") setNameRect((r) => nudgeNameRect(r, nameStep, 0));
        else if (e.key === "ArrowUp") setNameRect((r) => nudgeNameRect(r, 0, -nameStep));
        else setNameRect((r) => nudgeNameRect(r, 0, nameStep));
        return;
      }
      if (e.altKey && (e.code === "BracketLeft" || e.code === "BracketRight")) {
        e.preventDefault();
        if (e.code === "BracketLeft") setNameRect((r) => scaleNameRectCentered(r, NAME_SHRINK_FACTOR));
        else setNameRect((r) => scaleNameRectCentered(r, NAME_GROW_FACTOR));
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setFaceRect((r) => nudgeFaceRect(r, -step, 0));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setFaceRect((r) => nudgeFaceRect(r, step, 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFaceRect((r) => nudgeFaceRect(r, 0, -step));
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setFaceRect((r) => nudgeFaceRect(r, 0, step));
      } else if (e.key === "-" || e.key === "_" || e.code === "Minus" || e.code === "NumpadSubtract") {
        e.preventDefault();
        setFaceRect((r) => resizeFaceRectCentered(r, -FACE_SIZE_STEP));
      } else if (e.key === "=" || e.key === "+" || e.code === "Equal" || e.code === "NumpadAdd") {
        e.preventDefault();
        setFaceRect((r) => resizeFaceRectCentered(r, FACE_SIZE_STEP));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [templateAvailable]);

  useEffect(() => {
    let cancelled = false;
    if (!templateAvailable) {
      setPreviewUrl(null);
      return;
    }
    setError("");
    void (async () => {
      try {
        const { preview } = await renderComposite(false);
        if (cancelled) return;
        setPreviewUrl(preview);
      } catch (e) {
        if (cancelled) return;
        setError(readErrorMessage(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [templateAvailable, renderComposite]);

  useEffect(
    () => () => {
      if (faceObjectUrl) URL.revokeObjectURL(faceObjectUrl);
    },
    [faceObjectUrl],
  );
  useEffect(() => {
    if (!isSaving) return;
    setShareProgress((prev) => (prev > 0 ? prev : 10));
    const timer = window.setInterval(() => {
      setShareProgress((prev) => Math.min(prev + 3, 94));
    }, 220);
    return () => window.clearInterval(timer);
  }, [isSaving]);

  const onFaceChange = (file: File | null) => {
    if (faceObjectUrl) URL.revokeObjectURL(faceObjectUrl);
    if (!file) {
      setFaceObjectUrl(null);
      setHasFaceFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setFaceObjectUrl(URL.createObjectURL(file));
    setHasFaceFile(true);
  };

  const onCreateShare = async () => {
    if (!templateAvailable || (shareUrl && postShareUi)) return;
    setIsSaving(true);
    setShareProgress(10);
    setError("");
    try {
      const { blob } = await renderComposite(true);
      setShareProgress((prev) => Math.max(prev, 32));
      const sb = getSupabaseBrowser();
      if (!sb) throw new Error("Supabase browser client is not configured.");

      const shortId = createShortId();
      const path = `${shortId}.png`;
      const upload = await sb.storage.from("cards").upload(path, blob, { contentType: "image/png", upsert: true });
      if (upload.error) throw new Error(upload.error.message);
      setShareProgress((prev) => Math.max(prev, 72));

      const publicUrl = sb.storage.from("cards").getPublicUrl(path).data.publicUrl;
      const row = await sb.from("shared_cards").insert({ id: shortId, image_url: publicUrl });
      if (row.error) throw new Error(row.error.message);
      setShareProgress((prev) => Math.max(prev, 90));

      const url = `https://zazaza.app/card/${shortId}`;
      const message = `I made this for you 😂 ${url}`;
      setShareUrl(url);
      setShareMessage(message);
      setPostShareUi(true);
      setShareProgress(100);
    } catch (e) {
      setError(readErrorMessage(e));
      setShareProgress(0);
    } finally {
      setIsSaving(false);
    }
  };

  const onCopy = async () => {
    if (!shareMessage) return;
    try {
      await navigator.clipboard.writeText(shareMessage);
    } catch {
      window.prompt("Copy this text:", shareMessage);
    }
  };

  const onNativeShare = async () => {
    if (!shareUrl || !postShareUi || !navigator.share) return;
    try {
      // Keep URL in `text` only to avoid duplicate messages on some share targets.
      await navigator.share({ title: "Fun Send", text: shareMessage });
    } catch {
      // no-op
    }
  };

  const categoryPills = useMemo(
    () =>
      FUN_SEND_TABS.map((c) => {
        const active = category === c.id;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => switchCategory(c.id)}
            className="pressable"
            style={{
              border: active ? `2px solid ${ACCENT}` : "1px solid var(--border)",
              background: active ? ACCENT_SOFT : "var(--bg-elevated)",
              color: active ? ACCENT : "var(--text-2)",
              borderRadius: 999,
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 700,
              whiteSpace: "nowrap",
              fontFamily: "var(--font-mono)",
              cursor: "pointer",
            }}
          >
            {c.label}
          </button>
        );
      }),
    [templatesByCategory, category],
  );

  const stepCard = (step: string, title: string, children: ReactNode) => (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${ACCENT}`,
        borderRadius: "var(--radius-lg)",
        padding: "22px 22px 22px 20px",
      }}
    >
      <div style={{ fontSize: 10, color: ACCENT, fontFamily: "var(--font-mono)", letterSpacing: "0.1em", marginBottom: 6 }}>{step}</div>
      <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 14, color: "var(--text-1)" }}>{title}</div>
      {children}
    </div>
  );

  const faceHintPct = useMemo(
    () => ({
      left: (faceRect.x / CARD_SIZE) * 100,
      top: (faceRect.y / CARD_SIZE) * 100,
      size: (faceRect.size / CARD_SIZE) * 100,
    }),
    [faceRect],
  );

  const nameHintPct = useMemo(
    () => ({
      left: (nameRect.x / CARD_SIZE) * 100,
      top: (nameRect.y / CARD_SIZE) * 100,
      w: (nameRect.w / CARD_SIZE) * 100,
      h: (nameRect.h / CARD_SIZE) * 100,
    }),
    [nameRect],
  );

  const btnMini: CSSProperties = {
    border: "1px solid var(--border-md)",
    background: "var(--bg-elevated)",
    color: "var(--text-1)",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "var(--font-mono)",
    minWidth: 40,
  };

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
      <div style={{ padding: "16px 0 0" }}>
        <div className="ad-slot ad-banner">Advertisement</div>
      </div>

      <section style={{ marginBottom: 20, paddingTop: 16 }}>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 4 }}>{categoryPills}</div>
      </section>

      {!templateAvailable && (
        <section style={{ marginBottom: 56 }}>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: `3px solid ${ACCENT}`, borderRadius: "var(--radius-lg)", padding: "28px 24px", color: "var(--text-2)", fontSize: 14, lineHeight: 1.7 }}>
            More templates are coming soon for this category. Try <strong style={{ color: "var(--text-1)" }}>{firstCategoryWithTemplates}</strong> for now.
          </div>
        </section>
      )}

      {templateAvailable && (
        <>
          <section style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, color: ACCENT, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", marginBottom: 10 }}>DESIGN</div>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6, WebkitOverflowScrolling: "touch" }}>
              {templates.map((tmpl) => {
                const active = tmpl.id === selectedTemplateId;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    className="pressable"
                    onClick={() => selectTemplate(tmpl.id)}
                    style={{
                      flex: "0 0 auto",
                      width: 104,
                      padding: 8,
                      borderRadius: 12,
                      border: active ? `2px solid ${ACCENT}` : "1px solid var(--border)",
                      background: active ? ACCENT_SOFT : "var(--bg-elevated)",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    <img
                      src={tmpl.imageSrc}
                      alt={tmpl.title}
                      width={88}
                      height={88}
                      style={{
                        width: 88,
                        height: 88,
                        objectFit: "cover",
                        borderRadius: 8,
                        display: "block",
                        margin: "0 auto 8px",
                        border: "1px solid var(--border-md)",
                      }}
                    />
                    <span style={{ fontSize: 11, fontWeight: 700, color: active ? ACCENT : "var(--text-2)", lineHeight: 1.25, display: "block" }}>{tmpl.title}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 18, marginBottom: 56 }}>
          {stepCard("STEP 1", "Enter their name or a personal message", (
            <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 13, color: "var(--text-2)" }}>Shown on the card as</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-md)",
                  borderRadius: 10,
                  color: "var(--text-1)",
                  padding: "12px 14px",
                  fontSize: 15,
                  maxWidth: 420,
                }}
              />
              <span style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>Preview: {name.trim() || "Friend"}</span>
            </label>
          ))}

          {stepCard("STEP 2", "Face photo (optional)", (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                tabIndex={-1}
                aria-hidden
                onChange={(e) => onFaceChange(e.target.files?.[0] ?? null)}
                style={{
                  position: "fixed",
                  left: -9999,
                  top: 0,
                  width: 1,
                  height: 1,
                  opacity: 0,
                  pointerEvents: "none",
                }}
              />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                <button
                  type="button"
                  className="pressable"
                  aria-label={hasFaceFile ? "Change face photo" : "Choose face photo"}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    border: "1px solid var(--border-md)",
                    background: "var(--bg-elevated)",
                    color: "var(--text-1)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  <UploadIcon />
                  {hasFaceFile ? "Change photo" : "Choose photo"}
                </button>
                {hasFaceFile && (
                  <button
                    type="button"
                    className="pressable"
                    onClick={() => onFaceChange(null)}
                    style={{
                      border: "1px solid var(--border)",
                      background: "transparent",
                      color: "var(--text-3)",
                      borderRadius: 10,
                      padding: "10px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
              <p style={{ fontSize: 12, color: "var(--text-3)", lineHeight: 1.6, margin: 0 }}>
                Your photo is clipped to the circle on the card (blue dashed guide in Step 3). The name pill has a cyan guide — adjust both there if needed.
              </p>
            </div>
          ))}

          {stepCard("STEP 3", "Live preview", (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div
                  style={{
                    position: "relative",
                    width: "min(92vw, 520px)",
                    aspectRatio: "1 / 1",
                    borderRadius: 14,
                    overflow: "hidden",
                    border: "1px solid var(--border-md)",
                    background: "#141414",
                  }}
                >
                  {previewUrl ? (
                    <img src={previewUrl} alt="Card preview" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "100%",
                        height: "100%",
                        color: "var(--text-3)",
                        fontFamily: "var(--font-mono)",
                        fontSize: 12,
                      }}
                    >
                      Preview unavailable
                    </div>
                  )}
                  {previewUrl && (
                    <>
                      <div
                        aria-hidden
                        style={{
                          position: "absolute",
                          left: `${faceHintPct.left}%`,
                          top: `${faceHintPct.top}%`,
                          width: `${faceHintPct.size}%`,
                          height: `${faceHintPct.size}%`,
                          borderRadius: "50%",
                          border: `5px dashed ${FACE_PREVIEW_GUIDE_BLUE}`,
                          boxSizing: "border-box",
                          boxShadow: `0 0 0 2px rgba(0, 25, 252, 0.55), 0 0 22px 8px rgba(0, 25, 252, 0.5)`,
                          pointerEvents: "none",
                        }}
                      />
                      <div
                        aria-hidden
                        style={{
                          position: "absolute",
                          left: `${nameHintPct.left}%`,
                          top: `${nameHintPct.top}%`,
                          width: `${nameHintPct.w}%`,
                          height: `${nameHintPct.h}%`,
                          borderRadius: 12,
                          border: `2px dashed ${NAME_ACCENT}`,
                          boxShadow: `0 0 0 2px rgba(0,0,0,0.35) inset`,
                          pointerEvents: "none",
                        }}
                      />
                    </>
                  )}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 16,
                  alignItems: "stretch",
                }}
              >
                <div
                  style={{
                    flex: "1 1 280px",
                    minWidth: 0,
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-md)",
                    borderRadius: 10,
                    padding: "14px 16px",
                  }}
                >
                  <div style={{ fontSize: 11, color: ACCENT, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", marginBottom: 8 }}>ADJUST FACE POSITION</div>
                  <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.55, margin: "0 0 12px" }}>
                    <strong style={{ color: "var(--text-1)" }}>Arrow keys</strong> nudge (hold <strong style={{ color: "var(--text-1)" }}>Shift</strong> for finer steps).{" "}
                    <strong style={{ color: "var(--text-1)" }}>+</strong> / <strong style={{ color: "var(--text-1)" }}>−</strong> resize when not typing in a field.
                  </p>
                  <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 12 }}>
                    x {faceRect.x} · y {faceRect.y} · ø {faceRect.size}px
                  </div>

                  <div style={{ fontSize: 10, color: ACCENT, fontFamily: "var(--font-mono)", letterSpacing: "0.06em", marginBottom: 8 }}>SIZE</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 14 }}>
                    <button type="button" className="pressable" style={btnMini} onClick={() => setFaceRect((r) => resizeFaceRectCentered(r, -FACE_SIZE_STEP))}>
                      Smaller
                    </button>
                    <button type="button" className="pressable" style={btnMini} onClick={() => setFaceRect((r) => resizeFaceRectCentered(r, FACE_SIZE_STEP))}>
                      Larger
                    </button>
                  </div>

                  <div style={{ fontSize: 10, color: ACCENT, fontFamily: "var(--font-mono)", letterSpacing: "0.06em", marginBottom: 8 }}>POSITION</div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginBottom: 12 }}>
                    <button
                      type="button"
                      className="pressable"
                      style={{ ...btnMini, minWidth: 120 }}
                      onClick={() => setFaceRect((r) => nudgeFaceRect(r, 0, -FACE_NUDGE_COARSE))}
                    >
                      ↑ Up
                    </button>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" className="pressable" style={btnMini} onClick={() => setFaceRect((r) => nudgeFaceRect(r, -FACE_NUDGE_COARSE, 0))}>
                        ← Left
                      </button>
                      <button type="button" className="pressable" style={btnMini} onClick={() => setFaceRect((r) => nudgeFaceRect(r, FACE_NUDGE_COARSE, 0))}>
                        Right →
                      </button>
                    </div>
                    <button
                      type="button"
                      className="pressable"
                      style={{ ...btnMini, minWidth: 120 }}
                      onClick={() => setFaceRect((r) => nudgeFaceRect(r, 0, FACE_NUDGE_COARSE))}
                    >
                      ↓ Down
                    </button>
                  </div>

                  <button
                    type="button"
                    className="pressable"
                    onClick={() => setFaceRect(currentTemplate?.faceDefault ?? FUN_SEND_DEFAULT_FACE_RECT)}
                    style={{
                      ...btnMini,
                      borderColor: ACCENT,
                      color: ACCENT,
                      background: ACCENT_SOFT,
                      width: "100%",
                    }}
                  >
                    Reset face to default
                  </button>
                </div>

                <div
                  style={{
                    flex: "1 1 280px",
                    minWidth: 0,
                    background: "var(--bg-elevated)",
                    border: `1px solid rgba(34,211,238,0.35)`,
                    borderRadius: 10,
                    padding: "14px 16px",
                  }}
                >
                  <div style={{ fontSize: 11, color: NAME_ACCENT, fontFamily: "var(--font-mono)", letterSpacing: "0.08em", marginBottom: 8 }}>
                    ADJUST NAME / PERSONAL MESSAGE POSITION
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.55, margin: "0 0 12px" }}>
                    <strong style={{ color: "var(--text-1)" }}>Alt + arrows</strong> nudge (hold <strong style={{ color: "var(--text-1)" }}>Shift</strong> for finer steps).{" "}
                    <strong style={{ color: "var(--text-1)" }}>Alt + [</strong> / <strong style={{ color: "var(--text-1)" }}>]</strong> resize when not typing in a field.
                  </p>
                  <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 12 }}>
                    x {nameRect.x} · y {nameRect.y} · {nameRect.w}×{nameRect.h}px
                  </div>

                  <div style={{ fontSize: 10, color: NAME_ACCENT, fontFamily: "var(--font-mono)", letterSpacing: "0.06em", marginBottom: 8 }}>SIZE</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 14 }}>
                    <button type="button" className="pressable" style={btnMini} onClick={() => setNameRect((r) => scaleNameRectCentered(r, NAME_SHRINK_FACTOR))}>
                      Smaller
                    </button>
                    <button type="button" className="pressable" style={btnMini} onClick={() => setNameRect((r) => scaleNameRectCentered(r, NAME_GROW_FACTOR))}>
                      Larger
                    </button>
                  </div>

                  <div style={{ fontSize: 10, color: NAME_ACCENT, fontFamily: "var(--font-mono)", letterSpacing: "0.06em", marginBottom: 8 }}>POSITION</div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, marginBottom: 12 }}>
                    <button
                      type="button"
                      className="pressable"
                      style={{ ...btnMini, minWidth: 120 }}
                      onClick={() => setNameRect((r) => nudgeNameRect(r, 0, -NAME_NUDGE_COARSE))}
                    >
                      ↑ Up
                    </button>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" className="pressable" style={btnMini} onClick={() => setNameRect((r) => nudgeNameRect(r, -NAME_NUDGE_COARSE, 0))}>
                        ← Left
                      </button>
                      <button type="button" className="pressable" style={btnMini} onClick={() => setNameRect((r) => nudgeNameRect(r, NAME_NUDGE_COARSE, 0))}>
                        Right →
                      </button>
                    </div>
                    <button
                      type="button"
                      className="pressable"
                      style={{ ...btnMini, minWidth: 120 }}
                      onClick={() => setNameRect((r) => nudgeNameRect(r, 0, NAME_NUDGE_COARSE))}
                    >
                      ↓ Down
                    </button>
                  </div>

                  <button
                    type="button"
                    className="pressable"
                    onClick={() => setNameRect({ ...DEFAULT_NAME_RECT })}
                    style={{
                      ...btnMini,
                      borderColor: NAME_ACCENT,
                      color: NAME_ACCENT,
                      background: "rgba(34,211,238,0.12)",
                      width: "100%",
                    }}
                  >
                    Reset name box to default
                  </button>
                </div>
              </div>
            </div>
          ))}

          {stepCard("STEP 4", "Share", (
            <>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
                <button
                  type="button"
                  onClick={() => void onCreateShare()}
                  disabled={isSaving || Boolean(shareUrl && postShareUi)}
                  className="pressable"
                  style={{
                    border: "none",
                    borderRadius: 10,
                    padding: "12px 18px",
                    background: ACCENT,
                    color: "#1a0510",
                    fontWeight: 900,
                    cursor: isSaving || (shareUrl && postShareUi) ? "default" : "pointer",
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    letterSpacing: "0.04em",
                    opacity: shareUrl && postShareUi ? 0.8 : 1,
                  }}
                >
                  {isSaving ? "Almost Ready..." : shareUrl && postShareUi ? "Done!" : "Share"}
                </button>
                {isSaving && (
                  <div
                    aria-label={`Upload progress ${shareProgress}%`}
                    style={{
                      width: "min(56vw, 220px)",
                      height: 10,
                      borderRadius: 999,
                      overflow: "hidden",
                      border: "1px solid var(--border-md)",
                      background: "var(--bg-elevated)",
                    }}
                  >
                    <div
                      style={{
                        width: `${shareProgress}%`,
                        height: "100%",
                        background: ACCENT,
                        transition: "width 160ms linear",
                      }}
                    />
                  </div>
                )}
                {isSaving && (
                  <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", minWidth: 40 }}>{shareProgress}%</span>
                )}
                {shareUrl && postShareUi && (
                  <Link href={`${shareUrl.replace("https://zazaza.app", "")}?from=send`} style={{ color: ACCENT, fontSize: 13, fontWeight: 700 }}>
                    Open card ↗
                  </Link>
                )}
              </div>

              {shareUrl && postShareUi && (
                <>
                  <label style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                    <span style={{ fontSize: 13, color: "var(--text-2)" }}>Share message (editable)</span>
                    <textarea
                      value={shareMessage}
                      onChange={(e) => setShareMessage(e.target.value)}
                      rows={3}
                      style={{
                        resize: "vertical",
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--border-md)",
                        borderRadius: 10,
                        color: "var(--text-1)",
                        padding: "12px 14px",
                        fontSize: 14,
                        lineHeight: 1.5,
                        maxWidth: 560,
                      }}
                    />
                  </label>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => void onCopy()}
                      className="pressable"
                      style={{
                        border: "1px solid var(--border-md)",
                        background: "var(--bg-elevated)",
                        color: "var(--text-1)",
                        borderRadius: 10,
                        padding: "10px 14px",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      Copy
                    </button>
                    {canNativeShare && (
                      <button
                        type="button"
                        onClick={() => void onNativeShare()}
                        className="pressable"
                        style={{
                          border: "1px solid var(--border-md)",
                          background: "var(--bg-elevated)",
                          color: "var(--text-1)",
                          borderRadius: 10,
                          padding: "10px 14px",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        Share
                      </button>
                    )}
                  </div>
                </>
              )}
              {error && <p style={{ marginTop: 12, color: "#fda4af", fontSize: 13 }}>{error}</p>}
            </>
          ))}
          </section>
        </>
      )}

      <div style={{ paddingBottom: 32 }}>
        <div className="ad-slot ad-banner">Advertisement</div>
      </div>
    </div>
  );
}
