"use client";

import { trackPlay } from "@/lib/tracking";

import { useState, useCallback, useEffect, useRef } from "react";
import type { GameData } from "@/lib/types";
import { getHighScore, saveHighScore, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";
import CommonResult from "@/components/CommonResult";
import { normalizeTo100FromPercentile, resolveResultTone } from "@/lib/resultUtils";

/** Round 1 starts here; time shrinks with score (floor MIN_ROUND_MS). */
const BASE_ROUND_MS = 2500;
const MIN_ROUND_MS = 700;
const MS_DECAY_PER_SCORE = 8;

function getRoundTimeMs(scoreAtRoundStart: number): number {
  return Math.max(MIN_ROUND_MS, Math.round(BASE_ROUND_MS - scoreAtRoundStart * MS_DECAY_PER_SCORE));
}

function getChoiceCount(scoreAtRoundStart: number): 4 | 5 | 6 {
  if (scoreAtRoundStart >= 75) return 6;
  if (scoreAtRoundStart >= 25) return 5;
  return 4;
}

/** After a correct answer, pause before next stimulus (shrinks with streak). */
function getCorrectDelayMs(scoreAfterCorrect: number): number {
  return Math.max(120, Math.round(300 - scoreAfterCorrect * 1.15));
}

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

const COLORS = [
  { name: "RED",    hex: "#EF4444" },
  { name: "GREEN",  hex: "#22C55E" },
  { name: "BLUE",   hex: "#3B82F6" },
  { name: "YELLOW", hex: "#EAB308" },
  { name: "PURPLE", hex: "#A855F7" },
  { name: "PINK",   hex: "#F472B6" },
];

type ColorDef = (typeof COLORS)[number];
type AnswerButton = ColorDef & { chromeHex: string; labelTextHex: string };

/** Decorative fill/border only — never matches this option's semantic color (no "pink tile = PINK" shortcut). */
function randomChromeHex(avoidSemanticHex: string): string {
  const pool = COLORS.map((c) => c.hex);
  let h = pool[Math.floor(Math.random() * pool.length)];
  let guard = 0;
  while (h === avoidSemanticHex && pool.length > 1 && guard++ < 24) {
    h = pool[Math.floor(Math.random() * pool.length)];
  }
  return h;
}

/**
 * Random ink for the answer label each round.
 * Avoids matching the option's semantic color (no "RED" in red) and the tile chrome (readability).
 */
function randomLabelTextHex(avoidSemanticHex: string, avoidChromeHex: string): string {
  const pool = COLORS.map((c) => c.hex);
  let h = pool[Math.floor(Math.random() * pool.length)];
  let guard = 0;
  while ((h === avoidSemanticHex || h === avoidChromeHex) && pool.length > 1 && guard++ < 32) {
    h = pool[Math.floor(Math.random() * pool.length)];
  }
  return h;
}

function randomPair(choiceCount: 4 | 5 | 6): { word: ColorDef; ink: ColorDef; buttons: AnswerButton[] } {
  const word = COLORS[Math.floor(Math.random() * COLORS.length)];
  let ink = COLORS[Math.floor(Math.random() * COLORS.length)];
  while (ink.name === word.name) ink = COLORS[Math.floor(Math.random() * COLORS.length)];
  const rest = COLORS.filter(c => c.name !== ink.name).sort(() => Math.random() - 0.5);
  const wrongCount = choiceCount - 1;
  const others = rest.slice(0, wrongCount);
  const shuffled = [...others, ink].sort(() => Math.random() - 0.5);
  const buttons: AnswerButton[] = shuffled.map((c) => {
    const chromeHex = randomChromeHex(c.hex);
    return {
      ...c,
      chromeHex,
      labelTextHex: randomLabelTextHex(c.hex, chromeHex),
    };
  });
  return { word, ink, buttons };
}

type Phase = "idle" | "playing" | "done";

export default function ColorConflict({ game }: { game: GameData }) {
  const [phase, setPhase]         = useState<Phase>("idle");
  const [score, setScore]         = useState(0);
  const [pair, setPair]           = useState(() => randomPair(4));
  const [feedback, setFeedback]   = useState<"correct" | "wrong" | "timeout" | null>(null);
  const [timeLeft, setTimeLeft]   = useState(BASE_ROUND_MS);
  const [roundTimeMs, setRoundTimeMs] = useState(BASE_ROUND_MS);
  const [showAd, setShowAd]       = useState(false);
  const [highScore, setHS]        = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const roundRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scoreRef  = useRef(0);

  useEffect(() => { setHS(getHighScore(game.id)); }, [game.id]);

  const clearTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (roundRef.current) clearTimeout(roundRef.current);
  };

  const endGame = useCallback((s: number) => {
    clearTimers();
    const isNew = saveHighScore(game.id, s);
    setIsNewBest(isNew);
    if (isNew) setHS(s);
    setFinalScore(s);
    setPhase("done");
  }, [game.id]);

  const startRound = useCallback((currentScore: number) => {
    const limit = getRoundTimeMs(currentScore);
    const choices = getChoiceCount(currentScore);
    setRoundTimeMs(limit);
    setPair(randomPair(choices));
    setFeedback(null);
    setTimeLeft(limit);

    const startMs = performance.now();
    timerRef.current = setInterval(() => {
      const elapsed = performance.now() - startMs;
      const remaining = Math.max(0, limit - elapsed);
      setTimeLeft(remaining);
    }, 50);

    roundRef.current = setTimeout(() => {
      clearTimers();
      playBeep("fail");
      setFeedback("timeout");
      setTimeout(() => endGame(currentScore), 800);
    }, limit);
  }, [endGame]);

  const startGame = () => {
    trackPlay(game.id);
    scoreRef.current = 0;
    setScore(0);
    setFeedback(null);
    setPhase("playing");
    startRound(0);
  };

  const handleAnswer = useCallback((colorName: string) => {
    if (phase !== "playing" || feedback !== null) return;
    clearTimers();
    const correct = colorName === pair.ink.name;
    if (correct) {
      playBeep("success");
      setFeedback("correct");
      scoreRef.current++;
      setScore(scoreRef.current);
      const delay = getCorrectDelayMs(scoreRef.current);
      setTimeout(() => startRound(scoreRef.current), delay);
    } else {
      playBeep("fail");
      setFeedback("wrong");
      setTimeout(() => endGame(scoreRef.current), 800);
    }
  }, [phase, feedback, pair, startRound, endGame]);

  useEffect(() => () => clearTimers(), []);

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
        rawUnit="correct"
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

  const timerPct = roundTimeMs > 0 ? (timeLeft / roundTimeMs) * 100 : 0;
  const timerColor = timerPct > 60 ? game.accent : timerPct > 30 ? "#F59E0B" : "#EF4444";
  const choiceCount = pair.buttons.length;
  const gridCols = choiceCount >= 5 ? 3 : 2;

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      {phase === "idle" ? (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "clamp(32px,6vw,56px) clamp(20px,4vw,40px)", textAlign: "center" }}>
          <div style={{ fontSize: "clamp(40px,10vw,56px)", marginBottom: 20 }}>🎨</div>
          <p style={{ fontSize: "clamp(16px,3.5vw,19px)", fontWeight: 800, marginBottom: 8 }}>Inhibitory Control Assessment</p>
          <p style={{ fontSize: 13, color: "var(--text-2)", fontFamily: "var(--font-mono)", marginBottom: 6, lineHeight: 1.55, maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
            The big word is printed in one ink color.             Tap the button whose <strong style={{ color: "var(--text-1)" }}>label</strong> names that ink — ignore the letters of the big word and the ink color of the small labels.
          </p>
          <p style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 10, lineHeight: 1.5, maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
            Tile borders and label colors are decoys; only the spelled color name (RED, GREEN, …) counts.
          </p>
          <p style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 28, lineHeight: 1.45, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
            Time per round shrinks as you score (down to {(MIN_ROUND_MS / 1000).toFixed(1)}s). After 25 / 75 correct, you get 5 then 6 choices. Wrong answer or timeout = game over.
          </p>
          <button onClick={startGame} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>▶ BEGIN PROTOCOL</button>
        </div>
      ) : (
        <div>
          {/* Timer bar */}
          <div style={{ height: 4, background: "var(--bg-elevated)", borderRadius: 2, marginBottom: 16, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${timerPct}%`, background: timerColor, borderRadius: 2, transition: "width 0.05s linear, background 0.3s" }} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-2)" }}>SCORE: <span style={{ color: game.accent, fontWeight: 700 }}>{score}</span></div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>{choiceCount} choices · {(roundTimeMs / 1000).toFixed(2)}s limit</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: timerColor, fontWeight: 700 }}>{(timeLeft / 1000).toFixed(1)}s</div>
          </div>

          {/* Word display */}
          <div style={{ background: "var(--bg-card)", border: `1.5px solid ${feedback === "correct" ? "#22c55e60" : feedback === "wrong" || feedback === "timeout" ? "#ef444460" : "var(--border)"}`, borderRadius: "var(--radius-xl)", minHeight: "clamp(120px,22vw,160px)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, transition: "border-color 0.1s" }}>
            <span style={{ fontSize: "clamp(36px,9vw,64px)", fontWeight: 900, color: pair.ink.hex, letterSpacing: "-0.02em", fontFamily: "var(--font-mono)" }}>
              {pair.word.name}
            </span>
          </div>

          {/* Buttons */}
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: 10 }}>
            {pair.buttons.map(btn => (
              <button
                key={btn.name}
                onClick={() => handleAnswer(btn.name)}
                className="pressable"
                style={{
                  background: `${btn.chromeHex}18`,
                  border: `2px solid ${btn.chromeHex}55`,
                  color: btn.labelTextHex,
                  borderRadius: "var(--radius-md)",
                  padding: "16px 0",
                  fontSize: 16,
                  fontWeight: 800,
                  fontFamily: "var(--font-mono)",
                  cursor: "pointer",
                  letterSpacing: "0.06em",
                  WebkitTapHighlightColor: "transparent",
                  textShadow: "0 0 3px rgba(0,0,0,0.85), 0 1px 2px rgba(0,0,0,0.75)",
                }}
              >
                {btn.name}
              </button>
            ))}
          </div>

          {feedback === "timeout" && (
            <div style={{ textAlign: "center", marginTop: 12, fontSize: 13, color: "#EF4444", fontFamily: "var(--font-mono)" }}>TIME&apos;S UP!</div>
          )}
        </div>
      )}
    </>
  );
}
