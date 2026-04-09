"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { getHighScore, saveHighScore, generateReportCard, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";

const t = dict.en;

function getRank(score: number, game: GameData) {
  // Higher score = better: S has highest threshold
  // Find the highest rank where score >= maxMs
  const sorted = [...game.stats.ranks].sort((a, b) => b.maxMs - a.maxMs);
  return sorted.find(r => score >= r.maxMs) ?? game.stats.ranks[game.stats.ranks.length - 1];
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

const GRID_COLS = 5;
const GRID_ROWS = 4;
const TOTAL_CELLS = GRID_COLS * GRID_ROWS;

type Phase = "idle" | "showing" | "input" | "correct" | "wrong" | "done";

interface NumberCell { value: number; cellIdx: number; }

export default function ChimpTest({ game }: { game: GameData }) {
  const [phase, setPhase]       = useState<Phase>("idle");
  const [level, setLevel]       = useState(4);
  const [cells, setCells]       = useState<NumberCell[]>([]);
  const [nextExpected, setNextExpected] = useState(1);
  const [wrongCell, setWrongCell] = useState<number | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [showAd, setShowAd]     = useState(false);
  const [shareImg, setShareImg] = useState<string | null>(null);
  const [highScore, setHS]      = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setHS(getHighScore(game.id)); }, [game.id]);
  const clearT = () => { if (timerRef.current) clearTimeout(timerRef.current); };
  useEffect(() => () => clearT(), []);

  const startLevel = useCallback((lvl: number) => {
    const positions = Array.from({ length: TOTAL_CELLS }, (_, i) => i)
      .sort(() => Math.random() - 0.5)
      .slice(0, lvl);
    const newCells: NumberCell[] = positions.map((cellIdx, i) => ({ value: i + 1, cellIdx }));
    setCells(newCells);
    setNextExpected(1);
    setWrongCell(null);
    setPhase("showing");
    // Flash duration: longer for more numbers
    const flashMs = 800 + lvl * 200;
    timerRef.current = setTimeout(() => setPhase("input"), flashMs);
  }, []);

  const startGame = () => { setLevel(4); startLevel(4); };

  const handleCellClick = useCallback((cellIdx: number) => {
    if (phase !== "input") return;
    const cell = cells.find(c => c.cellIdx === cellIdx);
    if (!cell || cell.value !== nextExpected) {
      setWrongCell(cellIdx);
      playBeep("fail");
      const score = level - 1;
      setFinalScore(score);
      const isNew = saveHighScore(game.id, score);
      setIsNewBest(isNew);
      if (isNew) setHS(score);
      // Show numbers again briefly then done
      setPhase("showing");
      timerRef.current = setTimeout(() => setPhase("done"), 1500);
      return;
    }

    playBeep("tap");
    const next = nextExpected + 1;
    setNextExpected(next);

    if (next > level) {
      playBeep("success");
      setPhase("correct");
      const nextLevel = level + 1;
      setLevel(nextLevel);
      timerRef.current = setTimeout(() => startLevel(nextLevel), 1000);
    }
  }, [phase, cells, nextExpected, level, game.id, startLevel]);

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setShareImg(null); setIsNewBest(false); setLevel(4); };

  const rank = finalScore > 0 ? getRank(finalScore, game) : null;
  const pct  = finalScore > 0 ? getPercentile(finalScore, game) : 0;

  const handleShare = async () => {
    if (!rank) return;
    const url = generateReportCard({ gameTitle: game.title, clinicalTitle: game.clinicalTitle, score: finalScore, unit: "NUMBERS", rankLabel: rank.label, rankTitle: rank.title, rankSubtitle: rank.subtitle, rankColor: rank.color, percentile: pct, accent: game.accent, siteUrl: t.site.url });
    setShareImg(url);
    if (navigator.share) {
      try { const blob = await (await fetch(url)).blob(); await navigator.share({ title: "My ZAZAZA Report", text: t.share.text(game.title, rank.label, rank.subtitle, t.site.url), files: [new File([blob], "zazaza-report.png", { type: "image/png" })] }); return; } catch { /* fallback */ }
    }
    window.open(url, "_blank");
  };

  if (phase === "done" && rank) {
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
            {finalScore}<span style={{ fontSize: "clamp(16px,3vw,22px)", fontWeight: 400, color: "var(--text-3)", marginLeft: 6, fontFamily: "var(--font-mono)" }}>numbers</span>
          </div>
          <div style={{ fontSize: 13, color: game.accent, fontWeight: 700, marginBottom: 6, fontFamily: "var(--font-mono)" }}>TOP {100 - pct}% GLOBALLY</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: rank.color, marginBottom: 4 }}>{rank.title}</div>
          <div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic", marginBottom: 20 }}>&quot;{rank.subtitle}&quot;</div>
          {isNewBest && <div style={{ display: "inline-block", background: `${game.accent}12`, border: `1px solid ${game.accent}30`, color: game.accent, fontSize: 11, fontWeight: 700, padding: "3px 14px", borderRadius: 999, marginBottom: 16, fontFamily: "var(--font-mono)", letterSpacing: "0.06em", textTransform: "uppercase" }}>◆ New Personal Record</div>}
          {highScore !== null && !isNewBest && <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 16, fontFamily: "var(--font-mono)" }}>Personal best: <span style={{ color: game.accent }}>{highScore} numbers</span></div>}
          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", margin: "16px 0 24px" }}>
            {game.stats.ranks.map(r => (<div key={r.label} style={{ padding: "4px 11px", borderRadius: 6, fontSize: 12, fontWeight: 800, fontFamily: "var(--font-mono)", background: r.label === rank.label ? `${r.color}18` : "var(--bg-elevated)", color: r.label === rank.label ? r.color : "var(--text-3)", border: `1px solid ${r.label === rank.label ? r.color + "40" : "transparent"}` }}>{r.label}</div>))}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={handleRetry} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 800, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>▶ PLAY AGAIN</button>
            <button onClick={handleShare} className="pressable" style={{ background: "var(--bg-elevated)", color: "var(--text-1)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 700, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>↗ SHARE</button>
          </div>
          {shareImg && <div style={{ marginTop: 28 }}><img src={shareImg} alt="Report" style={{ maxWidth: "100%", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }} /><p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 8, fontFamily: "var(--font-mono)" }}>Long-press (mobile) · Right-click (desktop) to save</p></div>}
        </div>
      </>
    );
  }

  const cellMap = new Map(cells.map(c => [c.cellIdx, c]));

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}

      {phase !== "idle" && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>LEVEL {level} · {level} NUMBERS</div>
          <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
            {phase === "showing" ? "MEMORIZE" : phase === "input" ? `NEXT: ${nextExpected}` : phase === "correct" ? "✓" : ""}
          </div>
        </div>
      )}

      <div style={{ background: "var(--bg-card)", border: `1.5px solid ${phase === "correct" ? `${game.accent}40` : "var(--border)"}`, borderRadius: "var(--radius-xl)", padding: "clamp(16px,3vw,28px)", transition: "border-color 0.15s" }}>
        {phase === "idle" ? (
          <div className="anim-fade-up" style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: "clamp(40px,10vw,56px)", marginBottom: 20 }}>🐒</div>
            <p style={{ fontSize: "clamp(16px,3.5vw,19px)", fontWeight: 800, marginBottom: 8 }}>Sequential Numerical Processing</p>
            <p style={{ fontSize: 13, color: "var(--text-2)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>Numbers flash briefly — click them in order</p>
            <p style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 28 }}>Starts at 4 numbers. Chimpanzees average 9.</p>
            <button onClick={startGame} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>▶ BEGIN PROTOCOL</button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`, gap: "clamp(6px,1.5vw,10px)", maxWidth: 360, margin: "0 auto" }}>
            {Array.from({ length: TOTAL_CELLS }).map((_, idx) => {
              const cell = cellMap.get(idx);
              const isWrong = wrongCell === idx;
              const isCompleted = cell && cell.value < nextExpected;
              const showNumber = phase === "showing" && cell;

              return (
                <div
                  key={idx}
                  onClick={() => cell && handleCellClick(idx)}
                  style={{
                    background: isWrong ? "#ef444430" : isCompleted ? "var(--bg-overlay)" : cell ? (showNumber ? `${game.accent}20` : "var(--bg-elevated)") : "transparent",
                    border: `1.5px solid ${isWrong ? "#ef4444" : isCompleted ? "transparent" : cell ? (showNumber ? `${game.accent}60` : "var(--border-md)") : "transparent"}`,
                    borderRadius: 8,
                    aspectRatio: "1",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "clamp(14px,3vw,20px)", fontWeight: 900, fontFamily: "var(--font-mono)",
                    color: showNumber ? game.accent : isWrong ? "#ef4444" : "var(--text-3)",
                    cursor: cell && phase === "input" ? "pointer" : "default",
                    transition: "all 0.12s",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {showNumber ? cell.value : isWrong ? "✗" : isCompleted ? "" : ""}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
        {phase === "idle" && "CHIMPS AVERAGE 9 NUMBERS — CAN YOU BEAT THEM?"}
        {phase === "showing" && "MEMORIZE THE POSITIONS"}
        {phase === "input" && `CLICK ${nextExpected} · THEN ${nextExpected + 1} · IN ORDER`}
        {phase === "correct" && "CORRECT · ADDING ONE MORE NUMBER"}
        {phase === "wrong" && "WRONG · CALCULATING RESULTS"}
      </div>
    </>
  );
}
