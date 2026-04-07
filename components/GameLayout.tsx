import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";

const t = dict.en;

export default function GameLayout({ game, children }: { game: GameData; children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px" }}>

      {/* Top Ad */}
      <div style={{ padding: "16px 0 0" }}>
        <div className="ad-slot ad-banner">Advertisement</div>
      </div>

      {/* Header */}
      <div style={{ padding: "32px 0 24px" }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", marginBottom: 16, textTransform: "uppercase" }}>
          NeuroBench / {game.categoryLabel} / {game.clinicalTitle}
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div style={{
            width: 56, height: 56, flexShrink: 0, borderRadius: 12,
            background: `${game.accent}12`, border: `1px solid ${game.accent}25`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
          }}>{game.emoji}</div>

          <div style={{ flex: 1 }}>
            {/* Category */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginBottom: 8, background: `${game.accent}10`, border: `1px solid ${game.accent}25`, borderRadius: 999, padding: "3px 10px" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: game.accent, display: "inline-block" }} />
              <span style={{ fontSize: 9, color: game.accent, fontFamily: "var(--font-mono)", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>{game.categoryLabel}</span>
            </div>

            {/* Clinical title */}
            <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
              {game.clinicalTitle}
            </div>

            <h1 style={{ fontSize: "clamp(22px, 4vw, 32px)", fontWeight: 900, letterSpacing: "-0.025em", marginBottom: 6 }}>{game.title}</h1>
            <p style={{ fontSize: 14, color: "var(--text-2)", lineHeight: 1.65 }}>{game.description}</p>
          </div>
        </div>
      </div>

      {/* Game */}
      <div style={{ paddingBottom: 48 }}>{children}</div>

      {/* SEO Content Block */}
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderLeft: `3px solid ${game.accent}`,
        borderRadius: "var(--radius-lg)", padding: "36px 32px", marginBottom: 48,
      }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: game.accent, fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase" }}>01 /</span>
          {t.game.howToPlay}
        </h2>
        <ol style={{ paddingLeft: 20, marginBottom: 36 }}>
          {game.content.howToPlay.map((s, i) => (
            <li key={i} style={{ color: "var(--text-2)", lineHeight: 1.85, marginBottom: 6, fontSize: 14, paddingLeft: 4 }}>{s}</li>
          ))}
        </ol>

        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: game.accent, fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase" }}>02 /</span>
          {t.game.scienceTitle}
        </h2>
        <p style={{ color: "var(--text-2)", lineHeight: 1.85, fontSize: 14, marginBottom: 36 }}>{game.content.science}</p>

        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: game.accent, fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase" }}>03 /</span>
          {t.game.tipsTitle}
        </h3>
        <ul style={{ paddingLeft: 20 }}>
          {game.content.tips.map((tip, i) => (
            <li key={i} style={{ color: "var(--text-2)", lineHeight: 1.85, marginBottom: 6, fontSize: 14, paddingLeft: 4 }}>{tip}</li>
          ))}
        </ul>
      </div>

      {/* Bottom Ad */}
      <div style={{ paddingBottom: 32 }}>
        <div className="ad-slot ad-banner">Advertisement</div>
      </div>
    </div>
  );
}
