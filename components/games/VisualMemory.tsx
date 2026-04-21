"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { GameData } from "@/lib/types";
import { getHighScore, saveHighScore, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";
import CommonResult from "@/components/CommonResult";
import { normalizeTo100FromPercentile, resolveResultTone } from "@/lib/resultUtils";

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
  const [highScore, setHS]          = useState<number | null>(null);
  const [isNewBest, setIsNewBest]   = useState(false);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellPx, setCellPx] = useState(0);

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
    // Compute cell size based on actual container width
    if (containerRef.current) {
      const w = containerRef.current.clientWidth - 20; // subtract padding*2
      const g = cols >= 5 ? 3 : cols >= 4 ? 5 : 8;
      setCellPx(Math.floor((w - g * (cols - 1)) / cols));
    }
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
    setShowAd(false); setPhase("idle");
    setIsNewBest(false); setLevel(1); setFailed(false);
    setClicked(new Set()); setWrongCell(null);
  };

  // finalScore=0 is valid (failed level 1), always compute rank when done
  const rank = getRank(Math.max(finalScore, 0), game);
  const pct  = phase === "done" ? getPercentile(finalScore, game) : 0;

  if (phase === "done") {
    const normalized = normalizeTo100FromPercentile(pct, finalScore);
    return (
      <CommonResult
        game={game}
        rawScore={finalScore}
        rawUnit="levels"
        normalizedScore={normalized}
        percentile={pct}
        rank={rank}
        highScore={highScore}
        isNewBest={isNewBest}
        showAd={showAd}
        onAdDone={afterAd}
        onRetry={handleRetry}
        tone={resolveResultTone(game)}
      />
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

      <div ref={containerRef} style={{
        background: "var(--bg-card)",
        border: `1.5px solid ${phase === "wrong" ? "#ef444440" : phase === "correct" ? `${game.accent}40` : "var(--border)"}`,
        borderRadius: "var(--radius-xl)",
        padding: "10px",
        transition: "border-color 0.15s",
        boxSizing: "border-box",
        overflow: "hidden",
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
          // Grid: fixed pixel cells computed from actual container width
          <div style={{
            display: "grid",
            gridTemplateColumns: cellPx > 0
              ? `repeat(${gridCols}, ${cellPx}px)`
              : `repeat(${gridCols}, 1fr)`,
            gap: gridCols >= 5 ? 3 : gridCols >= 4 ? 5 : 8,
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
                    ...(cellPx > 0 ? { width: cellPx, height: cellPx } : {}),
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
