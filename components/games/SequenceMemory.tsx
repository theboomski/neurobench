"use client";

import { trackPlay } from "@/lib/tracking";

import { useState, useRef, useCallback, useEffect } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { getHighScore, saveHighScore, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";
import CommonResult from "@/components/CommonResult";
import { normalizeTo100FromPercentile, resolveResultTone } from "@/lib/resultUtils";

const t = dict.en;
const GRID_SIZE = 9;

// Higher score = better (same as number memory)
function getSeqRank(score: number, game: GameData) {
  const ranks = [...game.stats.ranks].sort((a, b) => b.maxMs - a.maxMs);
  return ranks.find(r => score >= r.maxMs) ?? ranks[ranks.length - 1];
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

export default function SequenceMemory({ game }: { game: GameData }) {
  const [phase, setPhase]           = useState<Phase>("idle");
  const [sequence, setSequence]     = useState<number[]>([]);
  const [userSeq, setUserSeq]       = useState<number[]>([]);
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const [wrongCell, setWrongCell]   = useState<number | null>(null);
  const [correctCells, setCorrectCells] = useState<number[]>([]);
  const [finalScore, setFinalScore] = useState(0);
  const [showAd, setShowAd]         = useState(false);
  const [highScore, setHS]          = useState<number | null>(null);
  const [isNewBest, setIsNewBest]   = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setHS(getHighScore(game.id)); }, [game.id]);
  const clearT = () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  useEffect(() => () => clearT(), []);

  // 2x faster than previous sequence playback
  const getFlashMs = (level: number) => Math.max(150, 350 - level * 15);

  const playSequence = useCallback((seq: number[]) => {
    setPhase("showing");
    setUserSeq([]);
    setWrongCell(null);
    setCorrectCells([]);
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

  const startGame = useCallback(() => {
    trackPlay(game.id);
    const first = Math.floor(Math.random() * GRID_SIZE);
    const seq = [first];
    setSequence(seq);
    playSequence(seq);
  }, [playSequence]);

  const handleCellClick = useCallback((idx: number) => {
    if (phase !== "input") return;
    const next = [...userSeq, idx];
    const pos = next.length - 1;

    if (idx !== sequence[pos]) {
      // Wrong
      setPhase("wrong");
      setWrongCell(idx);
      playBeep("fail");
      const score = sequence.length - 1;
      setFinalScore(score);
      const isNew = saveHighScore(game.id, score);
      setIsNewBest(isNew);
      if (isNew) setHS(score);
      timeoutRef.current = setTimeout(() => setPhase("done"), 1200);
      return;
    }

    // Correct so far — flash briefly then clear
    playBeep("tap");
    setCorrectCells([idx]);
    timeoutRef.current = setTimeout(() => setCorrectCells([]), 400);
    setUserSeq(next);

    if (next.length === sequence.length) {
      // Full sequence correct
      playBeep("success");
      const newSeq = [
        ...sequence,
        Math.floor(Math.random() * GRID_SIZE),
      ];
      setSequence(newSeq);
      setPhase("correct");
      // Keep the last tap visibly confirmed before the next round starts.
      timeoutRef.current = setTimeout(() => {
        setCorrectCells([]);
        playSequence(newSeq);
      }, 325);
    }
  }, [phase, userSeq, sequence, game.id, playSequence]);

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => {
    setShowAd(false); setPhase("idle"); setSequence([]); setUserSeq([]);
    setHighlighted(null); setWrongCell(null); setCorrectCells([]);
    setFinalScore(0); setIsNewBest(false);
  };

  const rank = phase === "done" ? getSeqRank(finalScore, game) : null;
  const pct  = phase === "done" ? getSeqPercentile(finalScore, game) : 0;

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
      />
    );
  }

  // ── GRID ─────────────────────────────────────────────────────────────────────
  const getCellStyle = (idx: number) => {
    const isHighlighted = highlighted === idx;
    const isWrong       = wrongCell === idx;
    const isCorrect     = correctCells.includes(idx);
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

      {/* Level bar */}
      {phase !== "idle" && phase !== "done" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>
            LEVEL {sequence.length}
          </div>
          <div style={{ display: "flex", gap: 3 }}>
            {Array.from({ length: Math.min(sequence.length, 15) }).map((_, i) => (
              <div key={i} style={{ width: 16, height: 3, borderRadius: 2, background: i < sequence.length - 1 ? game.accent : `${game.accent}40` }} />
            ))}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
            {phase === "showing" ? "WATCH" : phase === "input" ? `${userSeq.length}/${sequence.length}` : phase === "correct" ? "✓" : ""}
          </div>
        </div>
      )}

      {/* Main area */}
      <div style={{ background: "var(--bg-card)", border: `1.5px solid ${phase === "wrong" ? "#ef444440" : phase === "correct" ? `${game.accent}40` : "var(--border)"}`, borderRadius: "var(--radius-xl)", padding: "clamp(24px,5vw,40px)", transition: "border-color 0.15s" }}>

        {phase === "idle" ? (
          <div className="anim-fade-up" style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: "clamp(40px,10vw,56px)", marginBottom: 20 }}>🔲</div>
            <p style={{ fontSize: "clamp(16px,3.5vw,19px)", fontWeight: 800, marginBottom: 8 }}>Sequential Pattern Recognition</p>
            <p style={{ fontSize: 13, color: "var(--text-2)", fontFamily: "var(--font-mono)", marginBottom: 28 }}>Watch the sequence · Repeat it back · Go as long as you can</p>
            <button onClick={startGame} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
              ▶ BEGIN PROTOCOL
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "clamp(8px,2vw,14px)", maxWidth: 320, margin: "0 auto" }}>
            {Array.from({ length: GRID_SIZE }).map((_, idx) => (
              <div
                key={idx}
                style={getCellStyle(idx)}
                onClick={() => handleCellClick(idx)}
              />
            ))}
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
        {phase === "idle"    && "3×3 GRID · SEQUENCE GROWS EACH ROUND"}
        {phase === "showing" && "MEMORIZE THE SEQUENCE"}
        {phase === "input"   && "REPEAT THE SEQUENCE IN ORDER"}
        {phase === "correct" && "CORRECT · ADDING ONE MORE STEP"}
        {phase === "wrong"   && "INCORRECT · CALCULATING RESULTS"}
      </div>
    </>
  );
}
