"use client";

import { trackPlay } from "@/lib/tracking";

import { Suspense, useState, useRef, useCallback, useEffect } from "react";
import { useTriathlonMode } from "@/lib/useTriathlonMode";
import type { GameData } from "@/lib/types";
import { getHighScore, saveHighScore, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";
import CommonResult from "@/components/CommonResult";
import { normalizeTo100FromPercentile, resolveResultTone } from "@/lib/resultUtils";

const TRIATHLON_TRIALS = 15;
const TRIATHLON_START_LEVEL = 5;
const TRIATHLON_UI_ACCENT = "#4A7C59";

function getMemoryRank(digits: number, game: GameData) {
  const ranks = [...game.stats.ranks].reverse();
  return ranks.find((r) => digits >= r.maxMs) ?? game.stats.ranks[game.stats.ranks.length - 1];
}
function getMemoryPercentile(digits: number, game: GameData): number {
  const pts = game.stats.percentiles;
  if (digits >= pts[0].ms) return pts[0].percentile;
  if (digits <= pts[pts.length - 1].ms) return pts[pts.length - 1].percentile;
  for (let i = 0; i < pts.length - 1; i++) {
    if (digits <= pts[i].ms && digits >= pts[i + 1].ms) {
      const t = (pts[i].ms - digits) / (pts[i].ms - pts[i + 1].ms);
      return Math.round(pts[i].percentile - t * (pts[i].percentile - pts[i + 1].percentile));
    }
  }
  return 50;
}

type Phase = "idle" | "showing" | "input" | "correct" | "wrong" | "done";

function generateSequence(length: number): string {
  let s = "";
  for (let i = 0; i < length; i++) {
    let d: number;
    do {
      d = Math.floor(Math.random() * 10);
    } while (i === 0 && d === 0);
    s += d;
  }
  return s;
}

function NumberMemoryInner({ game, triathlonFromServer }: { game: GameData; triathlonFromServer?: boolean }) {
  const isTriathlon = useTriathlonMode(triathlonFromServer);

  const [phase, setPhase] = useState<Phase>("idle");
  const [level, setLevel] = useState(1);
  const [sequence, setSequence] = useState("");
  const [input, setInput] = useState("");
  const [showAd, setShowAd] = useState(false);
  const [highScore, setHS] = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const trialCountRef = useRef(0);
  const highestLevelRef = useRef(0);
  const [trialDisplay, setTrialDisplay] = useState(1);

  useEffect(() => {
    setHS(getHighScore(game.id));
  }, [game.id]);

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };
  const clearRetryTimeout = () => {
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    retryTimeoutRef.current = null;
  };

  const startLevel = useCallback((lvl: number) => {
    const seq = generateSequence(lvl);
    setSequence(seq);
    setInput("");
    setPhase("showing");

    const displayMs = lvl * 600;
    const totalTicks = Math.ceil(displayMs / 100);
    let ticks = totalTicks;
    setTimeLeft(100);

    timerRef.current = setInterval(() => {
      ticks--;
      setTimeLeft(Math.round((ticks / totalTicks) * 100));
      if (ticks <= 0) {
        clearTimer();
        setPhase("input");
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    }, 100);
  }, []);

  useEffect(
    () => () => {
      clearTimer();
      clearRetryTimeout();
    },
    [],
  );

  const endTriathlonSession = useCallback(() => {
    clearTimer();
    clearRetryTimeout();
    const score = highestLevelRef.current;
    setFinalScore(score);
    const isNew = saveHighScore(game.id, score);
    setIsNewBest(isNew);
    if (isNew) setHS(score);
    retryTimeoutRef.current = setTimeout(() => setPhase("done"), 1200);
  }, [game.id]);

  const handleBegin = useCallback(() => {
    trackPlay(game.id);
    if (isTriathlon) {
      trialCountRef.current = 0;
      highestLevelRef.current = 0;
      setTrialDisplay(1);
      setLevel(TRIATHLON_START_LEVEL);
      startLevel(TRIATHLON_START_LEVEL);
    } else {
      setLevel(1);
      startLevel(1);
    }
  }, [startLevel, isTriathlon]);

  const handleSubmit = useCallback(() => {
    if (phase !== "input") return;

    if (input === sequence) {
      if (isTriathlon) {
        trialCountRef.current += 1;
        setTrialDisplay(Math.min(trialCountRef.current + 1, TRIATHLON_TRIALS));
        highestLevelRef.current = Math.max(highestLevelRef.current, level);
        if (trialCountRef.current >= TRIATHLON_TRIALS) {
          endTriathlonSession();
          return;
        }
        playBeep("success");
        setPhase("correct");
        const nextLevel = level + 1;
        clearTimer();
        clearRetryTimeout();
        retryTimeoutRef.current = setTimeout(() => {
          setLevel(nextLevel);
          startLevel(nextLevel);
        }, 900);
        return;
      }
      playBeep("success");
      setPhase("correct");
      setTimeout(() => startLevel(level + 1), 900);
      setLevel((l) => l + 1);
    } else {
      if (isTriathlon) {
        trialCountRef.current += 1;
        setTrialDisplay(Math.min(trialCountRef.current + 1, TRIATHLON_TRIALS));
        highestLevelRef.current = Math.max(highestLevelRef.current, level - 1);
        if (trialCountRef.current >= TRIATHLON_TRIALS) {
          endTriathlonSession();
          return;
        }
        playBeep("fail");
        clearTimer();
        clearRetryTimeout();
        setPhase("wrong");
        const nextLevel = Math.max(1, level - 1);
        retryTimeoutRef.current = setTimeout(() => {
          setLevel(nextLevel);
          startLevel(nextLevel);
        }, 800);
        return;
      }
      playBeep("fail");
      const score = level - 1 || 1;
      setFinalScore(score);
      const isNew = saveHighScore(game.id, score);
      setIsNewBest(isNew);
      if (isNew) setHS(score);
      setPhase("wrong");
      setTimeout(() => setPhase("done"), 1800);
    }
  }, [input, sequence, level, game.id, startLevel, phase, isTriathlon, endTriathlonSession]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (phase !== "input") return;
      if (e.key === "Enter") {
        handleSubmit();
        return;
      }
      if (e.key === "Backspace") {
        setInput((s) => s.slice(0, -1));
        return;
      }
      if (/^\d$/.test(e.key)) {
        setInput((s) => (s.length < sequence.length ? s + e.key : s));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, handleSubmit, sequence.length]);

  const handleKeypad = (key: string) => {
    if (phase !== "input") return;
    if (key === "⌫") {
      setInput((s) => s.slice(0, -1));
      return;
    }
    if (key === "✓") {
      handleSubmit();
      return;
    }
    if (input.length < sequence.length) {
      setInput((s) => s + key);
    }
  };

  const handleRetry = () => {
    if (shouldShowAd()) setShowAd(true);
    else afterAd();
  };
  const afterAd = () => {
    clearTimer();
    clearRetryTimeout();
    trialCountRef.current = 0;
    highestLevelRef.current = 0;
    setTrialDisplay(1);
    setShowAd(false);
    setPhase("idle");
    setLevel(1);
    setInput("");
    setSequence("");
    setIsNewBest(false);
  };

  const rank = phase === "done" ? getMemoryRank(finalScore, game) : null;
  const pct = phase === "done" ? getMemoryPercentile(finalScore, game) : 0;

  if (phase === "done" && rank) {
    const normalized = normalizeTo100FromPercentile(pct, finalScore);
    return (
      <CommonResult
        game={game}
        rawScore={finalScore}
        rawUnit="digits"
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

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "✓"];

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}

      {phase !== "idle" && (
        <div style={{ marginBottom: 14 }}>
          {isTriathlon && (
            <div
              style={{
                textAlign: "center",
                marginBottom: 8,
                fontSize: "clamp(11px, 2.8vw, 12px)",
                fontFamily: "var(--font-mono)",
                fontWeight: 800,
                letterSpacing: "0.06em",
                color: TRIATHLON_UI_ACCENT,
              }}
            >
              Trial {trialDisplay} / {TRIATHLON_TRIALS}
            </div>
          )}
          <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
          {Array.from({ length: Math.max(level, 3) }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 28,
                height: 3,
                borderRadius: 2,
                background: i < level - 1 ? game.accent : i === level - 1 ? `${game.accent}60` : "var(--bg-elevated)",
                transition: "background 0.3s",
              }}
            />
          ))}
          </div>
        </div>
      )}

      <div
        style={{
          background: "var(--bg-card)",
          border: `1.5px solid ${phase === "input" ? game.accent + "60" : phase === "correct" ? "#22c55e60" : phase === "wrong" ? "#ef444460" : "var(--border)"}`,
          borderRadius: "var(--radius-xl)",
          minHeight: "clamp(240px,42vw,320px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 24px",
          transition: "border-color 0.15s",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {phase === "idle" && (
          <div className="anim-fade-up" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "clamp(44px,11vw,64px)", marginBottom: 20 }}>🧠</div>
            <p style={{ fontSize: "clamp(16px,3.5vw,19px)", fontWeight: 800, marginBottom: 8, letterSpacing: "-0.01em" }}>
              Working Memory Capacity Assessment
            </p>
            <p style={{ fontSize: 13, color: "var(--text-2)", fontFamily: "var(--font-mono)", marginBottom: 28 }}>
              Memorize the sequence · Type it back · Go as long as you can
            </p>
            <button
              onClick={handleBegin}
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
              ▶ PLAY
            </button>
          </div>
        )}

        {phase === "showing" && (
          <div className="anim-scale-in" style={{ textAlign: "center", width: "100%" }}>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-3)",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Level {level} · Memorize
            </div>
            <div
              style={{
                width: "80%",
                maxWidth: 320,
                height: 2,
                background: "var(--bg-elevated)",
                borderRadius: 1,
                margin: "0 auto 24px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${timeLeft}%`,
                  background: game.accent,
                  borderRadius: 1,
                  transition: "width 0.1s linear",
                }}
              />
            </div>
            <div
              style={{
                fontSize: `clamp(${Math.max(24, 56 - level * 3)}px, ${Math.max(6, 12 - level * 0.5)}vw, ${Math.max(32, 72 - level * 4)}px)`,
                fontWeight: 900,
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.18em",
                color: "var(--text-1)",
                wordBreak: "break-all",
                textAlign: "center",
                padding: "0 16px",
              }}
            >
              {sequence}
            </div>
          </div>
        )}

        {phase === "input" && (
          <div style={{ textAlign: "center", width: "100%" }}>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-3)",
                fontFamily: "var(--font-mono)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 16,
              }}
            >
              Level {level} · What was the number?
            </div>

            <input
              ref={inputRef}
              type="tel"
              value={input}
              onChange={() => {}}
              style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
            />

            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 24, padding: "0 8px" }}>
              {sequence.split("").map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: "clamp(32px, 8vw, 48px)",
                    height: "clamp(40px, 9vw, 56px)",
                    borderRadius: 8,
                    background: i < input.length ? `${game.accent}18` : "var(--bg-elevated)",
                    border: `1.5px solid ${i < input.length ? game.accent + "60" : i === input.length ? game.accent : "var(--border)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "clamp(16px,4vw,22px)",
                    fontWeight: 900,
                    fontFamily: "var(--font-mono)",
                    color: i < input.length ? "var(--text-1)" : "transparent",
                    transition: "all 0.1s",
                  }}
                >
                  {input[i] ?? ""}
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, maxWidth: 240, margin: "0 auto" }}>
              {keys.map((k) => (
                <button
                  key={k}
                  onClick={() => handleKeypad(k)}
                  className="pressable"
                  style={{
                    background: k === "✓" ? game.accent : k === "⌫" ? "var(--bg-elevated)" : "var(--bg-elevated)",
                    color: k === "✓" ? "#000" : "var(--text-1)",
                    border: `1px solid ${k === "✓" ? "transparent" : "var(--border)"}`,
                    borderRadius: "var(--radius-md)",
                    padding: "14px 0",
                    fontSize: k === "✓" || k === "⌫" ? 18 : 20,
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    cursor: "pointer",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        )}

        {phase === "correct" && (
          <div className="anim-scale-in" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <p style={{ fontSize: 20, fontWeight: 800, color: "#22c55e", fontFamily: "var(--font-mono)" }}>CORRECT</p>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 8, fontFamily: "var(--font-mono)" }}>
              Level {level} incoming...
            </p>
          </div>
        )}

        {phase === "wrong" && (
          <div className="anim-shake" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
            <p style={{ fontSize: 18, fontWeight: 800, color: "#ef4444", marginBottom: 8, fontFamily: "var(--font-mono)" }}>
              INCORRECT
            </p>
            <p style={{ fontSize: 13, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
              Answer was:{" "}
              <span style={{ color: "var(--text-1)", letterSpacing: "0.15em" }}>{sequence}</span>
            </p>
          </div>
        )}
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
        {phase === "idle" && "WORLD AVERAGE: 7 DIGITS (MILLER'S LAW)"}
        {phase === "showing" && `LEVEL ${level} · ${level} DIGIT${level > 1 ? "S" : ""} · MEMORIZE NOW`}
        {phase === "input" && `TYPE THE ${level}-DIGIT SEQUENCE · PRESS ✓ TO CONFIRM`}
        {phase === "correct" && "CORRECT · NEXT LEVEL LOADING"}
        {phase === "wrong" && "PROTOCOL TERMINATED · CALCULATING RESULTS"}
      </div>
    </>
  );
}

export default function NumberMemory({ game, triathlonFromServer }: { game: GameData; triathlonFromServer?: boolean }) {
  return (
    <Suspense fallback={null}>
      <NumberMemoryInner game={game} triathlonFromServer={triathlonFromServer} />
    </Suspense>
  );
}
