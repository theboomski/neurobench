"use client";
import Link from "next/link";
import { trackEvent } from "@/lib/analytics";
import type { GameData } from "@/lib/types";

export function GameCard({ g, basePath }: { g: GameData; basePath: string }) {
  return (
    <Link href={`/${basePath}/${g.id}`} style={{ textDecoration: "none" }} className="block h-full" onClick={() => trackEvent("category_card_click", { game_id: g.id, category: g.category })}>
      <div
        className="pressable category-game-card"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderLeft: `3px solid ${g.accent}`,
          borderRadius: "var(--radius-lg)",
          padding: "22px 18px",
          height: "100%",
          cursor: "pointer",
          transition: "background 0.2s, box-shadow 0.2s",
        }}
        onMouseEnter={e => {
          const d = e.currentTarget as HTMLDivElement;
          d.style.background = "var(--bg-elevated)";
          d.style.boxShadow = `0 4px 24px ${g.accent}18`;
        }}
        onMouseLeave={e => {
          const d = e.currentTarget as HTMLDivElement;
          d.style.background = "var(--bg-card)";
          d.style.boxShadow = "none";
        }}
      >
        <div className="text-2xl sm:text-[32px] mb-2 sm:mb-[10px]">{g.emoji}</div>
        <div className="text-[14px] sm:text-[17px] font-extrabold mb-1.5 tracking-[-0.02em] leading-tight">{g.title}</div>
        <div className="text-[11px] sm:text-[12px] text-[var(--text-2)] leading-[1.45] sm:leading-[1.6] mb-3 sm:mb-[14px]">{g.shortDescription}</div>
        <span className="text-[10px] sm:text-[11px] font-bold font-mono" style={{ color: g.accent }}>PLAY NOW →</span>
      </div>
    </Link>
  );
}

export function CategoryCard({ slug, emoji, title, desc, accent, count }: {
  slug: string; emoji: string; title: string; desc: string; accent: string; count: number;
}) {
  return (
    <Link href={`/${slug}`} style={{ textDecoration: "none" }}>
      <div
        className="pressable"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderTop: `2px solid ${accent}`,
          borderRadius: "var(--radius-lg)",
          padding: "24px 20px",
          cursor: "pointer",
          transition: "background 0.2s, box-shadow 0.2s",
        }}
        onMouseEnter={e => {
          const d = e.currentTarget as HTMLDivElement;
          d.style.background = "var(--bg-elevated)";
          d.style.boxShadow = `0 4px 32px ${accent}18`;
        }}
        onMouseLeave={e => {
          const d = e.currentTarget as HTMLDivElement;
          d.style.background = "var(--bg-card)";
          d.style.boxShadow = "none";
        }}
      >
        <div className="text-[28px] sm:text-[36px] mb-2.5 sm:mb-[14px]">{emoji}</div>
        <div className="text-[14px] sm:text-[18px] font-extrabold mb-1.5 sm:mb-2 tracking-[-0.02em] leading-tight">{title}</div>
        <div className="text-[11px] sm:text-[13px] text-[var(--text-2)] leading-[1.5] sm:leading-[1.65] mb-3 sm:mb-4">{desc}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="text-[10px] sm:text-[11px] font-bold font-mono" style={{ color: accent }}>EXPLORE →</span>
          <span style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{count} tests</span>
        </div>
      </div>
    </Link>
  );
}

export function TrendingCard({ id, category, emoji, title, desc, accent }: {
  id: string; category: string; emoji: string; title: string; desc: string; accent: string;
}) {
  return (
    <Link href={`/${category}/${id}`} style={{ textDecoration: "none" }} onClick={() => trackEvent("trending_click", { game_id: id, category })}>
      <div
        className="pressable"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderLeft: `3px solid ${accent}`,
          borderRadius: "var(--radius-lg)",
          padding: "20px 18px",
          cursor: "pointer",
          transition: "background 0.2s",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = "var(--bg-elevated)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = "var(--bg-card)"; }}
      >
        <div className="text-[24px] sm:text-[28px] mb-2 sm:mb-[10px]">{emoji}</div>
        <div className="text-[14px] sm:text-[16px] font-extrabold mb-1.5 sm:mb-[6px] tracking-[-0.02em] leading-tight">{title}</div>
        <div className="text-[11px] sm:text-[12px] text-[var(--text-2)] leading-[1.45] sm:leading-[1.6] mb-2.5 sm:mb-3">{desc}</div>
        <span className="text-[10px] sm:text-[11px] font-bold font-mono" style={{ color: accent }}>PLAY NOW →</span>
      </div>
    </Link>
  );
}
