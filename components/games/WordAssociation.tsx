"use client";

import { trackPlay } from "@/lib/tracking";

import { useState, useCallback, useMemo } from "react";
import type { GameData } from "@/lib/types";
import { saveHighScore, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";
import CommonResult from "@/components/CommonResult";
import { normalizeTo100FromPercentile, resolveResultTone } from "@/lib/resultUtils";


// Shuffle options while keeping correct answer trackable
function shuffleOpts(options: string[], correct: number) {
  const indexed = options.map((text, i) => ({ text, isCorrect: i === correct }));
  for (let i = indexed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }
  return indexed;
}


// Word → best semantic associate (with distractors)
// Measured: accuracy + reaction time → semantic network richness
const PAIRS = [
  { word: "Ocean",      options: ["Wave", "Chair", "Pencil", "Tuesday"],    correct: 0 },
  { word: "Fire",       options: ["Carpet", "Smoke", "Piano", "Envelope"],  correct: 1 },
  { word: "Library",    options: ["Silence", "Engine", "Pebble", "Curtain"],correct: 0 },
  { word: "Hospital",   options: ["Laughter", "Scalpel", "Pillow", "Both B and C"], correct: 3 },
  { word: "Betrayal",   options: ["Trust", "Purple", "Window", "Silence"],  correct: 0 },
  { word: "Lightning",  options: ["Rain", "Sandcastle", "Folder", "Marble"],correct: 0 },
  { word: "Prison",     options: ["Freedom", "Stapler", "Candle", "Frost"], correct: 0 },
  { word: "Childhood",  options: ["Taxes", "Nostalgia", "Invoice", "Protocol"], correct: 1 },
  { word: "Science",    options: ["Experiment", "Curtain", "Marble", "Autumn"], correct: 0 },
  { word: "Sleep",      options: ["Monday", "Dream", "Invoice", "Bracket"], correct: 1 },
  { word: "Ambition",   options: ["Ladder", "Pillow", "Gravel", "Tuesday"], correct: 0 },
  { word: "Silence",    options: ["Forest", "Engine", "Invoice", "Bracket"], correct: 0 },
  { word: "Revolution", options: ["Change", "Carpet", "Stapler", "Pebble"], correct: 0 },
  { word: "Memory",     options: ["Photograph", "Envelope", "Marble", "Curtain"], correct: 0 },
  { word: "Danger",     options: ["Caution", "Tuesday", "Pillow", "Gravel"], correct: 0 },
];

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
      const tt = (pts[i].ms - score) / (pts[i].ms - pts[i + 1].ms);
      return Math.round(pts[i].percentile - tt * (pts[i].percentile - pts[i + 1].percentile));
    }
  }
  return 50;
}

type Phase = "idle" | "playing" | "done";

export default function WordAssociation({ game }: { game: GameData }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [current, setCurrent] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [rts, setRts] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [trialStart, setTrialStart] = useState(0);
  const [showAd, setShowAd] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [avgRT, setAvgRT] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);

  const [shuffleKey, setShuffleKey] = useState(0);

  const shuffledPairs = useMemo(() =>
    PAIRS.map(p => ({ ...p, shuffledOptions: shuffleOpts(p.options, p.correct) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shuffleKey]
  );
  const q = shuffledPairs[current];

  const handleAnswer = useCallback((idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    const rt = Date.now() - trialStart;
    const isCorrect = q.shuffledOptions[idx].isCorrect;
    if (isCorrect) playBeep("tap");
    const newCorrect = isCorrect ? correct + 1 : correct;
    const newRTs = isCorrect ? [...rts, rt] : rts;

    setTimeout(() => {
      if (current + 1 >= PAIRS.length) {
        const accuracy = Math.round((newCorrect / PAIRS.length) * 100);
        const avgRt = newRTs.length > 0 ? Math.round(newRTs.reduce((a, b) => a + b, 0) / newRTs.length) : 2000;
        const speedScore = Math.max(0, Math.round((3000 - avgRt) / 25));
        const score = Math.min(100, Math.round(accuracy * 0.65 + speedScore * 0.35));
        setAvgRT(avgRt);
        setCorrect(newCorrect);
        setRts(newRTs);
        setFinalScore(score);
        const isNew = saveHighScore(game.id, score);
        setIsNewBest(isNew);
        setPhase("done");
      } else {
        setCorrect(newCorrect);
        setRts(newRTs);
        setCurrent(c => c + 1);
        setSelected(null);
        setTrialStart(Date.now());
      }
    }, 600);
  }, [selected, q, correct, rts, current, trialStart, game.id]);

  const handleStart = () => {
    trackPlay(game.id);
    setCurrent(0); setCorrect(0); setRts([]); setSelected(null);
    setTrialStart(Date.now()); setShuffleKey(k => k + 1);
    setPhase("playing");
  };

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setIsNewBest(false); };

  const rank = phase === "done" ? getRank(finalScore, game) : null;
  const pct = phase === "done" ? getPercentile(finalScore, game) : 0;

  if (phase === "done" && rank) {
    const normalized = normalizeTo100FromPercentile(pct, finalScore);
    return (
      <CommonResult
        game={game}
        rawScore={finalScore}
        rawUnit="%"
        normalizedScore={normalized}
        percentile={pct}
        rank={rank}
        highScore={null}
        isNewBest={isNewBest}
        showAd={showAd}
        onAdDone={afterAd}
        onRetry={handleRetry}
        tone={resolveResultTone(game)}
      />
    );
  }

  if (phase === "idle") return (
    <div style={{ background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "48px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🕸️</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Word Association IQ</h2>
      <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 16, lineHeight: 1.7, maxWidth: 380, margin: "0 auto 16px" }}>
        A word appears. Choose the option most closely associated with it. Speed and accuracy both count. Go with your first instinct.
      </p>
      <div style={{ background: "var(--bg-elevated)", borderRadius: 12, padding: "16px 24px", marginBottom: 24, display: "inline-block" }}>
        <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>Ocean →</div>
        <div style={{ fontSize: 13, color: game.accent }}>Wave ✓</div>
        <div style={{ fontSize: 13, color: "var(--text-3)" }}>Chair · Pencil · Tuesday</div>
      </div>
      <br />
      <p style={{ color: "var(--text-3)", fontSize: 11, fontFamily: "var(--font-mono)", marginBottom: 24 }}>15 words · ~2 minutes</p>
      <button onClick={handleStart} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>▶ PLAY</button>
    </div>
  );

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>
          <span>{current + 1} / {PAIRS.length}</span>
          <span style={{ color: "#10B981" }}>{correct} correct</span>
        </div>
        <div style={{ height: 3, background: "var(--border)", borderRadius: 2, marginBottom: 28 }}>
          <div style={{ height: "100%", width: `${(current / PAIRS.length) * 100}%`, background: game.accent, borderRadius: 2, transition: "width 0.3s" }} />
        </div>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: "clamp(32px,8vw,52px)", fontWeight: 900, letterSpacing: "-0.03em", color: "var(--text-1)", marginBottom: 8 }}>{q.word}</div>
          <div style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>What's most associated?</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {q.shuffledOptions.map((opt, i) => {
            const isSelected = selected === i;
            const showCorrect = selected !== null && opt.isCorrect;
            const showWrong = selected !== null && isSelected && !opt.isCorrect;
            return (
              <button key={i} onClick={() => handleAnswer(i)} disabled={selected !== null} className="pressable"
                style={{
                  padding: "16px 12px",
                  background: showCorrect ? "#10B98120" : showWrong ? "#EF444420" : "var(--bg-card)",
                  border: `1.5px solid ${showCorrect ? "#10B981" : showWrong ? "#EF4444" : "var(--border)"}`,
                  borderRadius: "var(--radius-md)",
                  fontSize: 15,
                  fontWeight: 700,
                  color: showCorrect ? "#10B981" : showWrong ? "#EF4444" : "var(--text-1)",
                  cursor: selected !== null ? "default" : "pointer",
                  transition: "all 0.15s",
                }}>
                {opt.text}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
