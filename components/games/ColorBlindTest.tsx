"use client";

import { trackPlay } from "@/lib/tracking";

import React, { useState, useCallback, useEffect, useRef } from "react";
import type { GameData } from "@/lib/types";
import { getHighScore, saveHighScore } from "@/lib/gameUtils";
import { shareReportStyleResult } from "@/lib/shareReportStyleResult";
import { useShareCopiedToast } from "@/hooks/useShareCopiedToast";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";

// Ishihara-inspired plates: [number, dotColor, bgColor, isColorBlind_answer]
const PLATES = [
  { number: 12, normalAnswer: "12", blindAnswer: "0",  dotHue: 120, bgHue: 45  },
  { number: 8,  normalAnswer: "8",  blindAnswer: "3",  dotHue: 30,  bgHue: 120 },
  { number: 29, normalAnswer: "29", blindAnswer: "70", dotHue: 200, bgHue: 60  },
  { number: 5,  normalAnswer: "5",  blindAnswer: "2",  dotHue: 0,   bgHue: 120 },
  { number: 3,  normalAnswer: "3",  blindAnswer: "5",  dotHue: 90,  bgHue: 30  },
  { number: 74, normalAnswer: "74", blindAnswer: "21", dotHue: 150, bgHue: 50  },
  { number: 6,  normalAnswer: "6",  blindAnswer: "0",  dotHue: 60,  bgHue: 180 },
  { number: 45, normalAnswer: "45", blindAnswer: "0",  dotHue: 100, bgHue: 40  },
];

function hsl(h: number, s: number, l: number) {
  return `hsl(${h},${s}%,${l}%)`;
}

// Generate pseudoisochromatic dot pattern as SVG
function generatePlate(plate: typeof PLATES[0], size: number) {
  const dots: React.ReactElement[] = [];
  const cx = size / 2, cy = size / 2, r = size / 2 - 4;
  const dotR = size * 0.04;
  const seed = plate.number;

  // Generate random dots within circle
  const count = 180;
  const positions: {x: number; y: number; isDot: boolean}[] = [];

  // Simple seeded random
  let s = seed;
  function rand() { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; }

  for (let i = 0; i < count; i++) {
    let x, y, dist;
    let tries = 0;
    do {
      x = cx + (rand() * 2 - 1) * r;
      y = cy + (rand() * 2 - 1) * r;
      dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      tries++;
    } while (dist > r - dotR && tries < 20);
    if (dist <= r - dotR) {
      positions.push({ x, y, isDot: rand() > 0.5 });
    }
  }

  positions.forEach((p, i) => {
    const isDot = p.isDot;
    const variation = (rand() - 0.5) * 20;
    const lVariation = (rand() - 0.5) * 15;
    const color = isDot
      ? hsl(plate.dotHue + variation, 70 + lVariation, 50 + lVariation)
      : hsl(plate.bgHue + variation, 55 + lVariation, 55 + lVariation);
    const r2 = dotR * (0.7 + rand() * 0.6);
    dots.push(<circle key={i} cx={p.x} cy={p.y} r={r2} fill={color} />);
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ borderRadius: "50%", display: "block" }}>
      <circle cx={cx} cy={cy} r={r} fill={hsl(plate.bgHue, 40, 65)} />
      {dots}
    </svg>
  );
}

function getRank(score: number, game: GameData) {
  const sorted = [...game.stats.ranks].sort((a, b) => b.maxMs - a.maxMs);
  return sorted.find(r => score >= r.maxMs) ?? game.stats.ranks[game.stats.ranks.length - 1];
}
function getPercentile(score: number, game: GameData) {
  const pts = [...game.stats.percentiles].sort((a, b) => b.ms - a.ms);
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

type Phase = "idle" | "playing" | "done";

export default function ColorBlindTest({ game }: { game: GameData }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [current, setCurrent] = useState(0);
  const [input, setInput] = useState("");
  const [correct, setCorrect] = useState(0);
  const [showAd, setShowAd] = useState(false);
  const shareToast = useShareCopiedToast();
  const [highScore, setHS] = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => { setHS(getHighScore(game.id)); }, [game.id]);

  const plate = PLATES[current];

  const handleAnswer = useCallback((answer: string) => {
    const isCorrect = answer.trim() === plate.normalAnswer;
    const newCorrect = correct + (isCorrect ? 1 : 0);
    if (current + 1 >= PLATES.length) {
      const score = Math.round((newCorrect / PLATES.length) * 100);
      setFinalScore(score);
      const isNew = saveHighScore(game.id, score);
      setIsNewBest(isNew);
      if (isNew) setHS(score);
      setPhase("done");
    } else {
      setCorrect(newCorrect);
      setCurrent(c => c + 1);
    }
    setInput("");
  }, [correct, current, plate, game.id]);

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setCurrent(0); setCorrect(0); setInput(""); setIsNewBest(false); };

  const rank = getRank(finalScore, game);
  const pct = getPercentile(finalScore, game);

  const handleShare = async () => {
    await shareReportStyleResult({
      game,
      clinicalHeader: "Color Vision Assessment Complete",
      scoreNum: finalScore,
      scoreSuffix: "%",
      rank,
      percentile: pct,
      emoji: "👁️",
      onCopied: shareToast.onCopied,
    });
  };

  if (phase === "done") return (
    <>
      {shareToast.node}
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div className="anim-scale-in" style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", borderTop: `2px solid ${rank.color}`, borderRadius: "var(--radius-xl)", padding: "clamp(28px,5vw,48px) clamp(20px,4vw,40px)", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>Color Vision Assessment Complete</div>
        <div style={{ width: 100, height: 100, borderRadius: "50%", background: `${rank.color}12`, border: `2px solid ${rank.color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <span style={{ fontSize: 42, fontWeight: 900, color: rank.color, lineHeight: 1 }}>{rank.label}</span>
          <span style={{ fontSize: 9, color: rank.color, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-mono)" }}>{rank.percentileLabel}</span>
        </div>
        <div style={{ fontSize: "clamp(52px,13vw,80px)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, marginBottom: 4 }}>
          {finalScore}<span style={{ fontSize: 20, fontWeight: 400, color: "var(--text-3)", marginLeft: 4, fontFamily: "var(--font-mono)" }}>%</span>
        </div>
        <div style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 8 }}>{correct} / {PLATES.length} plates correct</div>
        <div style={{ fontSize: 13, color: game.accent, fontWeight: 700, marginBottom: 6, fontFamily: "var(--font-mono)" }}>TOP {100 - pct}% GLOBALLY</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: rank.color, marginBottom: 4 }}>{rank.title}</div>
        <div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic", marginBottom: 20 }}>&quot;{rank.subtitle}&quot;</div>
        {isNewBest && <div style={{ display: "inline-block", background: `${game.accent}12`, border: `1px solid ${game.accent}30`, color: game.accent, fontSize: 11, fontWeight: 700, padding: "3px 14px", borderRadius: 999, marginBottom: 16, fontFamily: "var(--font-mono)" }}>◆ New Personal Record</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 8 }}>
          <button onClick={handleRetry} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 800, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)" }}>▶ PLAY AGAIN</button>
          <button onClick={() => void handleShare()} className="pressable" style={{ background: "var(--bg-elevated)", color: "var(--text-1)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 700, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)" }}>↗ SHARE</button>
        </div>
      </div>
    </>
  );

  if (phase === "idle") return (
    <div style={{ background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "48px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🔴</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Color Vision Test</h2>
      <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 8, lineHeight: 1.7 }}>
        {PLATES.length} Ishihara-inspired plates. A number is hidden in each pattern.
        Enter the number you see — or 0 if you can&apos;t see any.
      </p>
      <p style={{ color: "var(--text-3)", fontSize: 12, fontFamily: "var(--font-mono)", marginBottom: 28 }}>Takes ~60 seconds</p>
      <button onClick={() => { trackPlay(game.id); setPhase("playing"); }} className="pressable" style={{ background: game.accent, color: "#fff", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>▶ PLAY</button>
    </div>
  );

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div style={{ textAlign: "center" }}>
        {/* Progress */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>
          <span>PLATE {current + 1} / {PLATES.length}</span>
          <span style={{ color: game.accent }}>{correct} CORRECT</span>
        </div>
        <div style={{ height: 3, background: "var(--border)", borderRadius: 2, marginBottom: 28 }}>
          <div style={{ height: "100%", width: `${((current) / PLATES.length) * 100}%`, background: game.accent, borderRadius: 2, transition: "width 0.3s" }} />
        </div>

        {/* Plate */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
          {generatePlate(plate, 260)}
        </div>

        <p style={{ color: "var(--text-2)", fontSize: 13, marginBottom: 20, fontFamily: "var(--font-mono)" }}>
          What number do you see? (Enter 0 if none)
        </p>

        {/* Number pad */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, maxWidth: 320, margin: "0 auto 16px" }}>
          {["1","2","3","4","5","6","7","8","9","0"].map(n => (
            <button key={n} onClick={() => setInput(i => i.length < 2 ? i + n : i)} className="pressable"
              style={{ padding: "14px 0", background: "var(--bg-card)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-md)", fontSize: 18, fontWeight: 700, cursor: "pointer", color: "var(--text-1)", fontFamily: "var(--font-mono)" }}>
              {n}
            </button>
          ))}
        </div>

        {/* Input display + submit */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
          <div style={{ width: 80, height: 48, background: "var(--bg-elevated)", border: `1px solid ${game.accent}50`, borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, fontFamily: "var(--font-mono)", color: "var(--text-1)" }}>
            {input || "—"}
          </div>
          <button onClick={() => setInput(i => i.slice(0, -1))} className="pressable"
            style={{ padding: "12px 16px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: 16, cursor: "pointer", color: "var(--text-2)" }}>⌫</button>
          <button onClick={() => input && handleAnswer(input)} disabled={!input} className="pressable"
            style={{ padding: "12px 24px", background: input ? game.accent : "var(--bg-elevated)", color: input ? "#fff" : "var(--text-3)", border: "none", borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 800, cursor: input ? "pointer" : "default", fontFamily: "var(--font-mono)" }}>
            SUBMIT →
          </button>
        </div>
      </div>
    </>
  );
}
