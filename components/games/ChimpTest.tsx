"use client";

import { trackPlay } from "@/lib/tracking";

import { useState, useRef, useCallback, useEffect } from "react";
import type { GameData } from "@/lib/types";
import { getHighScore, saveHighScore, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";
import CommonResult from "@/components/CommonResult";
import { normalizeTo100FromPercentile, resolveResultTone } from "@/lib/resultUtils";

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
      return pts[i].percentile - t2 * (pts[i].percentile - pts[i + 1].percentile);
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
  const [userStarted, setUserStarted] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [showAd, setShowAd]     = useState(false);
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
    setUserStarted(false);
    setPhase("showing");
    // Flash duration: longer for more numbers
    const flashMs = 800 + lvl * 200;
    timerRef.current = setTimeout(() => setPhase("input"), flashMs);
  }, []);

  const startGame = () => { trackPlay(game.id); setLevel(4); startLevel(4); };

  const handleCellClick = useCallback((cellIdx: number) => {
    if (phase !== "input") return;
    // Hide numbers the moment user clicks 1
    if (!userStarted) setUserStarted(true);
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
  }, [phase, cells, nextExpected, level, game.id, startLevel, userStarted]);

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setIsNewBest(false); setLevel(4); setUserStarted(false); };

  const rank = phase === "done" ? getRank(finalScore, game) : null;
  const pct  = phase === "done" ? getPercentile(finalScore, game) : 0;

  if (phase === "done" && rank) {
    const normalized = normalizeTo100FromPercentile(pct, finalScore);
    return (
      <CommonResult
        game={game}
        rawScore={finalScore}
        rawUnit="numbers"
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
            <button onClick={startGame} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>▶ PLAY</button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`, gap: "clamp(6px,1.5vw,10px)", maxWidth: 360, margin: "0 auto" }}>
            {Array.from({ length: TOTAL_CELLS }).map((_, idx) => {
              const cell = cellMap.get(idx);
              const isWrong = wrongCell === idx;
              const isCompleted = cell && cell.value < nextExpected;
              const showNumber = (phase === "showing" || !userStarted) && cell;

              return (
                <div
                  key={idx}
                  onClick={() => cell && handleCellClick(idx)}
                  style={{
                    background: isWrong ? "#ef444430" : isCompleted ? `${game.accent}1f` : cell ? (showNumber ? `${game.accent}20` : "var(--bg-elevated)") : "transparent",
                    border: `1.5px solid ${isWrong ? "#ef4444" : isCompleted ? `${game.accent}66` : cell ? (showNumber ? `${game.accent}60` : "var(--border-md)") : "transparent"}`,
                    borderRadius: 8,
                    aspectRatio: "1",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "clamp(14px,3vw,20px)", fontWeight: 900, fontFamily: "var(--font-mono)",
                    color: showNumber ? game.accent : isWrong ? "#ef4444" : isCompleted ? game.accent : "var(--text-3)",
                    cursor: cell && phase === "input" ? "pointer" : "default",
                    transition: "all 0.12s",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {showNumber ? cell.value : isWrong ? "✗" : isCompleted ? "✓" : ""}
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
