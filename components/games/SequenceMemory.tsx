"use client";

import { trackPlay } from "@/lib/tracking";

import { Suspense, useState, useRef, useCallback, useEffect } from "react";
import { useTriathlonMode } from "@/lib/useTriathlonMode";
import type { GameData } from "@/lib/types";
import { getHighScore, saveHighScore, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";
import CommonResult from "@/components/CommonResult";
import { normalizeTo100FromPercentile, resolveResultTone } from "@/lib/resultUtils";

const GRID_SIZE = 9;
const TRIATHLON_TRIALS = 15;
const TRIATHLON_START_LEN = 5;
const TRIATHLON_UI_ACCENT = "#4A7C59";

// Higher score = better (same as number memory)
function getSeqRank(score: number, game: GameData) {
  const ranks = [...game.stats.ranks].sort((a, b) => b.maxMs - a.maxMs);
  return ranks.find((r) => score >= r.maxMs) ?? ranks[ranks.length - 1];
}
function getSeqPercentile(score: number, game: GameData): number {
  const pts = game.stats.percentiles;
  if (score >= pts[0].ms) return pts[0].percentile;
  if (score <= pts[pts.length - 1].ms) return pts[pts.length - 1].percentile;
  for (let i = 0; i < pts.length - 1; i++) {
    if (score <= pts[i].ms && score >= pts[i + 1].ms) {
      const t = (pts[i].ms - score) / (pts[i].ms - pts[i + 1].ms);
      return pts[i].percentile - t * (pts[i].percentile - pts[i + 1].percentile);
    }
  }
  return 50;
}

type Phase = "idle" | "showing" | "input" | "correct" | "wrong" | "done";
type CorrectPulse = { idx: number; key: number } | null;

function SequenceMemoryInner({ game, triathlonFromServer }: { game: GameData; triathlonFromServer?: boolean }) {
  const isTriathlon = useTriathlonMode(triathlonFromServer);

  const [phase, setPhase] = useState<Phase>("idle");
  const [sequence, setSequence] = useState<number[]>([]);
  const [userSeq, setUserSeq] = useState<number[]>([]);
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const [wrongCell, setWrongCell] = useState<number | null>(null);
  const [correctPulse, setCorrectPulse] = useState<CorrectPulse>(null);
  const [tapFlashCells, setTapFlashCells] = useState<number[]>([]);
  const [finalScore, setFinalScore] = useState(0);
  const [showAd, setShowAd] = useState(false);
  const [highScore, setHS] = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapFlashTimeoutsRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const trialCountRef = useRef(0);
  const highestLevelRef = useRef(0);
  const [trialDisplay, setTrialDisplay] = useState(1);

  useEffect(() => {
    setHS(getHighScore(game.id));
  }, [game.id]);
  const clearT = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };
  const clearPulse = () => {
    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current);
  };
  const clearTapFlashTimers = () => {
    for (const key of Object.keys(tapFlashTimeoutsRef.current)) {
      clearTimeout(tapFlashTimeoutsRef.current[Number(key)]);
    }
    tapFlashTimeoutsRef.current = {};
  };
  useEffect(
    () => () => {
      clearT();
      clearPulse();
      clearTapFlashTimers();
    },
    [],
  );

  const getFlashMs = (level: number) => Math.max(150, 350 - level * 15);

  const playSequence = useCallback((seq: number[]) => {
    setPhase("showing");
    setUserSeq([]);
    setWrongCell(null);
    setCorrectPulse(null);
    setTapFlashCells([]);
    let i = 0;
    const flashNext = () => {
      if (i >= seq.length) {
        setHighlighted(null);
        timeoutRef.current = setTimeout(() => setPhase("input"), 200);
        return;
      }
      setHighlighted(null);
      timeoutRef.current = setTimeout(() => {
        setHighlighted(seq[i]);
        playBeep("tap");
        i++;
        timeoutRef.current = setTimeout(flashNext, getFlashMs(seq.length));
      }, 100);
    };
    timeoutRef.current = setTimeout(flashNext, 250);
  }, []);

  const resetToLevel = useCallback(
    (length: number) => {
      clearT();
      clearPulse();
      clearTapFlashTimers();
      const newSeq = Array.from({ length }, () => Math.floor(Math.random() * GRID_SIZE));
      setSequence(newSeq);
      setUserSeq([]);
      setWrongCell(null);
      setCorrectPulse(null);
      setTapFlashCells([]);
      playSequence(newSeq);
    },
    [playSequence],
  );

  const endTriathlonSession = useCallback(() => {
    const score = highestLevelRef.current;
    setFinalScore(score);
    const isNew = saveHighScore(game.id, score);
    setIsNewBest(isNew);
    if (isNew) setHS(score);
    timeoutRef.current = setTimeout(() => setPhase("done"), 1200);
  }, [game.id]);

  const startGame = useCallback(() => {
    if (isTriathlon) {
      trialCountRef.current = 0;
      highestLevelRef.current = 0;
      setTrialDisplay(1);
    }
    trackPlay(game.id);
    if (isTriathlon) {
      const seq = Array.from({ length: TRIATHLON_START_LEN }, () => Math.floor(Math.random() * GRID_SIZE));
      setSequence(seq);
      playSequence(seq);
      return;
    }
    const first = Math.floor(Math.random() * GRID_SIZE);
    const seq = [first];
    setSequence(seq);
    playSequence(seq);
  }, [playSequence, isTriathlon]);

  const handleCellClick = useCallback(
    (idx: number) => {
      if (phase !== "input") return;
      const next = [...userSeq, idx];
      const pos = next.length - 1;

      if (idx !== sequence[pos]) {
        setPhase("wrong");
        setWrongCell(idx);
        playBeep("fail");

        if (isTriathlon) {
          trialCountRef.current += 1;
          setTrialDisplay(Math.min(trialCountRef.current + 1, TRIATHLON_TRIALS));
          highestLevelRef.current = Math.max(highestLevelRef.current, sequence.length - 1);
          if (trialCountRef.current >= TRIATHLON_TRIALS) {
            endTriathlonSession();
            return;
          }
          clearT();
          const len = sequence.length;
          timeoutRef.current = setTimeout(() => {
            setWrongCell(null);
            resetToLevel(Math.max(1, len - 1));
          }, 800);
          return;
        }

        const score = sequence.length - 1;
        setFinalScore(score);
        const isNew = saveHighScore(game.id, score);
        setIsNewBest(isNew);
        if (isNew) setHS(score);
        timeoutRef.current = setTimeout(() => setPhase("done"), 1200);
        return;
      }

      playBeep("tap");
      setCorrectPulse({ idx, key: performance.now() });
      clearPulse();
      pulseTimeoutRef.current = setTimeout(() => setCorrectPulse(null), 220);
      setUserSeq(next);

      if (next.length === sequence.length) {
        if (isTriathlon) {
          trialCountRef.current += 1;
          setTrialDisplay(Math.min(trialCountRef.current + 1, TRIATHLON_TRIALS));
          highestLevelRef.current = Math.max(highestLevelRef.current, sequence.length);
          if (trialCountRef.current >= TRIATHLON_TRIALS) {
            endTriathlonSession();
            return;
          }
        }
        playBeep("success");
        const newSeq = [...sequence, Math.floor(Math.random() * GRID_SIZE)];
        setSequence(newSeq);
        setPhase("correct");
        timeoutRef.current = setTimeout(() => {
          setCorrectPulse(null);
          playSequence(newSeq);
        }, 325);
      }
    },
    [phase, userSeq, sequence, game.id, playSequence, isTriathlon, endTriathlonSession, resetToLevel],
  );

  const handleRetry = () => {
    if (shouldShowAd()) setShowAd(true);
    else afterAd();
  };
  const afterAd = () => {
    trialCountRef.current = 0;
    highestLevelRef.current = 0;
    setTrialDisplay(1);
    setShowAd(false);
    setPhase("idle");
    setSequence([]);
    setUserSeq([]);
    setHighlighted(null);
    setWrongCell(null);
    setCorrectPulse(null);
    setTapFlashCells([]);
    setFinalScore(0);
    setIsNewBest(false);
  };

  const rank = phase === "done" ? getSeqRank(finalScore, game) : null;
  const pct = phase === "done" ? getSeqPercentile(finalScore, game) : 0;

  if (phase === "done" && rank) {
    const normalized = normalizeTo100FromPercentile(pct, finalScore);
    return (
      <CommonResult
        game={game}
        rawScore={finalScore}
        rawUnit="steps"
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

  const getCellStyle = (idx: number) => {
    const isHighlighted = highlighted === idx;
    const isWrong = wrongCell === idx;
    const isCorrect = correctPulse?.idx === idx || tapFlashCells.includes(idx);
    let bg = "var(--bg-elevated)";
    let border = "var(--border)";
    let shadow = "none";

    if (isHighlighted) {
      bg = game.accent;
      border = game.accent;
      shadow = `0 0 24px ${game.accent}80`;
    } else if (isWrong) {
      bg = "#ef444430";
      border = "#ef4444";
      shadow = "0 0 20px #ef444460";
    } else if (isCorrect) {
      bg = `${game.accent}20`;
      border = `${game.accent}60`;
    }

    return {
      background: bg,
      border: `1.5px solid ${border}`,
      boxShadow: shadow,
      borderRadius: 10,
      aspectRatio: "1",
      cursor: phase === "input" ? "pointer" : "default",
      transition: "all 0.12s ease",
      WebkitTapHighlightColor: "transparent",
    } as React.CSSProperties;
  };

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}

      {phase !== "idle" && phase !== "done" && (
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>
              LEVEL {sequence.length}
            </div>
            <div style={{ display: "flex", gap: 3, flex: 1, justifyContent: "center", minWidth: 0 }}>
              {Array.from({ length: Math.min(sequence.length, 15) }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 16,
                    height: 3,
                    borderRadius: 2,
                    background: i < sequence.length - 1 ? game.accent : `${game.accent}40`,
                  }}
                />
              ))}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
              {phase === "showing" ? "WATCH" : phase === "input" ? `${userSeq.length}/${sequence.length}` : phase === "correct" ? "✓" : ""}
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          background: "var(--bg-card)",
          border: `1.5px solid ${phase === "wrong" ? "#ef444440" : phase === "correct" ? `${game.accent}40` : "var(--border)"}`,
          borderRadius: "var(--radius-xl)",
          padding: "clamp(24px,5vw,40px)",
          transition: "border-color 0.15s",
        }}
      >
        {phase === "idle" ? (
          <div className="anim-fade-up" style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: "clamp(40px,10vw,56px)", marginBottom: 20 }}>🔲</div>
            <p style={{ fontSize: "clamp(16px,3.5vw,19px)", fontWeight: 800, marginBottom: 8 }}>Sequential Pattern Recognition</p>
            <p style={{ fontSize: 13, color: "var(--text-2)", fontFamily: "var(--font-mono)", marginBottom: 28 }}>
              Watch the sequence · Repeat it back · Go as long as you can
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
                letterSpacing: "0.06em",
              }}
            >
              ▶ PLAY
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "clamp(8px,2vw,14px)", maxWidth: 320, margin: "0 auto" }}>
            {Array.from({ length: GRID_SIZE }).map((_, idx) => (
              <div
                key={idx}
                style={getCellStyle(idx)}
                onClick={() => handleCellClick(idx)}
                onPointerDown={() => {
                  if (phase !== "input") return;
                  setTapFlashCells((prev) => (prev.includes(idx) ? prev : [...prev, idx]));
                  const existing = tapFlashTimeoutsRef.current[idx];
                  if (existing) clearTimeout(existing);
                  tapFlashTimeoutsRef.current[idx] = setTimeout(() => {
                    setTapFlashCells((prev) => prev.filter((v) => v !== idx));
                    delete tapFlashTimeoutsRef.current[idx];
                  }, 170);
                }}
              />
            ))}
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
        {phase === "idle" && "3×3 GRID · SEQUENCE GROWS EACH ROUND"}
        {phase === "showing" && "MEMORIZE THE SEQUENCE"}
        {phase === "input" && "REPEAT THE SEQUENCE IN ORDER"}
        {phase === "correct" && "CORRECT · ADDING ONE MORE STEP"}
        {phase === "wrong" && "INCORRECT · CALCULATING RESULTS"}
      </div>
    </>
  );
}

export default function SequenceMemory({ game, triathlonFromServer }: { game: GameData; triathlonFromServer?: boolean }) {
  return (
    <Suspense fallback={null}>
      <SequenceMemoryInner game={game} triathlonFromServer={triathlonFromServer} />
    </Suspense>
  );
}
