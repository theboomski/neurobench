"use client";

import { getBrainAge, generateReportCard } from "@/lib/gameUtils";
import { dict } from "@/lib/i18n";
import type { GameData } from "@/lib/types";
import InterstitialAd from "@/components/InterstitialAd";
import { useState } from "react";

const t = dict.en;

interface Props {
  game: GameData;
  score: number;
  unit: string;
  rank: { label: string; color: string; title: string; subtitle: string; percentileLabel: string };
  percentile: number;
  highScore: number | null;
  isNewBest: boolean;
  extraStats?: React.ReactNode;
  onRetry: () => void;
}

export default function GameResult({ game, score, unit, rank, percentile, highScore, isNewBest, extraStats, onRetry }: Props) {
  const [showAd, setShowAd] = useState(false);
  const [shareImg, setShareImg] = useState<string | null>(null);
  const brainAge = getBrainAge(rank.label);

  const afterAd = () => { setShowAd(false); onRetry(); };

  const handleShare = async () => {
    const url = generateReportCard({
      gameTitle: game.title, clinicalTitle: game.clinicalTitle,
      score, unit, rankLabel: rank.label, rankTitle: rank.title,
      rankSubtitle: rank.subtitle, rankColor: rank.color,
      percentile, accent: game.accent, siteUrl: t.site.url,
    });
    setShareImg(url);
    if (navigator.share) {
      try {
        const blob = await (await fetch(url)).blob();
        await navigator.share({
          title: "My Brain Age on ZAZAZA",
          text: `My Brain Age is ${brainAge.age}! 🧠 Can you beat me? ${t.site.url}`,
          files: [new File([blob], "brain-age.png", { type: "image/png" })],
        });
        return;
      } catch { /* fallback */ }
    }
    window.open(url, "_blank");
  };

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div className="anim-scale-in" style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", borderTop: `2px solid ${rank.color}`, borderRadius: "var(--radius-xl)", padding: "clamp(28px,5vw,48px) clamp(20px,4vw,40px)", textAlign: "center" }}>

        {/* Brain Age — hero result */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>
            Your Brain Age
          </div>
          <div style={{ fontSize: "clamp(72px,18vw,110px)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, color: rank.color, textShadow: `0 0 60px ${rank.color}40` }}>
            {brainAge.age}
          </div>
          <div style={{ fontSize: 14, color: rank.color, fontWeight: 700, marginTop: 4 }}>{brainAge.label}</div>
        </div>

        {/* Rank badge */}
        <div style={{ width: 80, height: 80, borderRadius: "50%", background: `${rank.color}12`, border: `2px solid ${rank.color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: `0 0 40px ${rank.color}20` }}>
          <span style={{ fontSize: 36, fontWeight: 900, color: rank.color, lineHeight: 1 }}>{rank.label}</span>
          <span style={{ fontSize: 8, color: rank.color, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 1, fontFamily: "var(--font-mono)" }}>{rank.percentileLabel}</span>
        </div>

        {/* Score */}
        <div style={{ fontSize: "clamp(28px,7vw,42px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 4 }}>
          {score}<span style={{ fontSize: "clamp(13px,2.5vw,18px)", fontWeight: 400, color: "var(--text-3)", marginLeft: 5, fontFamily: "var(--font-mono)" }}>{unit}</span>
        </div>

        <div style={{ fontSize: 12, color: game.accent, fontWeight: 700, marginBottom: 6, fontFamily: "var(--font-mono)" }}>TOP {100 - percentile}% GLOBALLY</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: rank.color, marginBottom: 4 }}>{rank.title}</div>
        <div style={{ fontSize: 12, color: "var(--text-2)", fontStyle: "italic", marginBottom: 16 }}>&quot;{rank.subtitle}&quot;</div>

        {extraStats}

        {isNewBest && (
          <div style={{ display: "inline-block", background: `${game.accent}12`, border: `1px solid ${game.accent}30`, color: game.accent, fontSize: 11, fontWeight: 700, padding: "3px 14px", borderRadius: 999, marginBottom: 12, fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>◆ New Personal Record</div>
        )}
        {highScore !== null && !isNewBest && (
          <div style={{ fontSize: 11, color: "var(--text-3)", marginBottom: 12, fontFamily: "var(--font-mono)" }}>
            Personal best: <span style={{ color: game.accent }}>{highScore} {unit}</span>
          </div>
        )}

        {/* Rank pills */}
        <div style={{ display: "flex", gap: 5, justifyContent: "center", flexWrap: "wrap", margin: "12px 0 20px" }}>
          {game.stats.ranks.map(r => (
            <div key={r.label} style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 800, fontFamily: "var(--font-mono)", background: r.label === rank.label ? `${r.color}18` : "var(--bg-elevated)", color: r.label === rank.label ? r.color : "var(--text-3)", border: `1px solid ${r.label === rank.label ? r.color + "40" : "transparent"}` }}>
              {r.label} · {getBrainAge(r.label).age}
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => setShowAd(true)} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 800, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)" }}>
            ▶ PLAY AGAIN
          </button>
          <button onClick={handleShare} className="pressable" style={{ background: "var(--bg-elevated)", color: "var(--text-1)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 700, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)" }}>
            ↗ SHARE
          </button>
        </div>

        {shareImg && (
          <div style={{ marginTop: 24 }}>
            <img src={shareImg} alt="Brain Age Report" style={{ maxWidth: "100%", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }} />
            <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 8, fontFamily: "var(--font-mono)" }}>Long-press (mobile) · Right-click (desktop) to save</p>
          </div>
        )}
      </div>
    </>
  );
}
