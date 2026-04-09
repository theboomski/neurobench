"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { getHighScore, saveHighScore, generateReportCard, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";

const t = dict.en;

function getRank(score: number, game: GameData) {
  const sorted = [...game.stats.ranks].sort((a, b) => b.maxMs - a.maxMs);
  return sorted.find(r => score >= r.maxMs) ?? game.stats.ranks[game.stats.ranks.length - 1];
}
function getPercentile(score: number, game: GameData): number {
  const pts = [...game.stats.percentiles].sort((a, b) => b.ms - a.ms);
  if (score >= pts[0].ms) return pts[0].percentile;
  if (score <= pts[pts.length - 1].ms) return pts[pts.length - 1].percentile;
  for (let i = 0; i < pts.length - 1; i++) {
    if (score <= pts[i].ms && score >= pts[i + 1].ms) {
      const tt = (pts[i].ms - score) / (pts[i].ms - pts[i + 1].ms);
      return Math.round(pts[i].percentile - tt * (pts[i].percentile - pts[i + 1].percentile));
    }
  }
  return 50;
}

// FIX 1: Level 1=3 squares, each level +1. Grid grows at breakpoints
function getGridCols(level: number) {
  if (level <= 4) return 3;  // 3x3, max 6 squares
  if (level <= 9) return 4;  // 4x4, max 11 squares
  return 5;                   // 5x5
}
function getSquareCount(level: number) {
  return level + 2; // level 1=3, level 2=4, level 3=5 ...
}

type Phase = "idle" | "showing" | "input" | "correct" | "wrong" | "done";

export default function VisualMemory({ game }: { game: GameData }) {
  const [phase, setPhase]           = useState<Phase>("idle");
  const [level, setLevel]           = useState(1);
  const [gridCols, setGridCols]     = useState(3);
  const [targets, setTargets]       = useState<number[]>([]);
  const [clicked, setClicked]       = useState<Set<number>>(new Set());
  const [wrongCell, setWrongCell]   = useState<number | null>(null);
  const [showing, setShowing]       = useState(false);
  const [failed, setFailed]         = useState(false); // FIX 2: instant lock on wrong tap
  const [finalScore, setFinalScore] = useState(0);
  const [showAd, setShowAd]         = useState(false);
  const [shareImg, setShareImg]     = useState<string | null>(null);
  const [highScore, setHS]          = useState<number | null>(null);
  const [isNewBest, setIsNewBest]   = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setHS(getHighScore(game.id)); }, [game.id]);
  const clearT = () => { if (timerRef.current) clearTimeout(timerRef.current); };
  useEffect(() => () => clearT(), []);

  const startLevel = useCallback((lvl: number) => {
    const cols = getGridCols(lvl);
    const count = getSquareCount(lvl);
    const total = cols * cols;
    const shuffled = Array.from({ length: total }, (_, i) => i).sort(() => Math.random() - 0.5);
    const tgts = shuffled.slice(0, count);
    setGridCols(cols);
    setTargets(tgts);
    setClicked(new Set());
    setWrongCell(null);
    setFailed(false);
    setShowing(true);
    setPhase("showing");
    const showMs = 800 + count * 300;
    timerRef.current = setTimeout(() => {
      setShowing(false);
      setPhase("input");
    }, showMs);
  }, []);

  const startGame = () => { setLevel(1); startLevel(1); };

  const handleCellClick = useCallback((idx: number) => {
    // FIX 2: failed flag locks immediately — no recovery after wrong tap
    if (phase !== "input" || failed) return;
    if (clicked.has(idx)) return;

    if (!targets.includes(idx)) {
      setFailed(true); // lock BEFORE any state updates
      setWrongCell(idx);
      playBeep("fail");
      const score = level - 1;
      setFinalScore(score);
      const isNew = saveHighScore(game.id, score);
      setIsNewBest(isNew);
      if (isNew) setHS(score);
      timerRef.current = setTimeout(() => setPhase("done"), 1200);
      return;
    }

    playBeep("tap");
    const newClicked = new Set(clicked);
    newClicked.add(idx);
    setClicked(newClicked);

    if (newClicked.size === targets.length) {
      playBeep("success");
      setPhase("correct");
      const nextLevel = level + 1;
      setLevel(nextLevel);
      timerRef.current = setTimeout(() => startLevel(nextLevel), 900);
    }
  }, [phase, failed, clicked, targets, level, game.id, startLevel]);

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => {
    setShowAd(false); setPhase("idle"); setShareImg(null);
    setIsNewBest(false); setLevel(1); setFailed(false);
    setClicked(new Set()); setWrongCell(null);
  };

  // finalScore=0 is valid (failed level 1), always compute rank when done
  const rank = getRank(Math.max(finalScore, 0), game);
  const pct  = phase === "done" ? getPercentile(finalScore, game) : 0;

  const handleShare = async () => {
    if (!rank) return;
    const url = generateReportCard({ gameTitle: game.title, clinicalTitle: game.clinicalTitle, score: finalScore, unit: "LEVELS", rankLabel: rank.label, rankTitle: rank.title, rankSubtitle: rank.subtitle, rankColor: rank.color, percentile: pct, accent: game.accent, siteUrl: t.site.url });
    setShareImg(url);
    if (navigator.share) { try { const blob = await (await fetch(url)).blob(); await navigator.share({ title: "My ZAZAZA Report", text: t.share.text(game.title, rank.label, rank.subtitle, t.site.url), files: [new File([blob], "zazaza-report.png", { type: "image/png" })] }); return; } catch { } }
    window.open(url, "_blank");
  };

  if (phase === "done") {
    return (
      <>
        {showAd && <InterstitialAd onDone={afterAd} />}
        <div className="anim-scale-in" style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", borderTop: `2px solid ${rank.color}`, borderRadius: "var(--radius-xl)", padding: "clamp(28px,5vw,48px) clamp(20px,4vw,40px)", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-3)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 28 }}>ZAZAZA Assessment Complete · {game.clinicalTitle}</div>
          <div style={{ width: 110, height: 110, borderRadius: "50%", background: `${rank.color}12`, border: `2px solid ${rank.color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: `0 0 48px ${rank.color}25` }}>
            <span style={{ fontSize: 48, fontWeight: 900, color: rank.color, lineHeight: 1 }}>{rank.label}</span>
            <span style={{ fontSize: 9, color: rank.color, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2, fontFamily: "var(--font-mono)" }}>{rank.percentileLabel}</span>
          </div>
          <div style={{ fontSize: "clamp(52px,13vw,80px)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, marginBottom: 4 }}>
            {finalScore}<span style={{ fontSize: "clamp(16px,3vw,22px)", fontWeight: 400, color: "var(--text-3)", marginLeft: 6, fontFamily: "var(--font-mono)" }}>levels</span>
          </div>
          <div style={{ fontSize: 13, color: game.accent, fontWeight: 700, marginBottom: 6, fontFamily: "var(--font-mono)" }}>TOP {100 - pct}% GLOBALLY</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: rank.color, marginBottom: 4 }}>{rank.title}</div>
          <div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic", marginBottom: 20 }}>&quot;{rank.subtitle}&quot;</div>
          {isNewBest && <div style={{ display: "inline-block", background: `${game.accent}12`, border: `1px solid ${game.accent}30`, color: game.accent, fontSize: 11, fontWeight: 700, padding: "3px 14px", borderRadius: 999, marginBottom: 16, fontFamily: "var(--font-mono)" }}>◆ New Personal Record</div>}
          {highScore !== null && !isNewBest && <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 16, fontFamily: "var(--font-mono)" }}>Personal best: <span style={{ color: game.accent }}>{highScore} levels</span></div>}
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

  const totalCells = gridCols * gridCols;

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}

      {phase !== "idle" && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>LEVEL {level}</div>
          <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
            {phase === "showing" ? `MEMORIZE ${targets.length}` : phase === "input" ? `${clicked.size}/${targets.length}` : phase === "correct" ? "✓" : ""}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{gridCols}×{gridCols}</div>
        </div>
      )}

      <div style={{
        background: "var(--bg-card)",
        border: `1.5px solid ${phase === "wrong" ? "#ef444440" : phase === "correct" ? `${game.accent}40` : "var(--border)"}`,
        borderRadius: "var(--radius-xl)",
        padding: "clamp(12px,3vw,32px)",
        transition: "border-color 0.15s",
      }}>
        {phase === "idle" ? (
          <div className="anim-fade-up" style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: "clamp(40px,10vw,56px)", marginBottom: 20 }}>👁️</div>
            <p style={{ fontSize: "clamp(16px,3.5vw,19px)", fontWeight: 800, marginBottom: 8 }}>Visuospatial Working Memory</p>
            <p style={{ fontSize: 13, color: "var(--text-2)", fontFamily: "var(--font-mono)", marginBottom: 12 }}>Watch · Remember · Click all highlighted squares</p>
            <p style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 28 }}>Level 1 = 3 squares · +1 each level · One wrong tap = game over</p>
            <button onClick={startGame} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>▶ BEGIN PROTOCOL</button>
          </div>
        ) : (
          // FIX 3: vw-based max width so grid never overflows border on mobile
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
            gap: "clamp(4px,1.5vw,10px)",
            maxWidth: gridCols === 3 ? "min(260px, 76vw)" : gridCols === 4 ? "min(300px, 80vw)" : "min(340px, 84vw)",
            margin: "0 auto",
            width: "100%",
          }}>
            {Array.from({ length: totalCells }).map((_, idx) => {
              const isTarget  = targets.includes(idx);
              const isClicked = clicked.has(idx);
              const isWrong   = wrongCell === idx;
              let bg = "var(--bg-elevated)";
              let border = "var(--border)";
              let shadow = "none";
              if (showing && isTarget)  { bg = game.accent; border = game.accent; shadow = `0 0 16px ${game.accent}80`; }
              else if (isWrong)         { bg = "#ef444430"; border = "#ef4444"; shadow = "0 0 12px #ef444460"; }
              else if (isClicked)       { bg = `${game.accent}30`; border = `${game.accent}80`; }
              return (
                <div
                  key={idx}
                  onClick={() => handleCellClick(idx)}
                  style={{
                    background: bg,
                    border: `1.5px solid ${border}`,
                    boxShadow: shadow,
                    borderRadius: 6,
                    aspectRatio: "1",
                    cursor: phase === "input" && !failed ? "pointer" : "default",
                    transition: "all 0.1s",
                    WebkitTapHighlightColor: "transparent",
                    touchAction: "manipulation",
                  }}
                />
              );
            })}
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
        {phase === "idle"    && "GRID GROWS EACH LEVEL · ONE WRONG = GAME OVER"}
        {phase === "showing" && `MEMORIZE ${targets.length} SQUARE${targets.length > 1 ? "S" : ""}`}
        {phase === "input"   && "TAP ALL HIGHLIGHTED SQUARES"}
        {phase === "correct" && "CORRECT · NEXT LEVEL"}
        {phase === "wrong"   && "WRONG · GAME OVER"}
      </div>
    </>
  );
}
