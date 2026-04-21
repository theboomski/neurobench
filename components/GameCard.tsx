"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { GameData } from "@/lib/types";
import { getClicks, recordClick } from "@/lib/gameUtils";

// Strip "Test" from titles, apply special cases
function displayTitle(game: GameData): string {
  if (game.id === "chimp-test") return "Beat the Monkey";
  return game.title.replace(/\s*Test$/i, "").replace(/\s*Test\s*/i, " ").trim();
}

export function SortedGrid({ games, category }: { games: GameData[]; category: GameData["category"] }) {
  const filtered = games.filter(g => g.category === category);
  const [sorted, setSorted] = useState(filtered);

  useEffect(() => {
    const withClicks = filtered.map(g => ({ g, c: getClicks(g.id) }));
    withClicks.sort((a, b) => b.c - a.c);
    setSorted(withClicks.map(x => x.g));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
      {sorted.map((g, i) => <GameCard key={g.id} game={g} rank={i} />)}
    </div>
  );
}

export function GameCard({ game, rank }: { game: GameData; rank?: number }) {
  const [clicks, setClicks] = useState(0);
  useEffect(() => { setClicks(getClicks(game.id)); }, [game.id]);

  return (
    <Link href={`/${game.category}/${game.id}`} style={{ textDecoration: "none", display: "block" }} onClick={() => recordClick(game.id)}>
      <div
        className="pressable"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: `3px solid ${game.accent}`, borderRadius: "var(--radius-lg)", padding: "24px 22px", height: "100%", position: "relative", transition: "background 0.2s, box-shadow 0.2s" }}
        onMouseEnter={e => { const d = e.currentTarget as HTMLDivElement; d.style.background = "var(--bg-elevated)"; d.style.boxShadow = `0 4px 32px ${game.accent}18`; }}
        onMouseLeave={e => { const d = e.currentTarget as HTMLDivElement; d.style.background = "var(--bg-card)"; d.style.boxShadow = "none"; }}
      >
        {rank === 0 && clicks > 0 && (
          <div style={{ position: "absolute", top: 14, right: 14, background: `${game.accent}15`, border: `1px solid ${game.accent}35`, color: game.accent, fontSize: 9, fontWeight: 700, fontFamily: "var(--font-mono)", padding: "2px 8px", borderRadius: 999, letterSpacing: "0.1em", textTransform: "uppercase" }}>MOST PLAYED</div>
        )}

        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginBottom: 14, background: `${game.accent}10`, border: `1px solid ${game.accent}25`, borderRadius: 999, padding: "3px 10px" }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: game.accent, display: "inline-block" }} />
          <span style={{ fontSize: 9, color: game.accent, fontFamily: "var(--font-mono)", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>{game.categoryLabel}</span>
        </div>

        <div style={{ fontSize: 36, marginBottom: 12 }}>{game.emoji}</div>
        <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>{game.clinicalTitle}</div>

        {/* Bigger title, no "Test" */}
        <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, letterSpacing: "-0.02em", color: "var(--text-1)", lineHeight: 1.2 }}>
          {displayTitle(game)}
        </h3>
        <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.65 }}>{game.shortDescription}</p>

        <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: game.accent, fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
            PLAY NOW →
          </span>
          {clicks > 0 && (
            <span style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{clicks.toLocaleString()} plays</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ComingSoonCard({ title, clinicalTitle, emoji, accent, category }: {
  title: string; clinicalTitle: string; emoji: string; accent: string; category: string;
}) {
  return (
    <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: `3px solid ${accent}40`, borderRadius: "var(--radius-lg)", padding: "24px 22px", opacity: 0.4 }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginBottom: 14, background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 999, padding: "3px 10px" }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--text-3)", display: "inline-block" }} />
        <span style={{ fontSize: 9, color: "var(--text-3)", fontFamily: "var(--font-mono)", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>{category}</span>
      </div>
      <div style={{ fontSize: 36, marginBottom: 12 }}>{emoji}</div>
      <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>{clinicalTitle}</div>
      <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: "var(--text-2)" }}>{title}</h3>
      <span style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Coming Soon</span>
    </div>
  );
}
