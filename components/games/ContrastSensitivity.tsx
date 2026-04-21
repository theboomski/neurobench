"use client";

import { trackPlay } from "@/lib/tracking";
import React from "react";

import { useState, useCallback, useEffect } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { getHighScore, saveHighScore, generateReportCard } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";

const t = dict.en;

// Contrast levels: 0=invisible, 1=full contrast
// Each round reduces contrast until user can't see
const INITIAL_CONTRAST = 1.0;
const CONTRAST_STEP = 0.08;
const MIN_CONTRAST = 0.02;

function getRank(score: number, game: GameData) {
  const sorted = [...game.stats.ranks].sort((a, b) => b.maxMs - a.maxMs);
  return sorted.find(r => score >= r.maxMs) ?? game.stats.ranks[game.stats.ranks.length - 1];
}
function getPercentile(score: number, game: GameData) {
  const pts = [...game.stats.percentiles].sort((a, b) => b.ms - a.ms);
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

type Phase = "idle" | "playing" | "done";
type Answer = "yes" | "no";

// Gabor-like grating pattern using SVG
function GratingPattern({ contrast, size = 280 }: { contrast: number; size?: number }) {
  const stripes: React.ReactElement[] = [];
  const stripeW = size / 12;
  for (let i = 0; i < 12; i++) {
    const lightness = 50 + (i % 2 === 0 ? contrast * 40 : -contrast * 40);
    stripes.push(
      <rect key={i} x={i * stripeW} y={0} width={stripeW} height={size}
        fill={`hsl(0,0%,${Math.max(0, Math.min(100, lightness))}%)`} />
    );
  }
  return (
    <svg width={size} height={size} style={{ borderRadius: 12, display: "block" }}>
      <defs>
        <radialGradient id="vignette">
          <stop offset="60%" stopColor="transparent" />
          <stop offset="100%" stopColor="hsl(0,0%,50%)" />
        </radialGradient>
      </defs>
      {stripes}
      <rect x={0} y={0} width={size} height={size} fill="url(#vignette)" rx={12} />
    </svg>
  );
}

export default function ContrastSensitivity({ game }: { game: GameData }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [contrast, setContrast] = useState(INITIAL_CONTRAST);
  const [round, setRound] = useState(0);
  const [lastYesContrast, setLastYesContrast] = useState(INITIAL_CONTRAST);
  const [consecutiveNo, setConsecutiveNo] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [showAd, setShowAd] = useState(false);
  const [shareImg, setShareImg] = useState<string | null>(null);
  const [highScore, setHS] = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [showPattern, setShowPattern] = useState(true);

  useEffect(() => { setHS(getHighScore(game.id)); }, [game.id]);

  const handleAnswer = useCallback((answer: Answer) => {
    if (answer === "yes") {
      setLastYesContrast(contrast);
      setConsecutiveNo(0);
      const next = Math.max(MIN_CONTRAST, contrast - CONTRAST_STEP);
      if (next <= MIN_CONTRAST) {
        // Max performance
        const score = Math.round(lastYesContrast * 100);
        finishGame(score);
      } else {
        setContrast(next);
        setRound(r => r + 1);
        // Brief blank between rounds
        setShowPattern(false);
        setTimeout(() => setShowPattern(true), 300);
      }
    } else {
      const newNo = consecutiveNo + 1;
      setConsecutiveNo(newNo);
      if (newNo >= 2) {
        const score = Math.round(lastYesContrast * 100);
        finishGame(score);
      } else {
        setRound(r => r + 1);
        setShowPattern(false);
        setTimeout(() => setShowPattern(true), 300);
      }
    }
  }, [contrast, consecutiveNo, lastYesContrast]);

  const finishGame = (score: number) => {
    setFinalScore(score);
    const isNew = saveHighScore(game.id, score);
    setIsNewBest(isNew);
    if (isNew) setHS(score);
    setPhase("done");
  };

  const startGame = () => {
    trackPlay(game.id);
    setContrast(INITIAL_CONTRAST);
    setRound(0);
    setLastYesContrast(INITIAL_CONTRAST);
    setConsecutiveNo(0);
    setPhase("playing");
    setShowPattern(true);
  };

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setShareImg(null); setIsNewBest(false); };

  const rank = getRank(finalScore, game);
  const pct = getPercentile(finalScore, game);

  const handleShare = async () => {
    const url = generateReportCard({ gameTitle: game.title, clinicalTitle: game.clinicalTitle, score: finalScore, unit: "%", rankLabel: rank.label, rankTitle: rank.title, rankSubtitle: rank.subtitle, rankColor: rank.color, percentile: pct, accent: game.accent, siteUrl: t.site.url });
    setShareImg(url);
    if (navigator.share) { try { const blob = await (await fetch(url)).blob(); await navigator.share({ title: "ZAZAZA", text: `My contrast sensitivity: ${finalScore}%! Can you beat me? ${t.site.url}`, files: [new File([blob], "result.png", { type: "image/png" })] }); return; } catch { } }
    window.open(url, "_blank");
  };

  if (phase === "done") return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div className="anim-scale-in" style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", borderTop: `2px solid ${rank.color}`, borderRadius: "var(--radius-xl)", padding: "clamp(28px,5vw,48px) clamp(20px,4vw,40px)", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>Contrast Sensitivity Assessment</div>
        <div style={{ width: 100, height: 100, borderRadius: "50%", background: `${rank.color}12`, border: `2px solid ${rank.color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <span style={{ fontSize: 42, fontWeight: 900, color: rank.color, lineHeight: 1 }}>{rank.label}</span>
          <span style={{ fontSize: 9, color: rank.color, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-mono)" }}>{rank.percentileLabel}</span>
        </div>
        <div style={{ fontSize: "clamp(52px,13vw,80px)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, marginBottom: 4 }}>
          {finalScore}<span style={{ fontSize: 20, fontWeight: 400, color: "var(--text-3)", marginLeft: 4, fontFamily: "var(--font-mono)" }}>%</span>
        </div>
        <div style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 8, fontFamily: "var(--font-mono)" }}>sensitivity threshold: {(finalScore / 100).toFixed(2)}</div>
        <div style={{ fontSize: 13, color: game.accent, fontWeight: 700, marginBottom: 6, fontFamily: "var(--font-mono)" }}>TOP {100 - pct}% GLOBALLY</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: rank.color, marginBottom: 4 }}>{rank.title}</div>
        <div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic", marginBottom: 20 }}>&quot;{rank.subtitle}&quot;</div>
        {isNewBest && <div style={{ display: "inline-block", background: `${game.accent}12`, border: `1px solid ${game.accent}30`, color: game.accent, fontSize: 11, fontWeight: 700, padding: "3px 14px", borderRadius: 999, marginBottom: 16, fontFamily: "var(--font-mono)" }}>◆ New Personal Record</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 8 }}>
          <button onClick={handleRetry} className="pressable" style={{ background: game.accent, color: "#fff", border: "none", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 800, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)" }}>▶ PLAY AGAIN</button>
          <button onClick={handleShare} className="pressable" style={{ background: "var(--bg-elevated)", color: "var(--text-1)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 700, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)" }}>↗ SHARE</button>
        </div>
        {shareImg && <div style={{ marginTop: 24 }}><img src={shareImg} alt="Result" style={{ maxWidth: "100%", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }} /></div>}
      </div>
    </>
  );

  if (phase === "idle") return (
    <div style={{ background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "48px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🌫️</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Contrast Sensitivity Test</h2>
      <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 8, lineHeight: 1.7 }}>A striped pattern will appear and gradually fade. Tell us when you can still see it — and when it disappears. Your threshold is your score.</p>
      <p style={{ color: "var(--text-3)", fontSize: 12, fontFamily: "var(--font-mono)", marginBottom: 12 }}>💡 Set screen brightness to maximum for best results</p>
      <p style={{ color: "var(--text-3)", fontSize: 12, fontFamily: "var(--font-mono)", marginBottom: 28 }}>Takes ~60 seconds</p>
      <button onClick={startGame} className="pressable" style={{ background: game.accent, color: "#fff", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>▶ BEGIN TEST</button>
    </div>
  );

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 20 }}>
          ROUND {round + 1} · CONTRAST LEVEL: {Math.round(contrast * 100)}%
        </div>

        {/* Pattern */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 32, minHeight: 280, alignItems: "center" }}>
          {showPattern
            ? <GratingPattern contrast={contrast} size={280} />
            : <div style={{ width: 280, height: 280, background: "hsl(0,0%,50%)", borderRadius: 12 }} />
          }
        </div>

        <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 20, fontFamily: "var(--font-mono)" }}>Can you see a striped pattern?</p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={() => handleAnswer("yes")} className="pressable"
            style={{ flex: 1, maxWidth: 160, padding: "18px 0", background: "#10B98120", border: "2px solid #10B981", borderRadius: "var(--radius-lg)", fontSize: 16, fontWeight: 800, color: "#10B981", cursor: "pointer", fontFamily: "var(--font-mono)" }}>
            ✓ YES
          </button>
          <button onClick={() => handleAnswer("no")} className="pressable"
            style={{ flex: 1, maxWidth: 160, padding: "18px 0", background: "#EF444420", border: "2px solid #EF4444", borderRadius: "var(--radius-lg)", fontSize: 16, fontWeight: 800, color: "#EF4444", cursor: "pointer", fontFamily: "var(--font-mono)" }}>
            ✗ NO
          </button>
        </div>
      </div>
    </>
  );
}
