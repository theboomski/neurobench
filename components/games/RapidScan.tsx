"use client";

import { trackPlay } from "@/lib/tracking";

import { useState, useCallback, useEffect, useRef } from "react";
import type { GameData } from "@/lib/types";
import { getHighScore, saveHighScore, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";
import CommonResult from "@/components/CommonResult";
import { normalizeTo100FromPercentile, resolveResultTone } from "@/lib/resultUtils";
const TIME_LIMIT = 60000; // 60 second total session

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

function getGridCount(level: number) {
  // Grows meaningfully each level
  return Math.min(60 + level * 25, 500);
}

// Always regenerate entire grid — no target position continuity
function makeGrid(level: number): { grid: string[]; targetIdx: number } {
  const count = getGridCount(level);
  const grid = Array(count).fill("96");
  const target = Math.floor(Math.random() * count);
  grid[target] = "69";
  return { grid, targetIdx: target };
}

type Phase = "idle" | "playing" | "done";

export default function RapidScan({ game }: { game: GameData }) {
  const [phase, setPhase]       = useState<Phase>("idle");
  const [level, setLevel]       = useState(1);
  const [grid, setGrid]         = useState<string[]>([]);
  const [targetIdx, setTargetIdx] = useState(0);
  const [wrongIdx, setWrongIdx] = useState<number | null>(null);
  const [score, setScore]       = useState(0);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [showAd, setShowAd]     = useState(false);
  const [highScore, setHS]      = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const scoreRef  = useRef(0);
  const levelRef  = useRef(1);

  useEffect(() => { setHS(getHighScore(game.id)); }, [game.id]);

  const endGame = useCallback((s: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const isNew = saveHighScore(game.id, s);
    setIsNewBest(isNew);
    if (isNew) setHS(s);
    setFinalScore(s);
    setPhase("done");
  }, [game.id]);

  const startGame = () => {
    trackPlay(game.id);
    scoreRef.current = 0;
    levelRef.current = 1;
    setScore(0);
    setLevel(1);
    setWrongIdx(null);
    setTimeLeft(TIME_LIMIT);

    const { grid: g, targetIdx: qi } = makeGrid(1);
    setGrid(g);
    setTargetIdx(qi);
    setPhase("playing");

    const startMs = performance.now();
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, TIME_LIMIT - (performance.now() - startMs));
      setTimeLeft(remaining);
      if (remaining <= 0) endGame(scoreRef.current);
    }, 100);
  };

  const handleClick = useCallback((idx: number) => {
    if (phase !== "playing") return;
    if (idx === targetIdx) {
      playBeep("success");
      scoreRef.current++;
      levelRef.current++;
      setScore(scoreRef.current);
      setLevel(levelRef.current);
      setWrongIdx(null);
      // Generate completely new grid
      const { grid: g, targetIdx: qi } = makeGrid(levelRef.current);
      setGrid(g);
      setTargetIdx(qi);
    } else {
      playBeep("fail");
      setWrongIdx(idx);
      endGame(scoreRef.current);
    }
  }, [phase, targetIdx, endGame]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setIsNewBest(false); };

  const rank = getRank(finalScore, game);
  const pct  = getPercentile(finalScore, game);

  if (phase === "done") {
    const normalized = normalizeTo100FromPercentile(pct, finalScore);
    return (
      <CommonResult
        game={game}
        rawScore={finalScore}
        rawUnit="rounds"
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

  const cols = Math.ceil(Math.sqrt(grid.length * 1.5));
  const fontSize = Math.max(9, Math.min(16, 280 / cols));
  const timerPct = (timeLeft / TIME_LIMIT) * 100;
  const timerColor = timerPct > 40 ? game.accent : timerPct > 20 ? "#F59E0B" : "#EF4444";

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      {phase === "idle" ? (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "clamp(32px,6vw,56px) clamp(20px,4vw,40px)", textAlign: "center" }}>
          <div style={{ fontSize: "clamp(40px,10vw,56px)", marginBottom: 20 }}>🔍</div>
          <p style={{ fontSize: "clamp(16px,3.5vw,19px)", fontWeight: 800, marginBottom: 8 }}>Visual Search Efficiency</p>
          <p style={{ fontSize: 13, color: "var(--text-2)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>Find 69 among 96 · 60 seconds total</p>
          <p style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 28 }}>Grid grows each round · wrong click = game over</p>
          <button onClick={startGame} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>▶ PLAY</button>
        </div>
      ) : (
        <div>
          {/* Timer bar */}
          <div style={{ height: 4, background: "var(--bg-elevated)", borderRadius: 2, marginBottom: 12, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${timerPct}%`, background: timerColor, borderRadius: 2, transition: "width 0.1s linear, background 0.3s" }} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-2)" }}>LEVEL <span style={{ color: game.accent, fontWeight: 700 }}>{level}</span></div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700, color: timerColor }}>{(timeLeft / 1000).toFixed(0)}s</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-2)" }}>SCORE <span style={{ color: game.accent, fontWeight: 700 }}>{score}</span></div>
          </div>

          <div style={{
            background: "var(--bg-card)",
            border: `1.5px solid ${wrongIdx !== null ? "#ef444460" : "var(--border)"}`,
            borderRadius: "var(--radius-xl)",
            padding: "12px",
            display: "grid",
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gap: 1,
            userSelect: "none",
            transition: "border-color 0.15s",
            maxHeight: "58vh",
            overflow: "hidden",
          }}>
            {grid.map((char, idx) => (
              <span key={`${level}-${idx}`} onClick={() => handleClick(idx)} style={{
                fontSize,
                fontFamily: "monospace",
                fontWeight: 500,
                color: idx === wrongIdx ? "#ef4444" : char === "69" && wrongIdx !== null ? game.accent : "var(--text-2)",
                cursor: "pointer",
                textAlign: "center",
                lineHeight: 1.35,
                WebkitTapHighlightColor: "transparent",
              }}>
                {char}
              </span>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 8, fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
            FIND AND CLICK 69 · {grid.length} CELLS
          </div>
        </div>
      )}
    </>
  );
}
