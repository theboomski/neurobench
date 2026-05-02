"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTriathlonMode } from "@/lib/useTriathlonMode";
import { trackPlay } from "@/lib/tracking";
import type { GameData } from "@/lib/types";
import { getHighScore, saveHighScore, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";
import CommonResult from "@/components/CommonResult";
import { resolveResultTone } from "@/lib/resultUtils";

type Phase = "idle" | "playing" | "done";
type Dir = "up" | "down" | "left" | "right";

const ROUND_TIME_MS = 30_000;
const TRIATHLON_SESSION_MS = 60_000;
const TRIATHLON_UI_ACCENT = "#00FF94";
const FISH_COUNT = 10;
const SWIPE_THRESHOLD = 28;
const FISH_SPEED_PCT_PER_SEC = 34;
const ALL_DIRS: Dir[] = ["up", "down", "left", "right"];
type FishColor = "blue" | "purple";

type RoundState = {
  color: FishColor;
  movementDir: Dir;
  headDir: Dir;
};

type FishSprite = {
  lanePct: number;
  offsetPct: number;
  scale: number;
};

function randomDir(): Dir {
  return ALL_DIRS[Math.floor(Math.random() * ALL_DIRS.length)] as Dir;
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
  if (raw >= 40) return 100;
  return Math.round((raw / 40) * 100);
}

function resolveExpectedSwipe(round: RoundState): Dir {
  return round.color === "blue" ? round.movementDir : round.headDir;
}

function buildRound(): RoundState {
  return {
    color: Math.random() < 0.5 ? "blue" : "purple",
    movementDir: randomDir(),
    headDir: randomDir(),
  };
}

function buildFishSprites(): FishSprite[] {
  const laneMin = 14;
  const laneMax = 86;
  const laneStep = FISH_COUNT > 1 ? (laneMax - laneMin) / (FISH_COUNT - 1) : 0;
  const travelWindowPct = 140;
  const gapStep = travelWindowPct / FISH_COUNT;
  return Array.from({ length: FISH_COUNT }).map((_, i) => ({
    lanePct: laneMin + laneStep * i,
    offsetPct: i * gapStep,
    scale: 0.95,
  }));
}

function headRotation(dir: Dir): number {
  if (dir === "right") return 0;
  if (dir === "down") return 90;
  if (dir === "left") return 180;
  return -90;
}

function FishFrenzyInner({ game, triathlonFromServer }: { game: GameData; triathlonFromServer?: boolean }) {
  const isTriathlon = useTriathlonMode(triathlonFromServer);

  const [phase, setPhase] = useState<Phase>("idle");
  const [score, setScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [highScore, setHighScore] = useState<number | null>(null);
  const [showAd, setShowAd] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState(ROUND_TIME_MS);
  const [sessionTotalMs, setSessionTotalMs] = useState(ROUND_TIME_MS);
  const [triathlonIntroVisible, setTriathlonIntroVisible] = useState(false);
  const [round, setRound] = useState<RoundState>(() => buildRound());
  const [fishSprites, setFishSprites] = useState<FishSprite[]>(() => buildFishSprites());

  const gameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gameEndTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scoreRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const triathlonIntroTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sessionMs = isTriathlon ? TRIATHLON_SESSION_MS : ROUND_TIME_MS;

  const clearGameTimers = () => {
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    if (gameEndTimeoutRef.current) clearTimeout(gameEndTimeoutRef.current);
    gameTimerRef.current = null;
    gameEndTimeoutRef.current = null;
  };

  const clearTriathlonIntroTimer = () => {
    if (triathlonIntroTimerRef.current) clearTimeout(triathlonIntroTimerRef.current);
    triathlonIntroTimerRef.current = null;
  };

  useEffect(() => {
    setHighScore(getHighScore(game.id));
  }, [game.id]);

  useEffect(
    () => () => {
      clearGameTimers();
      clearTriathlonIntroTimer();
    },
    [],
  );

  const stopAndFinish = useCallback(() => {
    clearGameTimers();
    const raw = scoreRef.current;
    const isNew = saveHighScore(game.id, raw);
    setIsNewBest(isNew);
    if (isNew) setHighScore(raw);
    setFinalScore(raw);
    setPhase("done");
  }, [game.id]);

  const nextRound = useCallback(() => {
    setRound(buildRound());
    setFishSprites(buildFishSprites());
  }, []);

  const submitInput = useCallback(
    (dir: Dir) => {
      if (phase !== "playing") return;
      const expected = resolveExpectedSwipe(round);
      if (dir === expected) {
        playBeep("success");
        scoreRef.current += 1;
        setScore(scoreRef.current);
      } else {
        playBeep("tap");
        if (isTriathlon) {
          scoreRef.current = Math.max(0, scoreRef.current - 1);
          setScore(scoreRef.current);
        }
      }
      nextRound();
    },
    [phase, round, nextRound, isTriathlon],
  );

  const startGame = useCallback(() => {
    trackPlay(game.id);
    clearGameTimers();
    clearTriathlonIntroTimer();
    scoreRef.current = 0;
    setScore(0);
    setRound(buildRound());
    setFishSprites(buildFishSprites());
    const total = isTriathlon ? TRIATHLON_SESSION_MS : ROUND_TIME_MS;
    setSessionTotalMs(total);
    setTimeLeftMs(total);
    setPhase("playing");
    setIsNewBest(false);

    if (isTriathlon) {
      setTriathlonIntroVisible(true);
      triathlonIntroTimerRef.current = setTimeout(() => {
        setTriathlonIntroVisible(false);
        triathlonIntroTimerRef.current = null;
      }, 2500);
    }

    const startedAt = performance.now();
    gameTimerRef.current = setInterval(() => {
      const left = Math.max(0, total - (performance.now() - startedAt));
      setTimeLeftMs(left);
    }, 50);

    gameEndTimeoutRef.current = setTimeout(() => {
      stopAndFinish();
    }, total);
  }, [game.id, stopAndFinish, isTriathlon]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phase !== "playing") return;
      if (e.key === "ArrowUp") {
        e.preventDefault();
        submitInput("up");
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        submitInput("down");
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        submitInput("left");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        submitInput("right");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, submitInput]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== "playing") return;
    touchStartRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== "playing" || !touchStartRef.current) return;
    const dx = e.clientX - touchStartRef.current.x;
    const dy = e.clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;
    if (Math.abs(dx) > Math.abs(dy)) submitInput(dx > 0 ? "right" : "left");
    else submitInput(dy > 0 ? "down" : "up");
  };

  const handleRetry = () => {
    if (shouldShowAd()) setShowAd(true);
    else afterAd();
  };
  const afterAd = () => {
    clearGameTimers();
    clearTriathlonIntroTimer();
    setShowAd(false);
    setPhase("idle");
    setTriathlonIntroVisible(false);
    setScore(0);
    setFinalScore(0);
    setRound(buildRound());
    setFishSprites(buildFishSprites());
    setTimeLeftMs(sessionMs);
    setSessionTotalMs(sessionMs);
  };

  const rank = phase === "done" ? getRank(finalScore, game) : null;
  const percentile = phase === "done" ? getPercentile(finalScore, game) : 0;
  const normalized = normalizeScore(finalScore);

  const headDeg = useMemo(() => headRotation(round.headDir), [round.headDir]);
  const fishBody = round.color === "blue" ? "#3b82f6" : "#a855f7";
  const fishStroke = round.color === "blue" ? "#93c5fd" : "#d8b4fe";
  const timerPct = sessionTotalMs > 0 ? Math.max(0, (timeLeftMs / sessionTotalMs) * 100) : 0;
  const elapsedMs = Math.max(0, sessionTotalMs - timeLeftMs);

  const getTravelPositionPct = (fish: FishSprite) => {
    const travelWindowPct = 140;
    const travel = ((fish.offsetPct + (elapsedMs * FISH_SPEED_PCT_PER_SEC) / 1000) % travelWindowPct) - 20;
    if (round.movementDir === "right") return { xPct: travel, yPct: fish.lanePct };
    if (round.movementDir === "left") return { xPct: 100 - travel, yPct: fish.lanePct };
    if (round.movementDir === "down") return { xPct: fish.lanePct, yPct: travel };
    return { xPct: fish.lanePct, yPct: 100 - travel };
  };

  if (phase === "done" && rank) {
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
            padding: "clamp(30px,6vw,50px) clamp(20px,5vw,36px)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "clamp(40px,10vw,56px)", marginBottom: 16 }}>🐟</div>
          <h2 style={{ fontSize: "clamp(20px,5vw,30px)", fontWeight: 900, marginBottom: 8 }}>Fish Frenzy</h2>
          <p style={{ color: "var(--text-2)", fontSize: 14, lineHeight: 1.7, maxWidth: 460, margin: "0 auto 10px" }}>
            {isTriathlon
              ? "Blue fish: swipe where they move. Purple fish: swipe where their heads point. 60 seconds in triathlon — go as fast as you can."
              : "Blue fish: swipe where they move. Purple fish: swipe where their heads point. 30 seconds. Go as fast as you can."}
          </p>
          <p style={{ color: "var(--text-3)", fontSize: 12, fontFamily: "var(--font-mono)", marginBottom: 22 }}>
            Mobile swipe · Desktop arrows · Wrong is allowed, no penalty
          </p>
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
            ▶ PLAY
          </button>
        </div>
      ) : (
        <div
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-xl)",
            padding: "12px 10px 14px",
            minHeight: "min(78vh, 620px)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            userSelect: "none",
            touchAction: "none",
            position: "relative",
          }}
        >
          {isTriathlon && (
            <div
              style={{
                textAlign: "center",
                marginBottom: 4,
                fontSize: "clamp(10px, 2.6vw, 12px)",
                fontFamily: "var(--font-mono)",
                color: "var(--text-2)",
                lineHeight: 1.35,
                opacity: triathlonIntroVisible ? 1 : 0,
                transition: "opacity 0.35s ease",
                maxHeight: triathlonIntroVisible ? 48 : 0,
                overflow: "hidden",
              }}
            >
              60 seconds. Swipe the right direction.
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 4px", flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-2)" }}>
              TIME{" "}
              <span style={{ color: timerPct < 25 ? "#ef4444" : "var(--text-1)", fontWeight: 800 }}>
                {(timeLeftMs / 1000).toFixed(1)}s
              </span>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: game.accent, fontWeight: 900 }}>SCORE {score}</div>
          </div>

          <div style={{ height: 5, borderRadius: 999, overflow: "hidden", background: "var(--bg-elevated)" }}>
            <div
              style={{
                height: "100%",
                width: `${timerPct}%`,
                background: isTriathlon ? (timerPct > 45 ? TRIATHLON_UI_ACCENT : timerPct > 20 ? "#f59e0b" : "#ef4444") : timerPct > 45 ? game.accent : timerPct > 20 ? "#f59e0b" : "#ef4444",
                transition: "width 0.05s linear",
              }}
            />
          </div>

          <div
            style={{
              position: "relative",
              flex: 1,
              borderRadius: 14,
              border: "1px solid var(--border-md)",
              background: "linear-gradient(180deg, #0b1220 0%, #111827 100%)",
              overflow: "hidden",
            }}
          >
            {fishSprites.map((fish, i) => {
              const { xPct, yPct } = getTravelPositionPct(fish);
              return (
                <div
                  key={i}
                  style={{
                    position: "absolute",
                    left: `${xPct}%`,
                    top: `${yPct}%`,
                    transform: `translate(-50%, -50%) scale(${fish.scale}) rotate(${headDeg}deg)`,
                    transformOrigin: "center center",
                    transition: "none",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: 62,
                      height: 32,
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: 12,
                        top: 3,
                        width: 42,
                        height: 26,
                        borderRadius: "50% 45% 45% 50%",
                        background: fishBody,
                        border: `1.5px solid ${fishStroke}`,
                        boxShadow: `0 0 14px ${fishBody}66`,
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 8,
                        width: 0,
                        height: 0,
                        borderTop: "8px solid transparent",
                        borderBottom: "8px solid transparent",
                        borderRight: `14px solid ${fishBody}`,
                        filter: "brightness(0.88)",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        right: 9,
                        top: 11,
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#0b1220",
                        border: "1px solid rgba(255,255,255,0.55)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

export default function FishFrenzy({ game, triathlonFromServer }: { game: GameData; triathlonFromServer?: boolean }) {
  return (
    <Suspense fallback={null}>
      <FishFrenzyInner game={game} triathlonFromServer={triathlonFromServer} />
    </Suspense>
  );
}
