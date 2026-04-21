"use client";

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

  const dollTransform = dollFacingToward ? "scaleX(1)" : "scaleX(-1)";

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      {phase === "idle" && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center sm:p-10">
          <div className="mb-4 text-5xl sm:text-6xl">🦑</div>
          <h2 className="mb-2 text-lg font-extrabold tracking-tight sm:text-xl">{game.title}</h2>
          <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-[var(--text-2)]">{game.shortDescription}</p>
          <p className="mx-auto mb-6 max-w-md text-xs leading-relaxed text-[var(--text-3)] font-mono">
            3 rounds. Tap to move up on <span className="font-bold text-emerald-400">green</span>. On <span className="font-bold text-red-400">red</span>, do not touch the screen. Fake turns in later rounds.
          </p>
          <button
            type="button"
            onClick={beginGame}
            className="pressable rounded-md px-9 py-3.5 font-mono text-sm font-extrabold"
            style={{ background: game.accent, color: "#000" }}
          >
            ▶ BEGIN
          </button>
        </div>
      )}

      {(phase === "playing" || phase === "eliminated_overlay") && (
        <div className="relative mx-auto w-full max-w-md select-none">
          <div
            ref={playAreaRef}
            role="application"
            aria-label="Red light green light tap zone"
            className="relative touch-manipulation overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)]"
            style={{ height: "min(72vh, 520px)", userSelect: "none" }}
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

            <div className="absolute left-0 right-0 top-[6%] flex flex-col items-center">
              <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)]">🏁 Finish</div>
              <div className="text-3xl leading-none">🏁</div>
            </div>

            <div
              className="absolute left-1/2 top-[14%] z-[5] text-7xl leading-none transition-transform duration-75 sm:text-8xl"
              style={{ transform: `translateX(-50%) ${dollTransform}` }}
            >
              👧
            </div>

            <div
              className="absolute left-1/2 z-[4] text-5xl transition-[bottom] duration-150 ease-out sm:text-6xl"
              style={{ bottom: `${playerPct}%`, transform: "translateX(-50%)" }}
            >
              🏃
            </div>

            <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-between px-3 font-mono text-[10px] text-[var(--text-3)]">
              <span>ROUND {currentRound}/3</span>
              <span className={lightUi === "green" ? "text-emerald-400" : "text-red-500"}>{lightUi === "green" ? "GREEN" : "RED"}</span>
            </div>
          </div>
          <p className="mt-2 text-center font-mono text-[10px] text-[var(--text-3)]">Tap the play area to move · mousedown / touchstart</p>
        </div>
      )}
    </>
  );
}
