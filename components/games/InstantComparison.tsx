"use client";

import { Suspense, useState, useCallback, useEffect, useRef } from "react";
import { useTriathlonMode } from "@/lib/useTriathlonMode";
import { trackPlay } from "@/lib/tracking";
import type { GameData } from "@/lib/types";
import { getHighScore, saveHighScore, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";
import CommonResult from "@/components/CommonResult";
import { normalizeTo100FromPercentile, resolveResultTone } from "@/lib/resultUtils";

const TIME_LIMIT = 3000;
const TRIATHLON_SESSION_MS = 60_000;
const TRIATHLON_ROUND_MS_START = 3000;
const TRIATHLON_ROUND_MS_FLOOR = 1700;
const TRIATHLON_ROUND_MS_CEILING = 4300;
const TRIATHLON_DIFFICULTY_MAX = 8;
const TRIATHLON_UI_ACCENT = "#00FF94";

function getRank(score: number, game: GameData) {
  const sorted = [...game.stats.ranks].sort((a, b) => b.maxMs - a.maxMs);
  return sorted.find((r) => score >= r.maxMs) ?? game.stats.ranks[game.stats.ranks.length - 1];
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

type Op = "+" | "-" | "×" | "÷";
interface Expr {
  value: number;
  display: string;
}

function makeExpr(difficulty: number): Expr {
  const maxN = Math.min(10 + difficulty * 5, 50);

  const ops: Op[] = difficulty < 3 ? ["+", "-"] : difficulty < 6 ? ["+", "-", "×"] : ["+", "-", "×", "÷"];
  const op = ops[Math.floor(Math.random() * ops.length)];

  let a: number, b: number, value: number;

  if (op === "+") {
    a = Math.floor(Math.random() * maxN) + 2;
    b = Math.floor(Math.random() * maxN) + 2;
    value = a + b;
  } else if (op === "-") {
    a = Math.floor(Math.random() * maxN) + 10;
    b = Math.floor(Math.random() * (a - 1)) + 1;
    value = a - b;
  } else if (op === "×") {
    a = Math.floor(Math.random() * Math.min(difficulty + 4, 12)) + 2;
    b = Math.floor(Math.random() * Math.min(difficulty + 4, 12)) + 2;
    value = a * b;
  } else {
    b = Math.floor(Math.random() * 9) + 2;
    value = Math.floor(Math.random() * 10) + 2;
    a = b * value;
  }

  return { value, display: `${a} ${op} ${b}` };
}

function makePair(difficulty: number) {
  let left: Expr, right: Expr, attempts = 0;
  do {
    left = makeExpr(difficulty);
    right = makeExpr(difficulty);
    attempts++;
    if (difficulty >= 5 && attempts < 20) {
      const diff = Math.abs(left.value - right.value);
      if (diff > Math.max(5, left.value * 0.2)) continue;
    }
  } while (left.value === right.value && attempts < 30);

  return { left, right, correct: left.value > right.value ? "left" : "right" };
}

type Phase = "idle" | "playing" | "done";

function InstantComparisonInner({ game, triathlonFromServer }: { game: GameData; triathlonFromServer?: boolean }) {
  const isTriathlon = useTriathlonMode(triathlonFromServer);

  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState(0);
  const [pair, setPair] = useState(() => makePair(1));
  const [feedback, setFeedback] = useState<"correct" | "wrong" | "timeout" | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [roundLimitMs, setRoundLimitMs] = useState(TIME_LIMIT);
  const [showAd, setShowAd] = useState(false);
  const [highScore, setHS] = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [triathlonTimeLeft, setTriathlonTimeLeft] = useState(TRIATHLON_SESSION_MS);
  const [triathlonDifficultyDisplay, setTriathlonDifficultyDisplay] = useState(1);
  const [triathlonIntroVisible, setTriathlonIntroVisible] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roundRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scoreRef = useRef(0);
  const triathlonScoreRef = useRef(0);
  const triathlonDifficultyRef = useRef(1);
  const triathlonRoundMsRef = useRef(TRIATHLON_ROUND_MS_START);
  const triathlonSessionStartRef = useRef(0);
  const triathlonCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const triathlonIntroTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef<Phase>("idle");
  const startRoundRef = useRef<(currentScore: number) => void>(() => {});

  useEffect(() => {
    setHS(getHighScore(game.id));
  }, [game.id]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const clearRoundTimers = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (roundRef.current) clearTimeout(roundRef.current);
    timerRef.current = null;
    roundRef.current = null;
  };

  const clearTriathlonCountdown = () => {
    if (triathlonCountdownRef.current) clearInterval(triathlonCountdownRef.current);
    triathlonCountdownRef.current = null;
  };

  const clearTriathlonIntroTimer = () => {
    if (triathlonIntroTimerRef.current) clearTimeout(triathlonIntroTimerRef.current);
    triathlonIntroTimerRef.current = null;
  };

  const clearAllTimers = () => {
    clearRoundTimers();
    clearTriathlonCountdown();
    clearTriathlonIntroTimer();
  };

  const endGame = useCallback((s: number) => {
    clearAllTimers();
    const isNew = saveHighScore(game.id, s);
    setIsNewBest(isNew);
    if (isNew) setHS(s);
    setFinalScore(s);
    setPhase("done");
  }, [game.id]);

  const endTriathlonSession = useCallback(() => {
    if (phaseRef.current === "done") return;
    clearAllTimers();
    const s = triathlonScoreRef.current;
    const isNew = saveHighScore(game.id, s);
    setIsNewBest(isNew);
    if (isNew) setHS(s);
    setFinalScore(s);
    setPhase("done");
    phaseRef.current = "done";
  }, [game.id]);

  const startRound = useCallback(
    (currentScore: number) => {
      if (isTriathlon) {
        const limit = triathlonRoundMsRef.current;
        const d = triathlonDifficultyRef.current;
        setRoundLimitMs(limit);
        setPair(makePair(d));
        setTriathlonDifficultyDisplay(d);
        setFeedback(null);
        setTimeLeft(limit);

        const startMs = performance.now();
        timerRef.current = setInterval(() => {
          const remaining = Math.max(0, limit - (performance.now() - startMs));
          setTimeLeft(remaining);
        }, 50);

        roundRef.current = setTimeout(() => {
          clearRoundTimers();
          playBeep("fail");
          setFeedback("timeout");
          triathlonRoundMsRef.current = Math.min(TRIATHLON_ROUND_MS_CEILING, triathlonRoundMsRef.current + 100);
          triathlonDifficultyRef.current = Math.max(1, triathlonDifficultyRef.current - 1);
          setTimeout(() => {
            if (phaseRef.current !== "playing") return;
            setFeedback(null);
            startRoundRef.current(currentScore);
          }, 500);
        }, limit);
        return;
      }

      const difficulty = Math.floor(currentScore / 4) + 1;
      setRoundLimitMs(TIME_LIMIT);
      setPair(makePair(difficulty));
      setFeedback(null);
      setTimeLeft(TIME_LIMIT);

      const startMs = performance.now();
      timerRef.current = setInterval(() => {
        const remaining = Math.max(0, TIME_LIMIT - (performance.now() - startMs));
        setTimeLeft(remaining);
      }, 50);

      roundRef.current = setTimeout(() => {
        clearRoundTimers();
        playBeep("fail");
        setFeedback("timeout");
        setTimeout(() => endGame(currentScore), 800);
      }, TIME_LIMIT);
    },
    [endGame, isTriathlon],
  );

  startRoundRef.current = startRound;

  const startGame = () => {
    trackPlay(game.id);
    clearAllTimers();
    scoreRef.current = 0;
    setScore(0);
    setFeedback(null);
    setPhase("playing");
    phaseRef.current = "playing";

    if (isTriathlon) {
      triathlonScoreRef.current = 0;
      triathlonDifficultyRef.current = 1;
      triathlonRoundMsRef.current = TRIATHLON_ROUND_MS_START;
      setTriathlonDifficultyDisplay(1);
      setTriathlonTimeLeft(TRIATHLON_SESSION_MS);
      triathlonSessionStartRef.current = Date.now();
      setTriathlonIntroVisible(true);
      clearTriathlonIntroTimer();
      triathlonIntroTimerRef.current = setTimeout(() => {
        setTriathlonIntroVisible(false);
        triathlonIntroTimerRef.current = null;
      }, 2500);

      triathlonCountdownRef.current = setInterval(() => {
        const left = Math.max(0, TRIATHLON_SESSION_MS - (Date.now() - triathlonSessionStartRef.current));
        setTriathlonTimeLeft(left);
        if (left <= 0) {
          endTriathlonSession();
        }
      }, 100);
    }

    startRound(0);
  };

  const handleAnswer = useCallback(
    (side: "left" | "right") => {
      if (phase !== "playing" || feedback !== null) return;
      clearRoundTimers();
      const correct = side === pair.correct;
      if (correct) {
        playBeep("success");
        setFeedback("correct");
        if (isTriathlon) {
          triathlonScoreRef.current += triathlonDifficultyRef.current;
          setScore(triathlonScoreRef.current);
          triathlonRoundMsRef.current = Math.max(TRIATHLON_ROUND_MS_FLOOR, triathlonRoundMsRef.current - 100);
          triathlonDifficultyRef.current = Math.min(TRIATHLON_DIFFICULTY_MAX, triathlonDifficultyRef.current + 1);
          setTimeout(() => {
            if (phaseRef.current !== "playing") return;
            setFeedback(null);
            startRoundRef.current(scoreRef.current);
          }, 280);
        } else {
          scoreRef.current++;
          setScore(scoreRef.current);
          setTimeout(() => startRoundRef.current(scoreRef.current), 280);
        }
      } else {
        playBeep("fail");
        setFeedback("wrong");
        if (isTriathlon) {
          triathlonRoundMsRef.current = Math.min(TRIATHLON_ROUND_MS_CEILING, triathlonRoundMsRef.current + 100);
          triathlonDifficultyRef.current = Math.max(1, triathlonDifficultyRef.current - 1);
          setTimeout(() => {
            if (phaseRef.current !== "playing") return;
            setFeedback(null);
            startRoundRef.current(scoreRef.current);
          }, 500);
        } else {
          setTimeout(() => endGame(scoreRef.current), 800);
        }
      }
    },
    [phase, feedback, pair, startRound, endGame, isTriathlon],
  );

  useEffect(() => () => clearAllTimers(), []);

  const handleRetry = () => {
    if (shouldShowAd()) setShowAd(true);
    else afterAd();
  };
  const afterAd = () => {
    clearAllTimers();
    setShowAd(false);
    setPhase("idle");
    phaseRef.current = "idle";
    setIsNewBest(false);
    setTriathlonIntroVisible(false);
    setTriathlonTimeLeft(TRIATHLON_SESSION_MS);
  };

  const rank = getRank(finalScore, game);
  const pct = getPercentile(finalScore, game);

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
        isTriathlon={isTriathlon}
      />
    );
  }

  const limitForBar = isTriathlon ? roundLimitMs : TIME_LIMIT;
  const timerPct = limitForBar > 0 ? (timeLeft / limitForBar) * 100 : 0;
  const timerColor = timerPct > 60 ? (isTriathlon ? TRIATHLON_UI_ACCENT : game.accent) : timerPct > 30 ? "#F59E0B" : "#EF4444";

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      {phase === "idle" ? (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xl)",
            padding: "clamp(32px,6vw,56px) clamp(20px,4vw,40px)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "clamp(40px,10vw,56px)", marginBottom: 20 }}>⚖️</div>
          <p style={{ fontSize: "clamp(16px,3.5vw,19px)", fontWeight: 800, marginBottom: 8 }}>Numerical Magnitude Processing</p>
          <p style={{ fontSize: 13, color: "var(--text-2)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>
            Click the LARGER value · {isTriathlon ? "Triathlon: 60s total, adaptive round time" : "3 seconds per round"}
          </p>
          <p style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 28 }}>
            {isTriathlon ? "Wrong or slow round adjusts difficulty — keep scoring until time runs out." : "Gets harder as you score · wrong or timeout = game over"}
          </p>
          <button
            onClick={startGame}
            className="pressable"
            style={{
              background: game.accent,
              color: "#000",
              border: "none",
              borderRadius: "var(--radius-md)",
              padding: "14px 36px",
              fontSize: 14,
              fontWeight: 800,
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
            }}
          >
            ▶ PLAY
          </button>
        </div>
      ) : (
        <div>
          {isTriathlon && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                gap: 8,
                marginBottom: 10,
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(11px, 2.8vw, 12px)",
              }}
            >
              <span style={{ color: TRIATHLON_UI_ACCENT, fontWeight: 800 }}>
                {(triathlonTimeLeft / 1000).toFixed(1)}s left
              </span>
              <span style={{ color: TRIATHLON_UI_ACCENT, fontWeight: 800 }}>LEVEL {triathlonDifficultyDisplay}</span>
            </div>
          )}
          {isTriathlon && (
            <div
              style={{
                textAlign: "center",
                marginBottom: 10,
                fontSize: "clamp(10px, 2.6vw, 12px)",
                fontFamily: "var(--font-mono)",
                color: "var(--text-2)",
                opacity: triathlonIntroVisible ? 1 : 0,
                transition: "opacity 0.35s ease",
                maxHeight: triathlonIntroVisible ? 40 : 0,
                overflow: "hidden",
              }}
            >
              60 seconds. Harder questions score more.
            </div>
          )}
          <div style={{ height: 4, background: "var(--bg-elevated)", borderRadius: 2, marginBottom: 16, overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${timerPct}%`,
                background: timerColor,
                borderRadius: 2,
                transition: "width 0.05s linear, background 0.3s",
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-2)" }}>
              SCORE:{" "}
              <span style={{ color: isTriathlon ? TRIATHLON_UI_ACCENT : game.accent, fontWeight: 700 }}>{score}</span>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: timerColor, fontWeight: 700 }}>
              {(timeLeft / 1000).toFixed(1)}s
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {(["left", "right"] as const).map((side) => (
              <button
                key={side}
                onClick={() => handleAnswer(side)}
                className="pressable"
                style={{
                  background:
                    feedback === "correct" && side === pair.correct
                      ? "#22c55e18"
                      : feedback === "wrong" && side === pair.correct
                        ? "#22c55e18"
                        : feedback === "wrong" && side !== pair.correct
                          ? "#ef444418"
                          : "var(--bg-card)",
                  border: `2px solid ${
                    feedback === "correct" && side === pair.correct
                      ? "#22c55e"
                      : feedback !== null && side === pair.correct
                        ? "#22c55e"
                        : feedback === "wrong" && side !== pair.correct
                          ? "#ef4444"
                          : "var(--border-md)"
                  }`,
                  borderRadius: "var(--radius-xl)",
                  padding: "clamp(24px,5vw,40px) 16px",
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all 0.12s",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <div
                  style={{
                    fontSize: "clamp(20px,4.5vw,32px)",
                    fontWeight: 900,
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-1)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {pair[side].display}
                </div>
              </button>
            ))}
          </div>
          {feedback === "timeout" && (
            <div style={{ textAlign: "center", marginTop: 12, fontSize: 13, color: "#EF4444", fontFamily: "var(--font-mono)" }}>
              TIME&apos;S UP!
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default function InstantComparison({ game, triathlonFromServer }: { game: GameData; triathlonFromServer?: boolean }) {
  return (
    <Suspense fallback={null}>
      <InstantComparisonInner game={game} triathlonFromServer={triathlonFromServer} />
    </Suspense>
  );
}
