"use client";
import Link from "next/link";
import type { GameData } from "@/lib/types";

export function GameCard({ g, basePath }: { g: GameData; basePath: string }) {
  return (
    <Link href={`/${basePath}/${g.id}`} style={{ textDecoration: "none" }}>
      <div
        className="pressable"
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
        <div style={{ fontSize: 32, marginBottom: 10 }}>{g.emoji}</div>
        <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{g.clinicalTitle}</div>
        <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 6, letterSpacing: "-0.02em" }}>{g.title}</div>
        <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 14 }}>{g.shortDescription}</div>
        <span style={{ fontSize: 11, fontWeight: 700, color: g.accent, fontFamily: "var(--font-mono)" }}>PLAY NOW →</span>
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
        <div style={{ fontSize: 36, marginBottom: 14 }}>{emoji}</div>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, letterSpacing: "-0.02em" }}>{title}</div>
        <div style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.65, marginBottom: 16 }}>{desc}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: accent, fontFamily: "var(--font-mono)" }}>EXPLORE →</span>
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
    <Link href={`/${category}/${id}`} style={{ textDecoration: "none" }}>
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
        <div style={{ fontSize: 28, marginBottom: 10 }}>{emoji}</div>
        <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6, letterSpacing: "-0.02em" }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 12 }}>{desc}</div>
        <span style={{ fontSize: 11, fontWeight: 700, color: accent, fontFamily: "var(--font-mono)" }}>PLAY NOW →</span>
      </div>
    </Link>
  );
}
