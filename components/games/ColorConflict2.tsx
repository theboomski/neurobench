"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useTriathlonMode } from "@/lib/useTriathlonMode";
import { trackPlay } from "@/lib/tracking";
import type { GameData } from "@/lib/types";
import { getHighScore, saveHighScore, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";
import CommonResult from "@/components/CommonResult";
import { resolveResultTone } from "@/lib/resultUtils";

const TRIATHLON_SESSION_MS = 30_000;
const TRIATHLON_ROUND_MS_ADJUST_MS = 200;
const TRIATHLON_ROUND_MS_START = 2500;
const TRIATHLON_ROUND_MS_FLOOR = 1500;
const TRIATHLON_ROUND_MS_CEILING = 3500;
const TRIATHLON_UI_ACCENT = "#4A7C59";

type ColorName = "RED" | "BLUE" | "GREEN" | "YELLOW" | "PURPLE" | "WHITE";
type Phase = "idle" | "playing" | "done";

type RoundPrompt = {
  topMeaning: ColorName;
  bottomWord: ColorName;
  bottomInkName: ColorName;
  isYes: boolean;
};

const COLOR_NAMES: ColorName[] = ["RED", "BLUE", "GREEN", "YELLOW", "PURPLE", "WHITE"];
const INK_HEX_BY_NAME: Record<ColorName, string> = {
  RED: "#ef4444",
  BLUE: "#3b82f6",
  GREEN: "#22c55e",
  YELLOW: "#eab308",
  PURPLE: "#a855f7",
  WHITE: "#ffffff",
};
const BUTTON_ROTATION_COLORS: ColorName[] = ["YELLOW", "GREEN", "BLUE", "RED", "PURPLE", "WHITE"];

function contrastTextForHex(hex: string): string {
  const s = hex.replace("#", "");
  const n = Number.parseInt(s, 16);
  if (!Number.isFinite(n)) return "#0F0D0B";
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#1F1A16" : "#F7EFE6";
}

function getRoundTimeMs(roundNumber: number): number {
  if (roundNumber <= 10) return 3000;
  if (roundNumber <= 20) return 2500;
  if (roundNumber <= 30) return 2000;
  return 1500;
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
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
      const t = (pts[i].ms - score) / (pts[i].ms - pts[i + 1].ms);
      return Math.round(pts[i].percentile - t * (pts[i].percentile - pts[i + 1].percentile));
    }
  }
  return 50;
}

function normalizeScore(raw: number): number {
  if (raw <= 0) return 0;
  if (raw >= 100) return 100;
  return Math.round(raw);
}

function shouldGenerateYes(totalRoundsSoFar: number, yesRoundsSoFar: number): boolean {
  const targetYesRatio = 0.4;
  if (totalRoundsSoFar <= 0) return Math.random() < targetYesRatio;
  const expectedYesAfterNext = (totalRoundsSoFar + 1) * targetYesRatio;
  const deficit = expectedYesAfterNext - yesRoundsSoFar;
  const weightedYesProbability = Math.min(0.85, Math.max(0.15, targetYesRatio + deficit * 0.3));
  return Math.random() < weightedYesProbability;
}

function createPrompt(totalRoundsSoFar: number, yesRoundsSoFar: number): RoundPrompt {
  const topMeaning = randomFrom(COLOR_NAMES);
  const makeYes = shouldGenerateYes(totalRoundsSoFar, yesRoundsSoFar);
  const bottomInkName = makeYes ? topMeaning : randomFrom(COLOR_NAMES.filter((c) => c !== topMeaning));
  const bottomWord = randomFrom(COLOR_NAMES);
  return { topMeaning, bottomWord, bottomInkName, isYes: makeYes };
}

function triathlonPointsForRoundMs(roundMs: number): number {
  if (roundMs > 2000) return 1;
  if (roundMs >= 1500) return 2;
  return 3;
}

function ColorConflict2Inner({ game, triathlonFromServer }: { game: GameData; triathlonFromServer?: boolean }) {
  const isTriathlon = useTriathlonMode(triathlonFromServer);

  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [highScore, setHighScore] = useState<number | null>(null);
  const [prompt, setPrompt] = useState<RoundPrompt>(() => createPrompt(0, 0));
  const [roundNumber, setRoundNumber] = useState(1);
  const [roundTimeMs, setRoundTimeMs] = useState(3000);
  const [timeLeftMs, setTimeLeftMs] = useState(3000);
  const [showAd, setShowAd] = useState(false);
  const [triathlonTimeLeft, setTriathlonTimeLeft] = useState(TRIATHLON_SESSION_MS);
  const [triathlonIntroVisible, setTriathlonIntroVisible] = useState(false);

  const timerTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scoreRef = useRef(0);
  const totalRoundsRef = useRef(0);
  const yesRoundsRef = useRef(0);
  const triathlonScoreRef = useRef(0);
  const triathlonRoundMsRef = useRef(TRIATHLON_ROUND_MS_START);
  const triathlonRoundLimitSnapshotRef = useRef(TRIATHLON_ROUND_MS_START);
  const triathlonSessionStartRef = useRef(0);
  const triathlonCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const triathlonIntroTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const phaseRef = useRef<Phase>("idle");
  const rotationIdx = (roundNumber - 1 + BUTTON_ROTATION_COLORS.length) % BUTTON_ROTATION_COLORS.length;
  const noBgHex = INK_HEX_BY_NAME[BUTTON_ROTATION_COLORS[rotationIdx] as ColorName];
  const yesBgHex = INK_HEX_BY_NAME[BUTTON_ROTATION_COLORS[(rotationIdx + 1) % BUTTON_ROTATION_COLORS.length] as ColorName];
  const noBorderHex = INK_HEX_BY_NAME[BUTTON_ROTATION_COLORS[(rotationIdx + 2) % BUTTON_ROTATION_COLORS.length] as ColorName];
  const yesBorderHex = INK_HEX_BY_NAME[BUTTON_ROTATION_COLORS[(rotationIdx + 3) % BUTTON_ROTATION_COLORS.length] as ColorName];

  useEffect(() => {
    setHighScore(getHighScore(game.id));
  }, [game.id]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const clearRoundTimers = () => {
    if (timerTickRef.current) clearInterval(timerTickRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timerTickRef.current = null;
    timeoutRef.current = null;
  };

  const clearTriathlonCountdown = () => {
    if (triathlonCountdownRef.current) clearInterval(triathlonCountdownRef.current);
    triathlonCountdownRef.current = null;
  };

  const clearTriathlonIntroTimer = () => {
    if (triathlonIntroTimerRef.current) clearTimeout(triathlonIntroTimerRef.current);
    triathlonIntroTimerRef.current = null;
  };

  const clearAllPlayingTimers = () => {
    clearRoundTimers();
    clearTriathlonCountdown();
    clearTriathlonIntroTimer();
  };

  const endGame = useCallback(
    (rawScore: number) => {
      clearRoundTimers();
      const isNew = saveHighScore(game.id, rawScore);
      setIsNewBest(isNew);
      if (isNew) setHighScore(rawScore);
      setFinalScore(rawScore);
      setPhase("done");
      phaseRef.current = "done";
    },
    [game.id],
  );

  const endTriathlonSession = useCallback(() => {
    if (phaseRef.current === "done") return;
    clearAllPlayingTimers();
    const raw = triathlonScoreRef.current;
    const isNew = saveHighScore(game.id, raw);
    setIsNewBest(isNew);
    if (isNew) setHighScore(raw);
    setFinalScore(raw);
    setPhase("done");
    phaseRef.current = "done";
  }, [game.id]);

  function scheduleRound(nextRound: number) {
    const nextPrompt = createPrompt(totalRoundsRef.current, yesRoundsRef.current);
    if (nextPrompt.isYes) yesRoundsRef.current += 1;
    totalRoundsRef.current += 1;

    const nextLimitMs = isTriathlon ? triathlonRoundMsRef.current : getRoundTimeMs(nextRound);
    if (isTriathlon) {
      triathlonRoundLimitSnapshotRef.current = triathlonRoundMsRef.current;
    }

    setPrompt(nextPrompt);
    setRoundNumber(nextRound);
    setRoundTimeMs(nextLimitMs);
    setTimeLeftMs(nextLimitMs);

    const startedAt = performance.now();
    timerTickRef.current = setInterval(() => {
      const elapsed = performance.now() - startedAt;
      const remaining = Math.max(0, nextLimitMs - elapsed);
      setTimeLeftMs(remaining);
    }, 50);

    timeoutRef.current = setTimeout(() => {
      playBeep("fail");
      if (isTriathlon) {
        clearRoundTimers();
        triathlonRoundMsRef.current = Math.min(TRIATHLON_ROUND_MS_CEILING, triathlonRoundMsRef.current + TRIATHLON_ROUND_MS_ADJUST_MS);
        if (phaseRef.current === "playing") {
          scheduleRound(nextRound + 1);
        }
      } else {
        endGame(scoreRef.current);
      }
    }, nextLimitMs);
  }

  const startGame = () => {
    trackPlay(game.id);
    clearAllPlayingTimers();
    scoreRef.current = 0;
    totalRoundsRef.current = 0;
    yesRoundsRef.current = 0;
    setScore(0);
    setPhase("playing");
    phaseRef.current = "playing";

    if (isTriathlon) {
      triathlonScoreRef.current = 0;
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

    scheduleRound(1);
  };

  const answer = (userSaysYes: boolean) => {
    if (phase !== "playing") return;
    clearRoundTimers();

    if (userSaysYes === prompt.isYes) {
      playBeep("success");
      if (isTriathlon) {
        const pts = triathlonPointsForRoundMs(triathlonRoundLimitSnapshotRef.current);
        triathlonScoreRef.current += pts;
        setScore(triathlonScoreRef.current);
        triathlonRoundMsRef.current = Math.max(TRIATHLON_ROUND_MS_FLOOR, triathlonRoundMsRef.current - TRIATHLON_ROUND_MS_ADJUST_MS);
        scheduleRound(roundNumber + 1);
      } else {
        scoreRef.current += 1;
        setScore(scoreRef.current);
        scheduleRound(scoreRef.current + 1);
      }
      return;
    }

    playBeep("fail");
    if (isTriathlon) {
      triathlonRoundMsRef.current = Math.min(TRIATHLON_ROUND_MS_CEILING, triathlonRoundMsRef.current + TRIATHLON_ROUND_MS_ADJUST_MS);
      scheduleRound(roundNumber + 1);
    } else {
      endGame(scoreRef.current);
    }
  };

  useEffect(() => () => clearAllPlayingTimers(), []);

  const handleRetry = () => {
    if (shouldShowAd()) setShowAd(true);
    else afterAd();
  };

  const afterAd = () => {
    clearAllPlayingTimers();
    setShowAd(false);
    setPhase("idle");
    phaseRef.current = "idle";
    setIsNewBest(false);
    setTriathlonIntroVisible(false);
    setTriathlonTimeLeft(TRIATHLON_SESSION_MS);
  };

  const rank = getRank(finalScore, game);
  const percentile = getPercentile(finalScore, game);
  const normalized = normalizeScore(finalScore);
  const timerPct = roundTimeMs > 0 ? (timeLeftMs / roundTimeMs) * 100 : 0;

  if (phase === "done") {
    return (
      <CommonResult
        game={game}
        rawScore={finalScore}
        rawUnit="correct"
        normalizedScore={normalized}
        percentile={percentile}
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

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      {phase === "idle" ? (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xl)",
            padding: "clamp(28px,6vw,48px) clamp(20px,5vw,36px)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "clamp(40px,10vw,56px)", marginBottom: 16 }}>🎯</div>
          <h2 style={{ fontSize: "clamp(20px,5vw,28px)", fontWeight: 900, marginBottom: 10 }}>Color Conflict 2</h2>
          <p style={{ color: "var(--text-2)", fontSize: 14, lineHeight: 1.7, maxWidth: 420, margin: "0 auto 10px" }}>
            {isTriathlon
              ? "Top word gives the meaning. Bottom word gives the ink color. Triathlon: 30 seconds — faster rounds score more."
              : "Top word gives the meaning. Bottom word gives the ink color. Decide if they match. One mistake or timeout ends the run."}
          </p>
          <div style={{ marginBottom: 24 }} />
          <button
            onClick={startGame}
            className="pressable"
            style={{
              background: game.accent,
              color: "#000",
              border: "none",
              borderRadius: "var(--radius-md)",
              padding: "14px 34px",
              fontSize: 14,
              fontWeight: 900,
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
            }}
          >
            ▶ START
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {isTriathlon && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 8,
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(11px, 2.8vw, 12px)",
              }}
            >
              <span style={{ color: TRIATHLON_UI_ACCENT, fontWeight: 800 }}>{(triathlonTimeLeft / 1000).toFixed(1)}s left</span>
              <span style={{ color: TRIATHLON_UI_ACCENT, fontWeight: 800 }}>SCORE {score}</span>
            </div>
          )}
          {isTriathlon && (
            <div
              style={{
                textAlign: "center",
                fontSize: "clamp(10px, 2.6vw, 12px)",
                fontFamily: "var(--font-mono)",
                color: "var(--text-2)",
                opacity: triathlonIntroVisible ? 1 : 0,
                transition: "opacity 0.35s ease",
                maxHeight: triathlonIntroVisible ? 40 : 0,
                overflow: "hidden",
              }}
            >
              30 seconds. Score more with faster rounds.
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>COLOR CONFLICT 2</div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: isTriathlon ? TRIATHLON_UI_ACCENT : game.accent,
                fontWeight: 800,
              }}
            >
              {isTriathlon ? `ROUND ${roundNumber}` : `SCORE ${score}`}
            </div>
          </div>

          <div style={{ height: 5, borderRadius: 999, overflow: "hidden", background: "var(--bg-elevated)", marginBottom: 4 }}>
            <div
              style={{
                height: "100%",
                width: `${timerPct}%`,
                background: isTriathlon
                  ? timerPct > 45
                    ? TRIATHLON_UI_ACCENT
                    : timerPct > 20
                      ? "#f59e0b"
                      : "#ef4444"
                  : timerPct > 45
                    ? game.accent
                    : timerPct > 20
                      ? "#f59e0b"
                      : "#ef4444",
                transition: "width 0.05s linear",
              }}
            />
          </div>

          <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>MEANING</div>
          <div
            style={{
              background: "#141414",
              border: "1px solid var(--border-md)",
              borderRadius: "var(--radius-lg)",
              minHeight: 92,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                color: "#ffffff",
                fontSize: "clamp(30px,10vw,44px)",
                letterSpacing: "0.04em",
                fontWeight: 900,
                fontFamily: "var(--font-mono)",
              }}
            >
              {prompt.topMeaning}
            </span>
          </div>

          <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>COLOR</div>
          <div
            style={{
              background: "#1a1a1a",
              border: "1px solid var(--border-md)",
              borderRadius: "var(--radius-lg)",
              minHeight: 92,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                color: INK_HEX_BY_NAME[prompt.bottomInkName],
                fontSize: "clamp(30px,10vw,44px)",
                letterSpacing: "0.04em",
                fontWeight: 900,
                fontFamily: "var(--font-mono)",
                textShadow: prompt.bottomInkName === "WHITE" ? "0 0 2px rgba(0,0,0,0.9)" : "none",
              }}
            >
              {prompt.bottomWord}
            </span>
          </div>

          <p style={{ margin: "2px 0 6px", textAlign: "center", color: "var(--text-2)", fontSize: 14, fontWeight: 600 }}>
            Does the meaning match the ink color?
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button
              onClick={() => answer(false)}
              className="pressable"
              style={{
                minHeight: 54,
                borderRadius: "var(--radius-md)",
                border: `2px solid ${noBorderHex}`,
                background: noBgHex,
                color: contrastTextForHex(noBgHex),
                fontSize: 18,
                fontWeight: 900,
                fontFamily: "var(--font-mono)",
                cursor: "pointer",
              }}
            >
              NO
            </button>
            <button
              onClick={() => answer(true)}
              className="pressable"
              style={{
                minHeight: 54,
                borderRadius: "var(--radius-md)",
                border: `2px solid ${yesBorderHex}`,
                background: yesBgHex,
                color: contrastTextForHex(yesBgHex),
                fontSize: 18,
                fontWeight: 900,
                fontFamily: "var(--font-mono)",
                cursor: "pointer",
              }}
            >
              YES
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function ColorConflict2({ game, triathlonFromServer }: { game: GameData; triathlonFromServer?: boolean }) {
  return (
    <Suspense fallback={null}>
      <ColorConflict2Inner game={game} triathlonFromServer={triathlonFromServer} />
    </Suspense>
  );
}
