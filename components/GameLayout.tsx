import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";

const t = dict.en;

export default function GameLayout({ game, children }: { game: GameData; children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px" }}>

      {/* Top Ad */}
      <div style={{ padding: "16px 0 0" }}>
        <div className="ad-slot ad-slot-banner">Advertisement</div>
      </div>

      {/* Game header */}
      <div style={{ padding: "36px 0 24px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
          <div style={{
            width: 56, height: 56, flexShrink: 0, borderRadius: 14,
            background: `${game.accent}18`, border: `1px solid ${game.accent}30`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
          }}>
            {game.emoji}
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
                textTransform: "uppercase", color: game.accent,
                background: `${game.accent}14`, padding: "2px 10px", borderRadius: 999,
              }}>{game.category}</span>
            </div>
            <h1 style={{ fontSize: "clamp(22px, 4vw, 34px)", fontWeight: 800, letterSpacing: "-0.025em", marginBottom: 6 }}>
              {game.title}
            </h1>
            <p style={{ fontSize: 15, color: "var(--text-2)", lineHeight: 1.6 }}>{game.description}</p>
          </div>
        </div>
      </div>

      {/* Game area */}
      <div style={{ paddingBottom: 48 }}>{children}</div>

      {/* SEO Content Block */}
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderTop: `3px solid ${game.accent}`,
        borderRadius: "var(--radius-lg)", padding: "40px 36px", marginBottom: 48,
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
          {t.game.howToPlayTitle} {game.title}
        </h2>
        <ol style={{ paddingLeft: 20, marginBottom: 36 }}>
          {game.content.howToPlay.map((s, i) => (
            <li key={i} style={{ color: "var(--text-2)", lineHeight: 1.85, marginBottom: 6, paddingLeft: 4, fontSize: 15 }}>{s}</li>
          ))}
        </ol>

        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>{t.game.scienceTitle}</h2>
        <p style={{ color: "var(--text-2)", lineHeight: 1.85, fontSize: 15, marginBottom: 36 }}>{game.content.science}</p>

        <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 12 }}>{t.game.tipsTitle}</h3>
        <ul style={{ paddingLeft: 20 }}>
          {game.content.tips.map((tip, i) => (
            <li key={i} style={{ color: "var(--text-2)", lineHeight: 1.85, marginBottom: 6, paddingLeft: 4, fontSize: 15 }}>{tip}</li>
          ))}
        </ul>
      </div>

      {/* Bottom Ad */}
      <div style={{ paddingBottom: 32 }}>
        <div className="ad-slot ad-slot-banner">Advertisement</div>
      </div>
    </div>
  );
}
