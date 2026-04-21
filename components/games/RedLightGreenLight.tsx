"use client";

import { trackPlay } from "@/lib/tracking";

import { useState, useRef, useCallback, useEffect } from "react";
import type { GameData } from "@/lib/types";
import { getHighScore, saveHighScore, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";
import CommonResult from "@/components/CommonResult";
import { normalizeTo100FromPercentile, resolveResultTone } from "@/lib/resultUtils";

const FINISH_PCT = 92;
const STEP_PCT = 4;
const ROUND_WALL_MS = 50_000;
const CLOSE_CALL_MS = 150;
const FAKE_FLASH_MS = 180;

type Phase = "idle" | "playing" | "eliminated_overlay" | "done";

type RoundNum = 1 | 2 | 3;

type RoundCfg = { greenMin: number; greenMax: number; redMin: number; redMax: number; fakeChance: number };

const ROUND_CFG: Record<RoundNum, RoundCfg> = {
  1: { greenMin: 2000, greenMax: 4000, redMin: 1500, redMax: 3000, fakeChance: 0 },
  2: { greenMin: 1500, greenMax: 3000, redMin: 1000, redMax: 2000, fakeChance: 0.2 },
  3: { greenMin: 1000, greenMax: 2500, redMin: 800, redMax: 1500, fakeChance: 0.35 },
};

function randInt(a: number, b: number) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function getRank(score: number, game: GameData) {
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

function outcomeCopy(roundsCleared: number): string {
  if (roundsCleared <= 0) return "Eliminated immediately 💀 The doll didn't even blink";
  if (roundsCleared === 1) return "Round 1 was your last 😬 She saw you move";
  if (roundsCleared === 2) return "So close... the doll always wins 😤";
  return "You escaped! 🦑 Squid Game could never";
}

function computeScore(roundsCleared: number, roundDurationsMs: number[], closeCalls: number): number {
  let s = 0;
  for (let i = 0; i < roundsCleared; i++) {
    const d = roundDurationsMs[i] ?? ROUND_WALL_MS;
    const bonus = Math.min(233, Math.max(0, Math.floor((ROUND_WALL_MS - d) / 180)));
    s += 100 + bonus;
  }
  s -= closeCalls * 20;
  return Math.max(0, Math.min(1000, s));
}

function TrafficLamp({ light }: { light: "green" | "red" }) {
  const redOn = light === "red";
  const greenOn = light === "green";
  return (
    <div
      className="flex flex-col gap-1.5 rounded-lg border border-[var(--border)] bg-[#0f0f12] px-2 py-2 shadow-inner"
      style={{ flexShrink: 0 }}
    >
      <div
        className="h-[22px] w-[22px] rounded-full sm:h-[26px] sm:w-[26px]"
        style={{
          background: redOn ? "#ef4444" : "#3f1720",
          boxShadow: redOn ? "0 0 16px rgba(239,68,68,0.85)" : "none",
          opacity: redOn ? 1 : 0.45,
        }}
      />
      <div
        className="h-[22px] w-[22px] rounded-full sm:h-[26px] sm:w-[26px]"
        style={{ background: "#2a2510", opacity: 0.35 }}
        aria-hidden
      />
      <div
        className="h-[22px] w-[22px] rounded-full sm:h-[26px] sm:w-[26px]"
        style={{
          background: greenOn ? "#22c55e" : "#14321e",
          boxShadow: greenOn ? "0 0 16px rgba(34,197,94,0.85)" : "none",
          opacity: greenOn ? 1 : 0.45,
        }}
      />
    </div>
  );
}

export default function RedLightGreenLight({ game }: { game: GameData }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [currentRound, setCurrentRound] = useState(1);
  const [playerPct, setPlayerPct] = useState(0);
  const [dollFacingToward, setDollFacingToward] = useState(false);
  const [redFlash, setRedFlash] = useState(0);
  const [lightUi, setLightUi] = useState<"green" | "red">("green");
  const [showAd, setShowAd] = useState(false);
  const [highScore, setHS] = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [eliminationRound, setEliminationRound] = useState(1);
  const [roundsCleared, setRoundsCleared] = useState(0);

  const lightInputRef = useRef<"green" | "red">("green");
  const cycleGenRef = useRef(0);
  const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const playerPctRef = useRef(0);
  const roundStartRef = useRef(0);
  const roundDurationsRef = useRef<number[]>([]);
  const closeCallsRef = useRef(0);
  const lastTapRef = useRef(0);
  const roundDeadlineRef = useRef(0);
  const rafWallRef = useRef<number>(0);
  const playAreaRef = useRef<HTMLDivElement>(null);
  const roundRef = useRef<RoundNum>(1);
  const isPlayingRef = useRef(false);

  useEffect(() => { setHS(getHighScore(game.id)); }, [game.id]);
  useEffect(() => {
    isPlayingRef.current = phase === "playing";
  }, [phase]);

  const clearScheduled = useCallback(() => {
    cycleGenRef.current++;
    timeoutIdsRef.current.forEach(clearTimeout);
    timeoutIdsRef.current = [];
  }, []);

  const flashRedScreen = useCallback(() => {
    setRedFlash(0.55);
    setTimeout(() => setRedFlash(0), 120);
  }, []);

  const setLight = useCallback((c: "green" | "red") => {
    lightInputRef.current = c;
    setLightUi(c);
  }, []);

  const scheduleGreenWindow = useCallback(() => {
    const gen = cycleGenRef.current;
    const r = roundRef.current;
    const cfg = ROUND_CFG[r];
    const greenMs = randInt(cfg.greenMin, cfg.greenMax);
    setLight("green");
    setDollFacingToward(false);

    const t = setTimeout(() => {
      if (gen !== cycleGenRef.current) return;
      const cfg2 = ROUND_CFG[roundRef.current];
      const doRed = () => {
        if (gen !== cycleGenRef.current) return;
        const now = performance.now();
        if (lastTapRef.current > 0 && now - lastTapRef.current < CLOSE_CALL_MS) {
          closeCallsRef.current += 1;
        }
        setLight("red");
        setDollFacingToward(true);
        flashRedScreen();
        const redMs = randInt(cfg2.redMin, cfg2.redMax);
        const tRed = setTimeout(() => {
          if (gen !== cycleGenRef.current) return;
          setLight("green");
          setDollFacingToward(false);
          scheduleGreenWindow();
        }, redMs);
        timeoutIdsRef.current.push(tRed);
      };

      if (Math.random() < cfg2.fakeChance) {
        setDollFacingToward(true);
        const tFake = setTimeout(() => {
          if (gen !== cycleGenRef.current) return;
          setDollFacingToward(false);
          const tAfter = setTimeout(() => {
            if (gen !== cycleGenRef.current) return;
            doRed();
          }, 40);
          timeoutIdsRef.current.push(tAfter);
        }, FAKE_FLASH_MS);
        timeoutIdsRef.current.push(tFake);
      } else {
        doRed();
      }
    }, greenMs);
    timeoutIdsRef.current.push(t);
  }, [flashRedScreen, setLight]);

  const finishGameWin = useCallback(() => {
    clearScheduled();
    const score = computeScore(3, roundDurationsRef.current, closeCallsRef.current);
    setFinalScore(score);
    const isNew = saveHighScore(game.id, score);
    setIsNewBest(isNew);
    if (isNew) setHS(score);
    setRoundsCleared(3);
    setPhase("done");
    playBeep("success");
  }, [clearScheduled, game.id]);

  const eliminate = useCallback(
    (round: number, reason: "red" | "timeout") => {
      clearScheduled();
      setLight("red");
      setDollFacingToward(true);
      flashRedScreen();
      setEliminationRound(round);
      const cleared = reason === "timeout" ? Math.max(0, round - 1) : Math.max(0, round - 1);
      setRoundsCleared(cleared);
      const score = computeScore(cleared, roundDurationsRef.current.slice(0, cleared), closeCallsRef.current);
      setFinalScore(score);
      setPhase("eliminated_overlay");
      playBeep("fail");
      setTimeout(() => {
        const isNew = saveHighScore(game.id, score);
        setIsNewBest(isNew);
        if (isNew) setHS(score);
        setPhase("done");
      }, 1600);
    },
    [clearScheduled, flashRedScreen, game.id, setLight],
  );

  const winRoundAdvance = useCallback(() => {
    clearScheduled();
    const r = roundRef.current;
    const elapsed = performance.now() - roundStartRef.current;
    roundDurationsRef.current[r - 1] = elapsed;
    if (r >= 3) {
      finishGameWin();
      return;
    }
    const next = (r + 1) as RoundNum;
    roundRef.current = next;
    setCurrentRound(next);
    setPlayerPct(0);
    playerPctRef.current = 0;
    roundStartRef.current = performance.now();
    roundDeadlineRef.current = performance.now() + ROUND_WALL_MS;
    setLight("green");
    setDollFacingToward(false);
    scheduleGreenWindow();
  }, [clearScheduled, finishGameWin, scheduleGreenWindow, setLight]);

  const beginGame = useCallback(() => {
    trackPlay(game.id);
    clearScheduled();
    roundRef.current = 1;
    setCurrentRound(1);
    setPhase("playing");
    setPlayerPct(0);
    playerPctRef.current = 0;
    roundDurationsRef.current = [];
    closeCallsRef.current = 0;
    lastTapRef.current = 0;
    roundStartRef.current = performance.now();
    roundDeadlineRef.current = performance.now() + ROUND_WALL_MS;
    setLight("green");
    setDollFacingToward(false);
    scheduleGreenWindow();
  }, [clearScheduled, scheduleGreenWindow, setLight]);

  useEffect(() => {
    if (phase !== "playing") return;
    const tick = () => {
      if (!isPlayingRef.current) return;
      if (performance.now() > roundDeadlineRef.current) {
        eliminate(roundRef.current, "timeout");
        return;
      }
      rafWallRef.current = requestAnimationFrame(tick);
    };
    rafWallRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafWallRef.current) cancelAnimationFrame(rafWallRef.current);
    };
  }, [phase, eliminate]);

  useEffect(() => {
    const el = playAreaRef.current;
    if (!el || phase !== "playing") return;
    const down = (ev: Event) => {
      if (!isPlayingRef.current) return;
      ev.preventDefault();
      if (lightInputRef.current === "red") {
        eliminate(roundRef.current, "red");
        return;
      }
      lastTapRef.current = performance.now();
      const next = Math.min(FINISH_PCT, playerPctRef.current + STEP_PCT);
      playerPctRef.current = next;
      setPlayerPct(next);
      playBeep("tap");
      if (next >= FINISH_PCT) {
        winRoundAdvance();
      }
    };
    el.addEventListener("mousedown", down, { passive: false });
    el.addEventListener("touchstart", down, { passive: false });
    return () => {
      el.removeEventListener("mousedown", down);
      el.removeEventListener("touchstart", down);
    };
  }, [phase, eliminate, winRoundAdvance]);

  const handleRetry = () => {
    if (shouldShowAd()) setShowAd(true);
    else afterAd();
  };
  const afterAd = () => {
    clearScheduled();
    if (rafWallRef.current) cancelAnimationFrame(rafWallRef.current);
    setShowAd(false);
    setPhase("idle");
    setIsNewBest(false);
    setPlayerPct(0);
    playerPctRef.current = 0;
    roundRef.current = 1;
    setCurrentRound(1);
  };

  const rank = getRank(finalScore, game);
  const pct = getPercentile(finalScore, game);
  const normalized = normalizeTo100FromPercentile(pct, finalScore);
  const viral = outcomeCopy(roundsCleared);
  const shareLink = `https://zazaza.app/${game.category}/${game.id}`;
  const shareTextOverride = `I scored ${finalScore}/1000 in ${game.title}. ${viral} ${shareLink}`;

  if (phase === "done") {
    return (
      <CommonResult
        game={game}
        rawScore={finalScore}
        rawUnit="/1000"
        normalizedScore={normalized}
        percentile={pct}
        rank={rank}
        highScore={highScore}
        isNewBest={isNewBest}
        showAd={showAd}
        onAdDone={afterAd}
        onRetry={handleRetry}
        tone={resolveResultTone(game)}
        killerLineOverride={viral}
        shareTextOverride={shareTextOverride}
      />
    );
  }

  /** Green = doll not watching (silhouette); red = facing player. */
  const dollEmoji = dollFacingToward ? "👧" : "👤";

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      {phase === "idle" && (
        <>
          <div
            style={{
              background: "var(--bg-card)",
              border: "1.5px solid var(--border)",
              borderRadius: "var(--radius-xl)",
              minHeight: "clamp(280px, 48vw, 360px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "32px 24px",
              userSelect: "none",
            }}
          >
            <div className="anim-fade-up" style={{ textAlign: "center" }}>
              <div style={{ fontSize: "clamp(40px, 10vw, 60px)", marginBottom: 20 }}>{game.emoji}</div>
              <p style={{ fontSize: "clamp(17px, 3.5vw, 20px)", fontWeight: 800, letterSpacing: "-0.01em", marginBottom: 10 }}>Initiate Survival Protocol</p>
              <p style={{ fontSize: "clamp(12px, 2.5vw, 14px)", color: "var(--text-2)", fontFamily: "var(--font-mono)", marginBottom: 10, lineHeight: 1.55, maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
                {game.shortDescription}
              </p>
              <p style={{ fontSize: "clamp(11px, 2.2vw, 13px)", color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 28, lineHeight: 1.55, maxWidth: 440, marginLeft: "auto", marginRight: "auto" }}>
                3 rounds · tap the zone on <span style={{ color: "#22c55e", fontWeight: 700 }}>GREEN</span> only · hands off on{" "}
                <span style={{ color: "#ef4444", fontWeight: 700 }}>RED</span> · fake turns later
              </p>
              <button
                type="button"
                onClick={beginGame}
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
                  letterSpacing: "0.06em",
                }}
              >
                ▶ INITIATE
              </button>
            </div>
          </div>
          <div
            style={{
              textAlign: "center",
              marginTop: 10,
              fontSize: 11,
              color: "var(--text-3)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.06em",
            }}
          >
            TAP TO ADVANCE ON GREEN — FREEZE ON RED
          </div>
        </>
      )}

      {(phase === "playing" || phase === "eliminated_overlay") && (
        <>
          <div className="relative w-full max-w-full select-none" style={{ margin: "0 auto" }}>
            <div
              ref={playAreaRef}
              role="application"
              aria-label="Red light green light tap zone"
              className="relative touch-manipulation overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]"
              style={{ height: "min(72vh, 520px)", width: "100%", userSelect: "none", marginLeft: "auto", marginRight: "auto" }}
            >
              <div
                className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-100"
                style={{ background: "#7f1d1d", opacity: redFlash }}
              />
              {phase === "eliminated_overlay" && (
                <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 px-4 text-center">
                  <div className="text-4xl font-black tracking-tight text-red-500 sm:text-5xl">ELIMINATED</div>
                  <div className="mt-3 font-mono text-sm text-[var(--text-2)]">Round {eliminationRound}</div>
                </div>
              )}

              <div
                className="pointer-events-none absolute left-0 right-0 top-[4%] z-[6] flex justify-center gap-3 sm:gap-4"
                style={{ alignItems: "flex-start" }}
              >
                <TrafficLamp light={lightUi} />
                <div className="flex flex-col items-center">
                  <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)]">🏁 Finish</div>
                  <div className="text-3xl leading-none">🏁</div>
                  <div className="mt-2 text-7xl leading-none transition-opacity duration-75 sm:mt-3 sm:text-8xl" style={{ opacity: phase === "eliminated_overlay" ? 0.35 : 1 }}>
                    {dollEmoji}
                  </div>
                </div>
              </div>

              <div
                className="absolute left-1/2 z-[4] text-5xl transition-[bottom] duration-150 ease-out sm:text-6xl"
                style={{ bottom: `${playerPct}%`, transform: "translateX(-50%)" }}
              >
                🏃
              </div>

              <div className="pointer-events-none absolute bottom-3 left-0 right-0 px-3 text-center font-mono text-[10px] tracking-wide text-[var(--text-3)]">
                ROUND {currentRound}/3
              </div>
            </div>
          </div>
          <div
            style={{
              textAlign: "center",
              marginTop: 10,
              fontSize: 11,
              color: "var(--text-3)",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.06em",
            }}
          >
            TAP THE ZONE ON GREEN — MOUSE / TOUCH
          </div>
        </>
      )}
    </>
  );
}
