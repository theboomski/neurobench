"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { getHighScore, saveHighScore, generateReportCard, playBeep } from "@/lib/gameUtils";
import InterstitialAd from "@/components/InterstitialAd";

const t = dict.en;
const GRID_SIZE = 9;

// Higher score = better (same as number memory)
function getSeqRank(score: number, game: GameData) {
  const ranks = [...game.stats.ranks].reverse();
  return ranks.find(r => score >= r.maxMs) ?? game.stats.ranks[game.stats.ranks.length - 1];
}
function getSeqPercentile(score: number, game: GameData): number {
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
  const [shareImg, setShareImg]     = useState<string | null>(null);
  const [highScore, setHS]          = useState<number | null>(null);
  const [isNewBest, setIsNewBest]   = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setHS(getHighScore(game.id)); }, [game.id]);
  const clearT = () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  useEffect(() => () => clearT(), []);

  // Speed: faster as level increases, min 300ms
  const getFlashMs = (level: number) => Math.max(300, 700 - level * 30);

  const playSequence = useCallback((seq: number[]) => {
    setPhase("showing");
    setUserSeq([]);
    setWrongCell(null);
    setCorrectCells([]);
    let i = 0;
    const flashNext = () => {
      if (i >= seq.length) {
        setHighlighted(null);
        timeoutRef.current = setTimeout(() => setPhase("input"), 400);
        return;
      }
      setHighlighted(null);
      timeoutRef.current = setTimeout(() => {
        setHighlighted(seq[i]);
        playBeep("tap");
        i++;
        timeoutRef.current = setTimeout(flashNext, getFlashMs(seq.length));
      }, 200);
    };
    timeoutRef.current = setTimeout(flashNext, 500);
  }, []);

  const startGame = useCallback(() => {
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

    // Correct so far
    playBeep("tap");
    setCorrectCells(prev => [...prev, idx]);
    setUserSeq(next);

    if (next.length === sequence.length) {
      // Full sequence correct
      playBeep("success");
      setPhase("correct");
      const newSeq = [
        ...sequence,
        Math.floor(Math.random() * GRID_SIZE),
      ];
      setSequence(newSeq);
      timeoutRef.current = setTimeout(() => playSequence(newSeq), 1000);
    }
  }, [phase, userSeq, sequence, game.id, playSequence]);

  const handleRetry = () => setShowAd(true);
  const afterAd = () => {
    setShowAd(false); setPhase("idle"); setSequence([]); setUserSeq([]);
    setHighlighted(null); setWrongCell(null); setCorrectCells([]);
    setFinalScore(0); setShareImg(null); setIsNewBest(false);
  };

  const rank = finalScore > 0 ? getSeqRank(finalScore, game) : null;
  const pct  = finalScore > 0 ? getSeqPercentile(finalScore, game) : 0;

  const handleShare = async () => {
    if (!rank) return;
    const url = generateReportCard({
      gameTitle: game.title, clinicalTitle: game.clinicalTitle,
      score: finalScore, unit: "STEPS",
      rankLabel: rank.label, rankTitle: rank.title, rankSubtitle: rank.subtitle,
      rankColor: rank.color, percentile: pct, accent: game.accent, siteUrl: t.site.url,
    });
    setShareImg(url);
    if (navigator.share) {
      try {
        const blob = await (await fetch(url)).blob();
        await navigator.share({ title: "My NeuroBench Report", text: t.share.text(game.title, rank.label, rank.subtitle, t.site.url), files: [new File([blob], "neurobench-report.png", { type: "image/png" })] });
        return;
      } catch { /* fallback */ }
    }
    window.open(url, "_blank");
  };

  // ── DONE SCREEN ──────────────────────────────────────────────────────────────
  if (phase === "done" && rank) {
    return (
      <>
        {showAd && <InterstitialAd onDone={afterAd} />}
        <div className="anim-scale-in" style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", borderTop: `2px solid ${rank.color}`, borderRadius: "var(--radius-xl)", padding: "clamp(28px,5vw,48px) clamp(20px,4vw,40px)", textAlign: "center" }}>

          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-3)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 28 }}>
            NeuroBench Assessment Complete · {game.clinicalTitle}
          </div>

          <div style={{ width: 110, height: 110, borderRadius: "50%", background: `${rank.color}12`, border: `2px solid ${rank.color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: `0 0 48px ${rank.color}25` }}>
            <span style={{ fontSize: 48, fontWeight: 900, color: rank.color, lineHeight: 1 }}>{rank.label}</span>
            <span style={{ fontSize: 9, color: rank.color, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2, fontFamily: "var(--font-mono)" }}>{rank.percentileLabel}</span>
          </div>

          <div style={{ fontSize: "clamp(52px,13vw,80px)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, marginBottom: 4 }}>
            {finalScore}
            <span style={{ fontSize: "clamp(16px,3vw,22px)", fontWeight: 400, color: "var(--text-3)", marginLeft: 6, fontFamily: "var(--font-mono)" }}>steps</span>
          </div>

          <div style={{ fontSize: 13, color: game.accent, fontWeight: 700, marginBottom: 6, fontFamily: "var(--font-mono)" }}>
            TOP {100 - pct}% GLOBALLY
          </div>

          <div style={{ fontSize: 15, fontWeight: 700, color: rank.color, marginBottom: 4 }}>{rank.title}</div>
          <div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic", marginBottom: 20 }}>&quot;{rank.subtitle}&quot;</div>

          {isNewBest && (
            <div style={{ display: "inline-block", background: `${game.accent}12`, border: `1px solid ${game.accent}30`, color: game.accent, fontSize: 11, fontWeight: 700, padding: "3px 14px", borderRadius: 999, marginBottom: 16, fontFamily: "var(--font-mono)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              ◆ New Personal Record
            </div>
          )}

          {highScore !== null && !isNewBest && (
            <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 16, fontFamily: "var(--font-mono)" }}>
              Personal best: <span style={{ color: game.accent }}>{highScore} steps</span>
            </div>
          )}

          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", margin: "16px 0 24px" }}>
            {game.stats.ranks.map(r => (
              <div key={r.label} style={{ padding: "4px 11px", borderRadius: 6, fontSize: 12, fontWeight: 800, fontFamily: "var(--font-mono)", background: r.label === rank.label ? `${r.color}18` : "var(--bg-elevated)", color: r.label === rank.label ? r.color : "var(--text-3)", border: `1px solid ${r.label === rank.label ? r.color + "40" : "transparent"}` }}>
                {r.label}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={handleRetry} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 800, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
              ▶ RUN AGAIN
            </button>
            <button onClick={handleShare} className="pressable" style={{ background: "var(--bg-elevated)", color: "var(--text-1)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 700, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
              ↗ EXPORT REPORT
            </button>
          </div>

          {shareImg && (
            <div style={{ marginTop: 28 }}>
              <img src={shareImg} alt="NeuroBench Report Card" style={{ maxWidth: "100%", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }} />
              <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 8, fontFamily: "var(--font-mono)" }}>Long-press (mobile) · Right-click (desktop) to save</p>
            </div>
          )}
        </div>
      </>
    );
  }

  // ── GRID ─────────────────────────────────────────────────────────────────────
  const getCellStyle = (idx: number) => {
    const isHighlighted = highlighted === idx;
    const isWrong       = wrongCell === idx;
    const isCorrect     = correctCells.includes(idx);
    const isNextTarget  = phase === "input" && idx === sequence[userSeq.length];

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
    } else if (isNextTarget) {
      border = `${game.accent}40`;
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
