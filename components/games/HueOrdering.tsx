"use client";

import { useState, useEffect, useCallback } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { getHighScore, saveHighScore, generateReportCard } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";

const t = dict.en;

// Each round: arrange N hue chips in correct order
// Fixed endpoints, scrambled middle chips
const ROUNDS = [
  { startHue: 0,   endHue: 60,  chips: 5 },  // Red → Yellow
  { startHue: 90,  endHue: 150, chips: 5 },  // Green → Cyan-Green
  { startHue: 180, endHue: 270, chips: 6 },  // Cyan → Violet
  { startHue: 270, endHue: 360, chips: 6 },  // Violet → Red
];

function hueColor(h: number) {
  return `hsl(${h % 360}, 85%, 60%)`;
}

function scoreRound(arranged: number[], correct: number[]): number {
  // Error score: sum of (position difference)^2 — lower is better
  let err = 0;
  for (let i = 0; i < arranged.length; i++) {
    const correctIdx = correct.indexOf(arranged[i]);
    err += Math.abs(correctIdx - i);
  }
  return err;
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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function HueOrdering({ game }: { game: GameData }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [roundIdx, setRoundIdx] = useState(0);
  const [arranged, setArranged] = useState<number[]>([]);
  const [correctOrder, setCorrectOrder] = useState<number[]>([]);
  const [totalError, setTotalError] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [showAd, setShowAd] = useState(false);
  const [shareImg, setShareImg] = useState<string | null>(null);
  const [highScore, setHS] = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);

  useEffect(() => { setHS(getHighScore(game.id)); }, [game.id]);

  const initRound = useCallback((idx: number) => {
    const round = ROUNDS[idx];
    const step = (round.endHue - round.startHue) / (round.chips - 1);
    const hues = Array.from({ length: round.chips }, (_, i) => Math.round(round.startHue + i * step));
    setCorrectOrder(hues);
    // Shuffle middle chips (keep first and last fixed)
    const middle = shuffle(hues.slice(1, -1));
    setArranged([hues[0], ...middle, hues[hues.length - 1]]);
    setSelected(null);
  }, []);

  useEffect(() => {
    if (phase === "playing") initRound(roundIdx);
  }, [phase, roundIdx, initRound]);

  const handleChipClick = (idx: number) => {
    // Can't move first or last chip
    if (idx === 0 || idx === arranged.length - 1) return;
    if (selected === null) {
      setSelected(idx);
    } else {
      if (selected === idx) { setSelected(null); return; }
      // Swap
      const next = [...arranged];
      [next[selected], next[idx]] = [next[idx], next[selected]];
      setArranged(next);
      setSelected(null);
    }
  };

  const handleConfirm = () => {
    const err = scoreRound(arranged, correctOrder);
    const newTotal = totalError + err;
    if (roundIdx + 1 >= ROUNDS.length) {
      // Score: 100 - normalized error (max possible error ~ 20)
      const score = Math.max(0, Math.round(100 - (newTotal / (ROUNDS.length * 8)) * 100));
      setFinalScore(score);
      const isNew = saveHighScore(game.id, score);
      setIsNewBest(isNew);
      if (isNew) setHS(score);
      setPhase("done");
    } else {
      setTotalError(newTotal);
      setRoundIdx(r => r + 1);
    }
  };

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setRoundIdx(0); setTotalError(0); setShareImg(null); setIsNewBest(false); };

  const rank = getRank(finalScore, game);
  const pct = getPercentile(finalScore, game);

  const handleShare = async () => {
    const url = generateReportCard({ gameTitle: game.title, clinicalTitle: game.clinicalTitle, score: finalScore, unit: "%", rankLabel: rank.label, rankTitle: rank.title, rankSubtitle: rank.subtitle, rankColor: rank.color, percentile: pct, accent: game.accent, siteUrl: t.site.url });
    setShareImg(url);
    if (navigator.share) { try { const blob = await (await fetch(url)).blob(); await navigator.share({ title: "ZAZAZA", text: `My color IQ: ${finalScore}%! Can you beat me? ${t.site.url}`, files: [new File([blob], "result.png", { type: "image/png" })] }); return; } catch { } }
    window.open(url, "_blank");
  };

  if (phase === "done") return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div className="anim-scale-in" style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", borderTop: `2px solid ${rank.color}`, borderRadius: "var(--radius-xl)", padding: "clamp(28px,5vw,48px) clamp(20px,4vw,40px)", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>Hue Discrimination Assessment</div>
        <div style={{ width: 100, height: 100, borderRadius: "50%", background: `${rank.color}12`, border: `2px solid ${rank.color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <span style={{ fontSize: 42, fontWeight: 900, color: rank.color, lineHeight: 1 }}>{rank.label}</span>
          <span style={{ fontSize: 9, color: rank.color, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-mono)" }}>{rank.percentileLabel}</span>
        </div>
        <div style={{ fontSize: "clamp(52px,13vw,80px)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, marginBottom: 4 }}>
          {finalScore}<span style={{ fontSize: 20, fontWeight: 400, color: "var(--text-3)", marginLeft: 4, fontFamily: "var(--font-mono)" }}>%</span>
        </div>
        <div style={{ fontSize: 13, color: game.accent, fontWeight: 700, marginBottom: 6, fontFamily: "var(--font-mono)" }}>TOP {100 - pct}% GLOBALLY</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: rank.color, marginBottom: 4 }}>{rank.title}</div>
        <div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic", marginBottom: 20 }}>&quot;{rank.subtitle}&quot;</div>
        {isNewBest && <div style={{ display: "inline-block", background: `${game.accent}12`, border: `1px solid ${game.accent}30`, color: game.accent, fontSize: 11, fontWeight: 700, padding: "3px 14px", borderRadius: 999, marginBottom: 16, fontFamily: "var(--font-mono)" }}>◆ New Personal Record</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 8 }}>
          <button onClick={handleRetry} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 800, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)" }}>▶ PLAY AGAIN</button>
          <button onClick={handleShare} className="pressable" style={{ background: "var(--bg-elevated)", color: "var(--text-1)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 700, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)" }}>↗ SHARE</button>
        </div>
        {shareImg && <div style={{ marginTop: 24 }}><img src={shareImg} alt="Result" style={{ maxWidth: "100%", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }} /></div>}
      </div>
    </>
  );

  if (phase === "idle") return (
    <div style={{ background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "48px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🌈</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Hue Ordering Test</h2>
      <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 8, lineHeight: 1.7 }}>
        Color chips appear in scrambled order. Arrange them in a smooth gradient from left to right. Tap a chip to select it, then tap where it should go.
      </p>
      <p style={{ color: "var(--text-3)", fontSize: 12, fontFamily: "var(--font-mono)", marginBottom: 8 }}>🔒 First and last chips are fixed anchors</p>
      <p style={{ color: "var(--text-3)", fontSize: 12, fontFamily: "var(--font-mono)", marginBottom: 28 }}>4 rounds · Takes ~90 seconds</p>
      {/* Preview gradient */}
      <div style={{ height: 24, borderRadius: 12, background: "linear-gradient(to right, hsl(0,85%,60%), hsl(90,85%,60%), hsl(180,85%,60%), hsl(270,85%,60%), hsl(360,85%,60%))", marginBottom: 28, maxWidth: 300, margin: "0 auto 28px" }} />
      <button onClick={() => { setPhase("playing"); setRoundIdx(0); setTotalError(0); }} className="pressable"
        style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>
        ▶ BEGIN TEST
      </button>
    </div>
  );

  const round = ROUNDS[roundIdx];

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>
          <span>ROUND {roundIdx + 1} / {ROUNDS.length}</span>
          <span style={{ color: game.accent }}>TAP TO SELECT · TAP TO PLACE</span>
        </div>
        <div style={{ height: 3, background: "var(--border)", borderRadius: 2, marginBottom: 28 }}>
          <div style={{ height: "100%", width: `${(roundIdx / ROUNDS.length) * 100}%`, background: game.accent, borderRadius: 2, transition: "width 0.3s" }} />
        </div>

        <p style={{ fontSize: 13, color: "var(--text-2)", fontFamily: "var(--font-mono)", marginBottom: 20 }}>
          Arrange in order: <span style={{ color: "var(--text-1)" }}>hsl({round.startHue}°)</span> → <span style={{ color: "var(--text-1)" }}>hsl({round.endHue}°)</span>
        </p>

        {/* Chips */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 32, flexWrap: "wrap" }}>
          {arranged.map((hue, idx) => {
            const isFixed = idx === 0 || idx === arranged.length - 1;
            const isSelected = selected === idx;
            return (
              <div key={idx} onClick={() => handleChipClick(idx)}
                style={{
                  width: 52, height: 72,
                  background: hueColor(hue),
                  borderRadius: 8,
                  cursor: isFixed ? "default" : "pointer",
                  border: isSelected ? "3px solid #fff" : isFixed ? "2px solid rgba(255,255,255,0.3)" : "2px solid transparent",
                  boxShadow: isSelected ? "0 0 0 3px rgba(255,255,255,0.5)" : "none",
                  transform: isSelected ? "translateY(-8px) scale(1.08)" : "none",
                  transition: "transform 0.15s, box-shadow 0.15s",
                  opacity: isFixed ? 0.7 : 1,
                  position: "relative",
                }}
              >
                {isFixed && (
                  <div style={{ position: "absolute", bottom: 4, left: 0, right: 0, textAlign: "center", fontSize: 9, color: "rgba(255,255,255,0.7)", fontFamily: "var(--font-mono)" }}>🔒</div>
                )}
              </div>
            );
          })}
        </div>

        {selected !== null && (
          <p style={{ fontSize: 12, color: "#F59E0B", fontFamily: "var(--font-mono)", marginBottom: 16 }}>
            Chip selected — tap another position to swap
          </p>
        )}

        <button onClick={handleConfirm} className="pressable"
          style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 40px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>
          CONFIRM ORDER →
        </button>
      </div>
    </>
  );
}
