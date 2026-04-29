"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ISO_LANGUAGE_OPTIONS } from "@/lib/isoLanguages";
import { getSupabaseBrowser } from "@/lib/supabase";
import { toUgcPath } from "@/lib/ugc";

type HubGame = {
  id: string;
  type: "brackets" | "balance";
  title: string;
  description?: string | null;
  cover_image_url: string | null;
  /** First bracket contender image when no quiz thumbnail (server-filled). */
  bracket_preview_image_url?: string | null;
  /** First balance `option_a` when there is no quiz thumbnail (server-filled). */
  balance_preview_label?: string | null;
  play_count: number;
  language: string;
  slug: string;
  category: { name: string } | null;
  creator: { display_name: string | null; avatar_url: string | null } | null;
};

const MUSTARD = "#b8860b";
const ISO_NAME_BY_CODE = new Map(ISO_LANGUAGE_OPTIONS.map((x) => [x.code, x.name]));
const PAGE_SIZE = 16;

function trimUrl(u: string | null | undefined) {
  const t = String(u ?? "").trim();
  return t.length ? t : null;
}

function normalizeBracketCover(u: string | null | undefined) {
  const t = trimUrl(u);
  if (!t) return null;
  const lower = t.toLowerCase();
  return lower === "null" || lower === "undefined" || lower.startsWith("blob:") ? null : t;
}

type BracketHubClientProps = {
  initialGames?: HubGame[];
  initialCategories?: Array<{ id: number; name: string }>;
  initialLanguages?: Array<{ code: string; count: number }>;
};

export default function BracketHubClient({
  initialGames = [],
  initialCategories = [],
  initialLanguages = [],
}: BracketHubClientProps) {
  const router = useRouter();
  const supabase = getSupabaseBrowser();
  const [games, setGames] = useState<HubGame[]>(initialGames);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(initialGames.length);
  const [hasMore, setHasMore] = useState(initialGames.length === PAGE_SIZE);
  const [sort, setSort] = useState<"popular" | "latest">("latest");
  const [includeNsfw, setIncludeNsfw] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>(initialCategories);
  const [languages, setLanguages] = useState<Array<{ code: string; count: number }>>(initialLanguages);
  const [sortOpen, setSortOpen] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement | null>(null);
  const categoryRef = useRef<HTMLDivElement | null>(null);
  const languageRef = useRef<HTMLDivElement | null>(null);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const requestIdRef = useRef(0);

  const fetchFeed = async (sp: URLSearchParams) => {
    const headers: HeadersInit = {};
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(`/api/ugc/feed?${sp.toString()}`, { cache: "no-store", headers });
    return res.json();
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const res = await fetch("/api/ugc/filters", { cache: "no-store" });
      const json = await res.json();
      if (cancelled) return;
      setCategories((json.categories ?? []).map((c: { id: number; name: string }) => ({ id: c.id, name: c.name })));
      setLanguages(json.languages ?? []);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const requestId = ++requestIdRef.current;
    const run = async () => {
      setLoading(true);
      const sp = new URLSearchParams({
        sort,
        includeNsfw: includeNsfw ? "1" : "0",
        limit: String(PAGE_SIZE),
        offset: "0",
      });
      if (categoryFilter !== "all") sp.set("category", categoryFilter);
      if (languageFilter !== "all") sp.set("language", languageFilter);
      const json = await fetchFeed(sp);
      if (cancelled || requestId !== requestIdRef.current) return;
      const nextGames = (json.games ?? []) as HubGame[];
      setGames(nextGames);
      setOffset(Number(json.nextOffset ?? nextGames.length));
      setHasMore(Boolean(json.hasMore));
      setLoading(false);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [sort, includeNsfw, categoryFilter, languageFilter]);

  useEffect(() => {
    const node = loaderRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        if (loading || loadingMore || !hasMore) return;
        setLoadingMore(true);
        const currentRequestId = requestIdRef.current;
        const run = async () => {
          const sp = new URLSearchParams({
            sort,
            includeNsfw: includeNsfw ? "1" : "0",
            limit: String(PAGE_SIZE),
            offset: String(offset),
          });
          if (categoryFilter !== "all") sp.set("category", categoryFilter);
          if (languageFilter !== "all") sp.set("language", languageFilter);
          const json = await fetchFeed(sp);
          if (currentRequestId !== requestIdRef.current) {
            setLoadingMore(false);
            return;
          }
          const nextGames = (json.games ?? []) as HubGame[];
          setGames((prev) => [...prev, ...nextGames]);
          setOffset(Number(json.nextOffset ?? offset + nextGames.length));
          setHasMore(Boolean(json.hasMore));
          setLoadingMore(false);
        };
        void run();
      },
      { rootMargin: "240px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [sort, includeNsfw, categoryFilter, languageFilter, offset, hasMore, loading, loadingMore]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (sortRef.current?.contains(target) || categoryRef.current?.contains(target) || languageRef.current?.contains(target)) return;
      setSortOpen(false);
      setCategoryOpen(false);
      setLanguageOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 16px 56px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.02em", color: MUSTARD }}>Bracket</h1>
          <p style={{ fontSize: 13, color: "var(--text-2)" }}>Choose Your Favorite</p>
        </div>
        <Link href="/ugc/create" style={{ textDecoration: "none", fontSize: 12, fontWeight: 900, background: MUSTARD, color: "#251a00", padding: "10px 12px", borderRadius: 10 }}>
          CREATE GAME
        </Link>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div ref={sortRef} style={{ position: "relative" }}>
          <button
            onClick={() => {
              setSortOpen((v) => !v);
              setCategoryOpen(false);
              setLanguageOpen(false);
            }}
            style={{ fontSize: 11, border: `1px solid ${MUSTARD}`, color: MUSTARD, borderRadius: 999, padding: "6px 10px", background: "transparent", whiteSpace: "nowrap", cursor: "pointer" }}
          >
            {sort === "popular" ? "Popular" : "Latest"} {sortOpen ? "▲" : "▼"}
          </button>
          {sortOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 20, minWidth: 140, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: 6, display: "grid", gap: 4 }}>
              <button onClick={() => { setSort("popular"); setSortOpen(false); }} style={{ fontSize: 11, border: "1px solid var(--border)", color: sort === "popular" ? MUSTARD : "var(--text-1)", borderRadius: 8, padding: "6px 8px", background: sort === "popular" ? "rgba(184,134,11,0.22)" : "var(--bg-elevated)", textAlign: "left", cursor: "pointer" }}>
                Popular
              </button>
              <button onClick={() => { setSort("latest"); setSortOpen(false); }} style={{ fontSize: 11, border: "1px solid var(--border)", color: sort === "latest" ? MUSTARD : "var(--text-1)", borderRadius: 8, padding: "6px 8px", background: sort === "latest" ? "rgba(184,134,11,0.22)" : "var(--bg-elevated)", textAlign: "left", cursor: "pointer" }}>
                Latest
              </button>
            </div>
          )}
        </div>
        <button
          onClick={() => setIncludeNsfw((v) => !v)}
          style={{ fontSize: 11, border: `1px solid ${MUSTARD}`, color: MUSTARD, borderRadius: 999, padding: "6px 10px", background: includeNsfw ? "rgba(184,134,11,0.22)" : "transparent", cursor: "pointer" }}
        >
          NSFW: {includeNsfw ? "On" : "Off"}
        </button>
        <div ref={categoryRef} style={{ position: "relative" }}>
          <button
            onClick={() => {
              setCategoryOpen((v) => !v);
              setLanguageOpen(false);
            }}
            style={{ fontSize: 11, border: `1px solid ${MUSTARD}`, color: MUSTARD, borderRadius: 999, padding: "6px 10px", background: "transparent", whiteSpace: "nowrap", cursor: "pointer" }}
          >
            {categoryFilter === "all" ? "Category" : categories.find((c) => String(c.id) === categoryFilter)?.name ?? "Category"} {categoryOpen ? "▲" : "▼"}
          </button>
          {categoryOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 20, minWidth: 190, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: 6, display: "grid", gap: 4 }}>
              <button onClick={() => { setCategoryFilter("all"); setCategoryOpen(false); }} style={{ fontSize: 11, border: "1px solid var(--border)", color: categoryFilter === "all" ? MUSTARD : "var(--text-1)", borderRadius: 8, padding: "6px 8px", background: categoryFilter === "all" ? "rgba(184,134,11,0.22)" : "var(--bg-elevated)", textAlign: "left", cursor: "pointer" }}>
                All categories
              </button>
              {categories.map((cat) => (
                <button key={cat.id} onClick={() => { setCategoryFilter(String(cat.id)); setCategoryOpen(false); }} style={{ fontSize: 11, border: "1px solid var(--border)", color: categoryFilter === String(cat.id) ? MUSTARD : "var(--text-1)", borderRadius: 8, padding: "6px 8px", background: categoryFilter === String(cat.id) ? "rgba(184,134,11,0.22)" : "var(--bg-elevated)", textAlign: "left", cursor: "pointer" }}>
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div ref={languageRef} style={{ position: "relative" }}>
          <button
            onClick={() => {
              setLanguageOpen((v) => !v);
              setCategoryOpen(false);
            }}
            style={{ fontSize: 11, border: `1px solid ${MUSTARD}`, color: MUSTARD, borderRadius: 999, padding: "6px 10px", background: "transparent", whiteSpace: "nowrap", cursor: "pointer" }}
          >
            {languageFilter === "all" ? "Language" : (ISO_NAME_BY_CODE.get(languageFilter) ?? languageFilter.toUpperCase())} {languageOpen ? "▲" : "▼"}
          </button>
          {languageOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 20, minWidth: 190, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10, padding: 6, display: "grid", gap: 4 }}>
              <button onClick={() => { setLanguageFilter("all"); setLanguageOpen(false); }} style={{ fontSize: 11, border: "1px solid var(--border)", color: languageFilter === "all" ? MUSTARD : "var(--text-1)", borderRadius: 8, padding: "6px 8px", background: languageFilter === "all" ? "rgba(184,134,11,0.22)" : "var(--bg-elevated)", textAlign: "left", cursor: "pointer" }}>
                All languages
              </button>
              {languages.map((lang) => (
                <button key={lang.code} onClick={() => { setLanguageFilter(lang.code); setLanguageOpen(false); }} style={{ fontSize: 11, border: "1px solid var(--border)", color: languageFilter === lang.code ? MUSTARD : "var(--text-1)", borderRadius: 8, padding: "6px 8px", background: languageFilter === lang.code ? "rgba(184,134,11,0.22)" : "var(--bg-elevated)", textAlign: "left", cursor: "pointer" }}>
                  {(ISO_NAME_BY_CODE.get(lang.code) ?? lang.code.toUpperCase())} ({lang.count})
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading && <p style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 8 }}>Updating games...</p>}
      {!loading && games.length === 0 && <p style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 8 }}>No bracket games yet.</p>}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
        {games.map((game) => {
          const userCover = trimUrl(game.cover_image_url);
          const heroImage =
            game.type === "brackets"
              ? normalizeBracketCover(game.cover_image_url) ?? normalizeBracketCover(game.bracket_preview_image_url)
              : userCover;
          const balanceTextFallback = !userCover && game.type === "balance" && game.balance_preview_label;
          return (
          <Link
            key={game.id}
            href={toUgcPath(game)}
            prefetch
            onMouseEnter={() => router.prefetch(toUgcPath(game))}
            onTouchStart={() => router.prefetch(toUgcPath(game))}
            style={{ textDecoration: "none" }}
          >
            <article
              style={{
                position: "relative",
                borderRadius: 12,
                border: "none",
                overflow: "hidden",
                aspectRatio: "4 / 3",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                background: heroImage
                  ? `linear-gradient(180deg, rgba(0,0,0,.12), rgba(0,0,0,.82)), url(${heroImage}) center/cover`
                  : game.type === "balance"
                    ? "#000"
                    : "linear-gradient(160deg, #2b220f, #171107)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", padding: 8 }}>
                <span style={{ fontSize: 10, color: "#f6deb0", fontFamily: "var(--font-mono)", background: "rgba(41,30,12,0.8)", border: game.type === "balance" ? "1px solid #000" : `1px solid ${MUSTARD}`, padding: "3px 6px", borderRadius: 999 }}>
                  {game.type === "brackets" ? "BRACKET" : "BALANCE GAME"}
                </span>
                <span style={{ fontSize: 10, color: "#f6deb0", fontFamily: "var(--font-mono)", background: "rgba(41,30,12,0.8)", border: game.type === "balance" ? "1px solid #000" : `1px solid ${MUSTARD}`, padding: "3px 6px", borderRadius: 999 }}>▶ {game.play_count}</span>
              </div>
              {balanceTextFallback ? (
                <div
                  style={{
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "4px 12px 2px",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#fff",
                      textAlign: "center",
                      lineHeight: 1.35,
                      display: "-webkit-box",
                      WebkitLineClamp: 4,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      wordBreak: "break-word",
                    }}
                  >
                    {game.balance_preview_label}
                  </p>
                </div>
              ) : (
                <div style={{ flex: 1, minHeight: 0 }} />
              )}
              <div style={{ padding: 10, background: "linear-gradient(180deg, transparent, rgba(0,0,0,.92))" }}>
                <div style={{ fontSize: 10, color: "#f2d08a", fontFamily: "var(--font-mono)" }}>{game.category?.name ?? "Uncategorized"} · {game.language?.toUpperCase?.() ?? "EN"}</div>
                <h3 style={{ marginTop: 3, fontSize: 15, fontWeight: 800, color: "#fff", lineHeight: 1.2 }}>{game.title}</h3>
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "#e7d9b8" }}>
                  {game.creator?.avatar_url ? (
                    <img src={game.creator.avatar_url} alt={game.creator?.display_name ?? "Creator avatar"} loading="lazy" decoding="async" style={{ width: 18, height: 18, borderRadius: "999px", objectFit: "cover", border: "1px solid rgba(255,255,255,0.22)" }} />
                  ) : (
                    <span style={{ width: 18, height: 18, borderRadius: "999px", border: "1px solid rgba(255,255,255,0.22)", display: "grid", placeItems: "center", fontSize: 10 }}>👤</span>
                  )}
                  <span>by {game.creator?.display_name ?? "Anonymous"}</span>
                </div>
              </div>
            </article>
          </Link>
          );
        })}
      </div>
      {hasMore && (
        <div ref={loaderRef} style={{ marginTop: 12, minHeight: 24, display: "grid", placeItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{loadingMore ? "Loading more..." : "Scroll for more"}</span>
        </div>
      )}
    </div>
  );
}
