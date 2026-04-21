import Link from "next/link";
import type { GameData } from "@/lib/types";
import { ALL_GAMES } from "@/lib/games";

const allGames = ALL_GAMES;

const CATEGORY_LABELS: Record<string, string> = {
  "brain-age": "Brain Age Test",
  "office-iq": "Office IQ Test",
  "korean-tv": "Korean TV Shows",
  "focus-test": "Focus & Attention",
  "dark-personality": "Dark Personality",
  "word-iq": "Vocab & Word IQ",
  "relationship": "Relationship IQ",
  "money": "Money IQ",
};

export default function RelatedTests({ game }: { game: GameData }) {
  const related = allGames
    .filter(g => g.category === game.category && g.id !== game.id)
    .slice(0, 3);

  if (related.length === 0) return null;

  const categoryPath = game.category;
  const categoryLabel = CATEGORY_LABELS[game.category] ?? game.categoryLabel;

  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>
        <span style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>MORE</span>
        <h2 style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>
          More {categoryLabel} Tests
        </h2>
        <Link href={`/${categoryPath}`} style={{ marginLeft: "auto", fontSize: 11, color: game.accent, fontFamily: "var(--font-mono)", textDecoration: "none", fontWeight: 700 }}>
          SEE ALL →
        </Link>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
        {related.map(g => (
          <Link key={g.id} href={`/${g.category}/${g.id}`} style={{ textDecoration: "none" }}>
            <div style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderLeft: `3px solid ${g.accent}`,
              borderRadius: "var(--radius-lg)",
              padding: "16px 14px",
              transition: "background 0.2s",
            }}>
              <div style={{ fontSize: 26, marginBottom: 8 }}>{g.emoji}</div>
              <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4, letterSpacing: "-0.01em", color: "var(--text-1)" }}>{g.title}</div>
              <div style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 10 }}>{g.shortDescription}</div>
              <span style={{ fontSize: 10, fontWeight: 700, color: g.accent, fontFamily: "var(--font-mono)" }}>PLAY →</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
