"use client";

import { Suspense, useState, useCallback, useEffect, useRef } from "react";
import { useTriathlonMode } from "@/lib/useTriathlonMode";
import { trackPlay } from "@/lib/tracking";
import type { GameData } from "@/lib/types";
import { getHighScore, saveHighScore, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";
import CommonResult from "@/components/CommonResult";
import { normalizeTo100FromPercentile, resolveResultTone } from "@/lib/resultUtils";

const BASE_ROUND_MS = 2500;
const MIN_ROUND_MS = 700;
const MS_DECAY_PER_SCORE = 8;

const TRIATHLON_SESSION_MS = 30_000;
const TRIATHLON_ROUND_MS_START = 2500;
const TRIATHLON_ROUND_MS_FLOOR = 1500;
const TRIATHLON_ROUND_MS_CEILING = 3500;
const TRIATHLON_UI_ACCENT = "#4A7C59";

function getRoundTimeMs(scoreAtRoundStart: number): number {
  return Math.max(MIN_ROUND_MS, Math.round(BASE_ROUND_MS - scoreAtRoundStart * MS_DECAY_PER_SCORE));
}

function getChoiceCount(scoreAtRoundStart: number): 4 | 5 | 6 {
  if (scoreAtRoundStart >= 75) return 6;
  if (scoreAtRoundStart >= 25) return 5;
  return 4;
}

function getCorrectDelayMs(scoreAfterCorrect: number): number {
  return Math.max(120, Math.round(300 - scoreAfterCorrect * 1.15));
}

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

const COLORS = [
  { name: "RED", hex: "#EF4444" },
  { name: "GREEN", hex: "#22C55E" },
  { name: "BLUE", hex: "#3B82F6" },
  { name: "YELLOW", hex: "#EAB308" },
  { name: "PURPLE", hex: "#A855F7" },
  { name: "WHITE", hex: "#FFFFFF" },
];

type ColorDef = (typeof COLORS)[number];
type AnswerButton = ColorDef & { bgHex: string; borderHex: string; textHex: string };

const ROTATING_COLOR_HEXES = ["#EAB308", "#22C55E", "#3B82F6", "#EF4444", "#A855F7", "#FFFFFF"];
const OPTION_BG_PALETTE = ROTATING_COLOR_HEXES;
const OPTION_BORDER_PALETTE = ROTATING_COLOR_HEXES;
const OPTION_TEXT_PALETTE = ROTATING_COLOR_HEXES;

function shuffleList<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function randomPair(choiceCount: 4 | 5 | 6): { word: ColorDef; ink: ColorDef; buttons: AnswerButton[] } {
  const word = COLORS[Math.floor(Math.random() * COLORS.length)];
  let ink = COLORS[Math.floor(Math.random() * COLORS.length)];
  while (ink.name === word.name) ink = COLORS[Math.floor(Math.random() * COLORS.length)];
  const rest = COLORS.filter((c) => c.name !== ink.name).sort(() => Math.random() - 0.5);
  const wrongCount = choiceCount - 1;
  const others = rest.slice(0, wrongCount);
  const shuffled = [...others, ink].sort(() => Math.random() - 0.5);
  const bgPool = shuffleList(OPTION_BG_PALETTE);
  const borderPool = shuffleList(OPTION_BORDER_PALETTE);
  const textPool = shuffleList(OPTION_TEXT_PALETTE);

  const buttons: AnswerButton[] = shuffled.map((c, i) => {
    const bgHex = bgPool[i % bgPool.length] as string;

    const borderCandidates = borderPool.filter((hex) => hex !== bgHex);
    const borderHex =
      (borderCandidates[(i + 1) % Math.max(1, borderCandidates.length)] as string | undefined) ??
      (borderPool[(i + 1) % borderPool.length] as string);

    const textCandidates = textPool.filter((hex) => hex !== bgHex && hex !== borderHex);
    const textHex =
      (textCandidates[(i + 2) % Math.max(1, textCandidates.length)] as string | undefined) ??
      (textPool[(i + 2) % textPool.length] as string);

    return {
      ...c,
      bgHex,
      borderHex,
      textHex,
    };
  });
  return { word, ink, buttons };
}

type Phase = "idle" | "playing" | "done";

function triathlonPointsForChoices(n: 4 | 5 | 6): number {
  return Math.max(1, n - 3);
}

function ColorConflictInner({ game, triathlonFromServer }: { game: GameData; triathlonFromServer?: boolean }) {
  const isTriathlon = useTriathlonMode(triathlonFromServer);

  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState(0);
  const [pair, setPair] = useState(() => randomPair(4));
  const [feedback, setFeedback] = useState<"correct" | "wrong" | "timeout" | null>(null);
  const [timeLeft, setTimeLeft] = useState(BASE_ROUND_MS);
  const [roundTimeMs, setRoundTimeMs] = useState(BASE_ROUND_MS);
  const [showAd, setShowAd] = useState(false);
  const [highScore, setHS] = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [triathlonTimeLeft, setTriathlonTimeLeft] = useState(TRIATHLON_SESSION_MS);
  const [triathlonIntroVisible, setTriathlonIntroVisible] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const roundRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scoreRef = useRef(0);
  const triathlonScoreRef = useRef(0);
  const triathlonChoicesRef = useRef<4 | 5 | 6>(4);
  const triathlonCorrectStreakRef = useRef(0);
  const triathlonRoundMsRef = useRef(TRIATHLON_ROUND_MS_START);
  const triathlonChoicesAtRoundStartRef = useRef<4 | 5 | 6>(4);
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
    phaseRef.current = "done";
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
        const choices = triathlonChoicesRef.current;
        triathlonChoicesAtRoundStartRef.current = choices;
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
          clearRoundTimers();
          playBeep("fail");
          setFeedback("timeout");
          triathlonRoundMsRef.current = Math.min(TRIATHLON_ROUND_MS_CEILING, triathlonRoundMsRef.current + 100);
          triathlonChoicesRef.current = Math.max(4, triathlonChoicesRef.current - 1) as 4 | 5 | 6;
          triathlonCorrectStreakRef.current = 0;
          setTimeout(() => {
            if (phaseRef.current !== "playing") return;
            setFeedback(null);
            startRoundRef.current(currentScore);
          }, 500);
        }, limit);
        return;
      }

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
        clearRoundTimers();
        playBeep("fail");
        setFeedback("timeout");
        setTimeout(() => endGame(currentScore), 800);
      }, limit);
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
      triathlonChoicesRef.current = 4;
      triathlonCorrectStreakRef.current = 0;
      triathlonRoundMsRef.current = TRIATHLON_ROUND_MS_START;
      setTriathlonTimeLeft(TRIATHLON_SESSION_MS);
      triathlonSessionStartRef.current = Date.now();
      setTriathlonIntroVisible(true);
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
    (colorName: string) => {
      if (phase !== "playing" || feedback !== null) return;
      clearRoundTimers();
      const correct = colorName === pair.ink.name;
      if (correct) {
        playBeep("success");
        setFeedback("correct");
        if (isTriathlon) {
          const c = triathlonChoicesAtRoundStartRef.current;
          triathlonScoreRef.current += triathlonPointsForChoices(c);
          setScore(triathlonScoreRef.current);
          triathlonRoundMsRef.current = Math.max(TRIATHLON_ROUND_MS_FLOOR, triathlonRoundMsRef.current - 100);
          triathlonCorrectStreakRef.current += 1;
          if (triathlonCorrectStreakRef.current > 0 && triathlonCorrectStreakRef.current % 2 === 0) {
            triathlonChoicesRef.current = Math.min(6, triathlonChoicesRef.current + 1) as 4 | 5 | 6;
          }
          setTimeout(() => {
            if (phaseRef.current !== "playing") return;
            setFeedback(null);
            startRoundRef.current(scoreRef.current);
          }, 280);
        } else {
          scoreRef.current++;
          setScore(scoreRef.current);
          const delay = getCorrectDelayMs(scoreRef.current);
          setTimeout(() => startRoundRef.current(scoreRef.current), delay);
        }
      } else {
        playBeep("fail");
        setFeedback("wrong");
        if (isTriathlon) {
          triathlonRoundMsRef.current = Math.min(TRIATHLON_ROUND_MS_CEILING, triathlonRoundMsRef.current + 100);
          triathlonChoicesRef.current = Math.max(4, triathlonChoicesRef.current - 1) as 4 | 5 | 6;
          triathlonCorrectStreakRef.current = 0;
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

  const timerPct = roundTimeMs > 0 ? (timeLeft / roundTimeMs) * 100 : 0;
  const timerColor = timerPct > 60 ? (isTriathlon ? TRIATHLON_UI_ACCENT : game.accent) : timerPct > 30 ? "#F59E0B" : "#EF4444";
  const choiceCount = pair.buttons.length;
  const gridCols = choiceCount >= 5 ? 3 : 2;

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
          <div style={{ fontSize: "clamp(40px,10vw,56px)", marginBottom: 20 }}>🎨</div>
          <p style={{ fontSize: "clamp(16px,3.5vw,19px)", fontWeight: 800, marginBottom: 8 }}>Color Conflict</p>
          <p
            style={{
              fontSize: 13,
              color: "var(--text-2)",
              fontFamily: "var(--font-mono)",
              marginBottom: 6,
              lineHeight: 1.55,
              maxWidth: 400,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            The big word is printed in one ink color. Tap the button whose <strong style={{ color: "var(--text-1)" }}>label</strong> names that ink — ignore the letters of the big word and the ink color of the small labels.
          </p>
          <p
            style={{
              fontSize: 12,
              color: "var(--text-3)",
              fontFamily: "var(--font-mono)",
              marginBottom: 10,
              lineHeight: 1.5,
              maxWidth: 400,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            Tile borders and label colors are decoys; only the spelled color name (RED, GREEN, …) counts.
          </p>
          <p
            style={{
              fontSize: 12,
              color: "var(--text-3)",
              fontFamily: "var(--font-mono)",
              marginBottom: 28,
              lineHeight: 1.45,
              maxWidth: 420,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {isTriathlon
              ? "Triathlon: 30 seconds. More choices score more per correct answer — wrong answers slow you down but do not end the run."
              : `Time per round shrinks as you score (down to ${(MIN_ROUND_MS / 1000).toFixed(1)}s). After 25 / 75 correct, you get 5 then 6 choices. Wrong answer or timeout = game over.`}
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
              <span style={{ color: TRIATHLON_UI_ACCENT, fontWeight: 800 }}>{(triathlonTimeLeft / 1000).toFixed(1)}s left</span>
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
                maxHeight: triathlonIntroVisible ? 44 : 0,
                overflow: "hidden",
              }}
            >
              30 seconds. Score more with harder rounds.
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
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>
              {choiceCount} choices · {(roundTimeMs / 1000).toFixed(2)}s limit
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: timerColor, fontWeight: 700 }}>
              {(timeLeft / 1000).toFixed(1)}s
            </div>
          </div>

          <div
            style={{
              background: "var(--bg-card)",
              border: `1.5px solid ${feedback === "correct" ? "#22c55e60" : feedback === "wrong" || feedback === "timeout" ? "#ef444460" : "var(--border)"}`,
              borderRadius: "var(--radius-xl)",
              minHeight: "clamp(120px,22vw,160px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
              transition: "border-color 0.1s",
            }}
          >
            <span
              style={{
                fontSize: "clamp(36px,9vw,64px)",
                fontWeight: 900,
                color: pair.ink.hex,
                letterSpacing: "-0.02em",
                fontFamily: "var(--font-mono)",
              }}
            >
              {pair.word.name}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: 10 }}>
            {pair.buttons.map((btn) => (
              <button
                key={btn.name}
                onClick={() => handleAnswer(btn.name)}
                className="pressable"
                style={{
                  background: btn.bgHex,
                  border: `2px solid ${btn.borderHex}`,
                  color: btn.textHex,
                  borderRadius: "var(--radius-md)",
                  padding: "16px 0",
                  fontSize: 15,
                  fontWeight: 800,
                  fontFamily: "var(--font-body)",
                  cursor: "pointer",
                  letterSpacing: "0.01em",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {btn.name}
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

export default function ColorConflict({ game, triathlonFromServer }: { game: GameData; triathlonFromServer?: boolean }) {
  return (
    <Suspense fallback={null}>
      <ColorConflictInner game={game} triathlonFromServer={triathlonFromServer} />
    </Suspense>
  );
}
