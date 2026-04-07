"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { GameData } from "@/lib/types";
import { getGameClicks, recordGameClick } from "@/lib/gameUtils";

// ── Sorted Game Grid ─────────────────────────────────────────────────────────
// 클라이언트에서 localStorage 클릭수 기준으로 정렬
// 첫 방문자 / SSR은 기본 순서 유지 (hydration safe)

export function SortedGameGrid({ games }: { games: GameData[] }) {
  const [sorted, setSorted] = useState<GameData[]>(games);

  useEffect(() => {
    const withClicks = games.map(g => ({ game: g, clicks: getGameClicks(g.id) }));
    // 클릭수 많은 순 → 동점이면 원래 순서 유지 (stable sort)
    withClicks.sort((a, b) => b.clicks - a.clicks);
    setSorted(withClicks.map(x => x.game));
  }, [games]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
      {sorted.map((g, i) => <GameCard key={g.id} game={g} rank={i} />)}
    </div>
  );
}

// ── Single Game Card ─────────────────────────────────────────────────────────

export function GameCard({ game, rank }: { game: GameData; rank?: number }) {
  const [clicks, setClicks] = useState(0);

  useEffect(() => {
    setClicks(getGameClicks(game.id));
  }, [game.id]);

  const handleClick = () => {
    recordGameClick(game.id);
  };

  return (
    <Link href={`/games/${game.id}`} style={{ textDecoration: "none", display: "block" }} onClick={handleClick}>
      <div
        style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderTop: `3px solid ${game.accent}`, borderRadius: "var(--radius-lg)",
          padding: "28px 24px 24px", cursor: "pointer",
          transition: "transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease",
          height: "100%", position: "relative",
        }}
        onMouseEnter={e => {
          const d = e.currentTarget as HTMLDivElement;
          d.style.transform = "scale(1.03)";
          d.style.boxShadow = `0 8px 40px ${game.accent}28`;
          d.style.background = "var(--bg-elevated)";
        }}
        onMouseLeave={e => {
          const d = e.currentTarget as HTMLDivElement;
          d.style.transform = "scale(1)";
          d.style.boxShadow = "none";
          d.style.background = "var(--bg-card)";
        }}
      >
        {/* #1 popular badge */}
        {rank === 0 && clicks > 0 && (
          <div style={{
            position: "absolute", top: 14, right: 14,
            background: `${game.accent}20`, border: `1px solid ${game.accent}50`,
            color: game.accent, fontSize: 10, fontWeight: 700,
            padding: "2px 8px", borderRadius: 999,
            letterSpacing: "0.08em", textTransform: "uppercase",
          }}>
            🔥 Popular
          </div>
        )}

        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: `${game.accent}18`, border: `1px solid ${game.accent}30`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 26, marginBottom: 18,
        }}>
          {game.emoji}
        </div>

        <div style={{
          display: "inline-block", fontSize: 10, fontWeight: 700,
          letterSpacing: "0.1em", textTransform: "uppercase",
          color: game.accent, background: `${game.accent}14`,
          padding: "2px 10px", borderRadius: 999, marginBottom: 10,
        }}>
          {game.category}
        </div>

        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, letterSpacing: "-0.01em" }}>
          {game.title}
        </h3>
        <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.6 }}>
          {game.shortDescription}
        </p>

        <div style={{ marginTop: 22, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: game.accent }}>Play Now →</span>
          {clicks > 0 && (
            <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "monospace" }}>
              {clicks.toLocaleString()} plays
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Coming Soon Card ─────────────────────────────────────────────────────────

export function ComingSoonCard({ title, emoji, accent, category }: {
  title: string; emoji: string; accent: string; category: string;
}) {
  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderTop: `3px solid ${accent}50`, borderRadius: "var(--radius-lg)",
      padding: "28px 24px 24px", opacity: 0.45,
    }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: `${accent}10`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, marginBottom: 18 }}>
        {emoji}
      </div>
      <div style={{ display: "inline-block", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-3)", background: "var(--bg-elevated)", padding: "2px 10px", borderRadius: 999, marginBottom: 10 }}>
        {category}
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: "var(--text-2)" }}>{title}</h3>
      <p style={{ fontSize: 14, color: "var(--text-3)" }}>Coming soon</p>
    </div>
  );
}
