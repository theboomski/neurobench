"use client";

import { useState, useCallback, useEffect } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { getHighScore, saveHighScore, generateReportCard, playBeep } from "@/lib/gameUtils";
import InterstitialAd from "@/components/InterstitialAd";

const t = dict.en;

function getRank(score: number, game: GameData) {
  const ranks = [...game.stats.ranks].reverse();
  return ranks.find(r => score >= r.maxMs) ?? game.stats.ranks[game.stats.ranks.length - 1];
}
function getPercentile(score: number, game: GameData): number {
  const pts = game.stats.percentiles;
  if (score >= pts[0].ms) return pts[0].percentile;
  if (score <= pts[pts.length - 1].ms) return pts[pts.length - 1].percentile;
  for (let i = 0; i < pts.length - 1; i++) {
    if (score <= pts[i].ms && score >= pts[i + 1].ms) {
      const t2 = (pts[i].ms - score) / (pts[i].ms - pts[i + 1].ms);
      return Math.round(pts[i].percentile - t2 * (pts[i].percentile - pts[i + 1].percentile));
    }
  }
  return 50;
}

const COLORS = [
  { name: "RED",    hex: "#EF4444" },
  { name: "GREEN",  hex: "#22C55E" },
  { name: "BLUE",   hex: "#3B82F6" },
  { name: "YELLOW", hex: "#EAB308" },
  { name: "PURPLE", hex: "#A855F7" },
  { name: "ORANGE", hex: "#F97316" },
];

function randomPair() {
  const word  = COLORS[Math.floor(Math.random() * COLORS.length)];
  let ink = COLORS[Math.floor(Math.random() * COLORS.length)];
  while (ink.name === word.name) ink = COLORS[Math.floor(Math.random() * COLORS.length)];
  // Shuffle button order
  const buttons = [...COLORS].sort(() => Math.random() - 0.5).slice(0, 4);
  if (!buttons.find(b => b.name === ink.name)) buttons[0] = ink;
  return { word, ink, buttons: buttons.sort(() => Math.random() - 0.5) };
}

type Phase = "idle" | "playing" | "done";

export default function ColorConflict({ game }: { game: GameData }) {
  const [phase, setPhase]       = useState<Phase>("idle");
  const [score, setScore]       = useState(0);
  const [pair, setPair]         = useState(randomPair());
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [showAd, setShowAd]     = useState(false);
  const [shareImg, setShareImg] = useState<string | null>(null);
  const [highScore, setHS]      = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => { setHS(getHighScore(game.id)); }, [game.id]);

  const startGame = () => { setPair(randomPair()); setScore(0); setFeedback(null); setPhase("playing"); };

  const handleAnswer = useCallback((colorName: string) => {
    if (phase !== "playing") return;
    const correct = colorName === pair.ink.name;
    if (correct) {
      playBeep("success");
      setFeedback("correct");
      const newScore = score + 1;
      setScore(newScore);
      setTimeout(() => { setPair(randomPair()); setFeedback(null); }, 250);
    } else {
      playBeep("fail");
      setFeedback("wrong");
      const isNew = saveHighScore(game.id, score);
      setIsNewBest(isNew);
      if (isNew) setHS(score);
      setFinalScore(score);
      setTimeout(() => setPhase("done"), 600);
    }
  }, [phase, pair, score, game.id]);

  const handleRetry = () => setShowAd(true);
  const afterAd = () => { setShowAd(false); setPhase("idle"); setShareImg(null); setIsNewBest(false); };

  const rank = finalScore > 0 ? getRank(finalScore, game) : getRank(0, game);
  const pct  = finalScore > 0 ? getPercentile(finalScore, game) : 0;

  const handleShare = async () => {
    const url = generateReportCard({ gameTitle: game.title, clinicalTitle: game.clinicalTitle, score: finalScore, unit: "CORRECT", rankLabel: rank.label, rankTitle: rank.title, rankSubtitle: rank.subtitle, rankColor: rank.color, percentile: pct, accent: game.accent, siteUrl: t.site.url });
    setShareImg(url);
    if (navigator.share) { try { const blob = await (await fetch(url)).blob(); await navigator.share({ title: "NeuroBench", text: t.share.text(game.title, rank.label, rank.subtitle, t.site.url), files: [new File([blob], "report.png", { type: "image/png" })] }); return; } catch { } }
    window.open(url, "_blank");
  };

  if (phase === "done") {
    return (
      <>
        {showAd && <InterstitialAd onDone={afterAd} />}
        <div className="anim-scale-in" style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", borderTop: `2px solid ${rank.color}`, borderRadius: "var(--radius-xl)", padding: "clamp(28px,5vw,48px) clamp(20px,4vw,40px)", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-3)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 28 }}>Assessment Complete · {game.clinicalTitle}</div>
          <div style={{ width: 110, height: 110, borderRadius: "50%", background: `${rank.color}12`, border: `2px solid ${rank.color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: `0 0 48px ${rank.color}25` }}>
            <span style={{ fontSize: 48, fontWeight: 900, color: rank.color, lineHeight: 1 }}>{rank.label}</span>
            <span style={{ fontSize: 9, color: rank.color, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2, fontFamily: "var(--font-mono)" }}>{rank.percentileLabel}</span>
          </div>
          <div style={{ fontSize: "clamp(52px,13vw,80px)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, marginBottom: 4 }}>
            {finalScore}<span style={{ fontSize: "clamp(16px,3vw,22px)", fontWeight: 400, color: "var(--text-3)", marginLeft: 6, fontFamily: "var(--font-mono)" }}>correct</span>
          </div>
          <div style={{ fontSize: 13, color: game.accent, fontWeight: 700, marginBottom: 6, fontFamily: "var(--font-mono)" }}>TOP {100 - pct}% GLOBALLY</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: rank.color, marginBottom: 4 }}>{rank.title}</div>
          <div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic", marginBottom: 20 }}>&quot;{rank.subtitle}&quot;</div>
          {isNewBest && <div style={{ display: "inline-block", background: `${game.accent}12`, border: `1px solid ${game.accent}30`, color: game.accent, fontSize: 11, fontWeight: 700, padding: "3px 14px", borderRadius: 999, marginBottom: 16, fontFamily: "var(--font-mono)", letterSpacing: "0.06em", textTransform: "uppercase" }}>◆ New Personal Record</div>}
          {highScore !== null && !isNewBest && <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 16, fontFamily: "var(--font-mono)" }}>Personal best: <span style={{ color: game.accent }}>{highScore}</span></div>}
          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", margin: "16px 0 24px" }}>
            {game.stats.ranks.map(r => (<div key={r.label} style={{ padding: "4px 11px", borderRadius: 6, fontSize: 12, fontWeight: 800, fontFamily: "var(--font-mono)", background: r.label === rank.label ? `${r.color}18` : "var(--bg-elevated)", color: r.label === rank.label ? r.color : "var(--text-3)", border: `1px solid ${r.label === rank.label ? r.color + "40" : "transparent"}` }}>{r.label}</div>))}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={handleRetry} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 800, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)" }}>▶ PLAY AGAIN</button>
            <button onClick={handleShare} className="pressable" style={{ background: "var(--bg-elevated)", color: "var(--text-1)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 700, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)" }}>↗ SHARE</button>
          </div>
          {shareImg && <div style={{ marginTop: 28 }}><img src={shareImg} alt="Report" style={{ maxWidth: "100%", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }} /></div>}
        </div>
      </>
    );
  }

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      {phase === "idle" ? (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "clamp(32px,6vw,56px) clamp(20px,4vw,40px)", textAlign: "center" }}>
          <div style={{ fontSize: "clamp(40px,10vw,56px)", marginBottom: 20 }}>🎨</div>
          <p style={{ fontSize: "clamp(16px,3.5vw,19px)", fontWeight: 800, marginBottom: 8 }}>Inhibitory Control Assessment</p>
          <p style={{ fontSize: 13, color: "var(--text-2)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>Click the INK COLOR — not the word</p>
          <p style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 28 }}>One wrong answer ends the test</p>
          <button onClick={startGame} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>▶ BEGIN PROTOCOL</button>
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-2)" }}>SCORE: <span style={{ color: game.accent, fontWeight: 700 }}>{score}</span></div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-3)" }}>CLICK THE INK COLOR</div>
          </div>

          {/* Word display */}
          <div style={{
            background: "var(--bg-card)",
            border: `1.5px solid ${feedback === "correct" ? "#22c55e60" : feedback === "wrong" ? "#ef444460" : "var(--border)"}`,
            borderRadius: "var(--radius-xl)",
            minHeight: "clamp(140px,28vw,200px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 20, transition: "border-color 0.15s",
          }}>
            <span style={{
              fontSize: "clamp(40px,10vw,72px)",
              fontWeight: 900,
              color: pair.ink.hex,
              letterSpacing: "-0.02em",
              fontFamily: "var(--font-mono)",
              transition: "color 0.1s",
            }}>
              {pair.word.name}
            </span>
          </div>

          {/* Color buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            {pair.buttons.map(btn => (
              <button
                key={btn.name}
                onClick={() => handleAnswer(btn.name)}
                className="pressable"
                style={{
                  background: `${btn.hex}18`,
                  color: btn.hex,
                  border: `2px solid ${btn.hex}50`,
                  borderRadius: "var(--radius-md)",
                  padding: "16px 0",
                  fontSize: 16,
                  fontWeight: 800,
                  fontFamily: "var(--font-mono)",
                  cursor: "pointer",
                  letterSpacing: "0.06em",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {btn.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
