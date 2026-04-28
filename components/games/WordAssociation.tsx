"use client";

import { trackPlay } from "@/lib/tracking";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { GameData } from "@/lib/types";
import { saveHighScore, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";
import CommonResult from "@/components/CommonResult";
import { normalizeTo100FromPercentile, resolveResultTone } from "@/lib/resultUtils";

const ROUND_MS = 30_000;
const TRANSITION_MS = 200;
const TICK_MS = 100;

/** Fisher–Yates shuffle (copy). */
function shuffleArray<T>(items: readonly T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[j]!;
    a[j] = t!;
  }
  return a;
}

function shuffleOpts(options: string[], correct: number) {
  const indexed = options.map((text, i) => ({ text, isCorrect: i === correct }));
  for (let i = indexed.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = indexed[i];
    indexed[i] = indexed[j]!;
    indexed[j] = t!;
  }
  return indexed;
}

type Pair = { word: string; options: string[]; correct: number };

// 50 word → best associate (4 options each). Hospital: explicit “Nurse and Scalpel” correct answer.
const PAIRS: Pair[] = [
  { word: "Ocean", options: ["Wave", "Chair", "Pencil", "Tuesday"], correct: 0 },
  { word: "Fire", options: ["Carpet", "Smoke", "Piano", "Envelope"], correct: 1 },
  { word: "Library", options: ["Silence", "Engine", "Pebble", "Curtain"], correct: 0 },
  { word: "Hospital", options: ["Laughter", "Scalpel", "Nurse", "Nurse and Scalpel"], correct: 3 },
  { word: "Betrayal", options: ["Trust", "Purple", "Window", "Silence"], correct: 0 },
  { word: "Lightning", options: ["Rain", "Sandcastle", "Folder", "Marble"], correct: 0 },
  { word: "Prison", options: ["Freedom", "Stapler", "Candle", "Frost"], correct: 0 },
  { word: "Childhood", options: ["Taxes", "Nostalgia", "Invoice", "Protocol"], correct: 1 },
  { word: "Science", options: ["Experiment", "Curtain", "Marble", "Autumn"], correct: 0 },
  { word: "Sleep", options: ["Monday", "Dream", "Invoice", "Bracket"], correct: 1 },
  { word: "Ambition", options: ["Ladder", "Ribbon", "Gravel", "Tuesday"], correct: 0 },
  { word: "Silence", options: ["Forest", "Engine", "Invoice", "Bracket"], correct: 0 },
  { word: "Revolution", options: ["Change", "Carpet", "Stapler", "Pebble"], correct: 0 },
  { word: "Memory", options: ["Photograph", "Envelope", "Marble", "Curtain"], correct: 0 },
  { word: "Danger", options: ["Caution", "Tuesday", "Ribbon", "Gravel"], correct: 0 },
  { word: "Winter", options: ["Snow", "Sandals", "Melon", "Ledger"], correct: 0 },
  { word: "Music", options: ["Melody", "Hammer", "Ledger", "Cactus"], correct: 0 },
  { word: "Friendship", options: ["Loyalty", "Invoice", "Bolt", "Canyon"], correct: 0 },
  { word: "Time", options: ["Clock", "Sponge", "Ruler", "Velvet"], correct: 0 },
  { word: "Love", options: ["Heart", "Stapler", "Granite", "Bracket"], correct: 0 },
  { word: "War", options: ["Battle", "Teapot", "Linen", "Quartz"], correct: 0 },
  { word: "Peace", options: ["Dove", "Drill", "Folder", "Marble"], correct: 0 },
  { word: "Money", options: ["Wealth", "Feather", "Bracket", "Pebble"], correct: 0 },
  { word: "School", options: ["Teacher", "Canyon", "Velvet", "Bolt"], correct: 0 },
  { word: "Summer", options: ["Heat", "Icicle", "Ledger", "Stapler"], correct: 0 },
  { word: "Spring", options: ["Bloom", "Frost", "Hammer", "Invoice"], correct: 0 },
  { word: "Autumn", options: ["Leaves", "Surfboard", "Ruler", "Cactus"], correct: 0 },
  { word: "City", options: ["Skyscraper", "Meadow", "Quartz", "Velvet"], correct: 0 },
  { word: "Village", options: ["Cottage", "Metropolis", "Granite", "Bolt"], correct: 0 },
  { word: "Desert", options: ["Cactus", "Blizzard", "Melon", "Linen"], correct: 0 },
  { word: "Forest", options: ["Trees", "Desert", "Teapot", "Ledger"], correct: 0 },
  { word: "River", options: ["Flow", "Desert", "Stapler", "Bracket"], correct: 0 },
  { word: "Mountain", options: ["Peak", "Valley floor", "Sponge", "Invoice"], correct: 0 },
  { word: "Sky", options: ["Cloud", "Cellar", "Hammer", "Pebble"], correct: 0 },
  { word: "Earth", options: ["Soil", "Comet", "Folder", "Canyon"], correct: 0 },
  { word: "Moon", options: ["Night", "Noon", "Drill", "Granite"], correct: 0 },
  { word: "Sun", options: ["Light", "Shadow only", "Bolt", "Linen"], correct: 0 },
  { word: "Book", options: ["Page", "Anvil", "Velvet", "Bracket"], correct: 0 },
  { word: "Key", options: ["Lock", "Sponge", "Melon", "Quartz"], correct: 0 },
  { word: "Door", options: ["Knob", "Cloud", "Ruler", "Cactus"], correct: 0 },
  { word: "Window", options: ["Glass", "Brick only", "Teapot", "Ledger"], correct: 0 },
  { word: "Bridge", options: ["River", "Island only", "Hammer", "Invoice"], correct: 0 },
  { word: "Ship", options: ["Sail", "Runway", "Stapler", "Pebble"], correct: 0 },
  { word: "Train", options: ["Track", "Kite", "Folder", "Marble"], correct: 0 },
  { word: "Bird", options: ["Feather", "Anchor", "Drill", "Canyon"], correct: 0 },
  { word: "Cat", options: ["Whiskers", "Tractor", "Granite", "Bolt"], correct: 0 },
  { word: "Dog", options: ["Bark", "Cactus", "Linen", "Velvet"], correct: 0 },
  { word: "Bee", options: ["Honey", "Icicle", "Bracket", "Quartz"], correct: 0 },
  { word: "Spider", options: ["Web", "Orchid", "Melon", "Ruler"], correct: 0 },
  { word: "Chef", options: ["Kitchen", "Garage", "Sponge", "Ledger"], correct: 0 },
];

function getRank(score: number, game: GameData) {
  const sorted = [...game.stats.ranks].sort((a, b) => b.maxMs - a.maxMs);
  return sorted.find((r) => score >= r.maxMs) ?? game.stats.ranks[game.stats.ranks.length - 1];
}

function getPercentile(score: number, game: GameData) {
  const pts = [...game.stats.percentiles].sort((a, b) => b.ms - a.ms);
  if (score >= pts[0]!.ms) return pts[0]!.percentile;
  if (score <= pts[pts.length - 1]!.ms) return pts[pts.length - 1]!.percentile;
  for (let i = 0; i < pts.length - 1; i += 1) {
    if (score <= pts[i]!.ms && score >= pts[i + 1]!.ms) {
      const tt = (pts[i]!.ms - score) / (pts[i]!.ms - pts[i + 1]!.ms);
      return Math.round(pts[i]!.percentile - tt * (pts[i]!.percentile - pts[i + 1]!.percentile));
    }
  }
  return 50;
}

type Phase = "idle" | "playing" | "done";

export default function WordAssociation({ game }: { game: GameData }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [deck, setDeck] = useState<Pair[]>(() => shuffleArray(PAIRS));
  const [current, setCurrent] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showAd, setShowAd] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState(ROUND_MS);
  const [shuffleKey, setShuffleKey] = useState(0);

  const sessionEndRef = useRef(0);
  const phaseRef = useRef<Phase>("idle");
  const correctRef = useRef(0);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    correctRef.current = correct;
  }, [correct]);

  const q = deck[current];
  const shuffledOptions = useMemo(() => {
    if (!q) return [];
    return shuffleOpts(q.options, q.correct);
  }, [q, shuffleKey, current]);

  const finishRound = useCallback(
    (totalCorrect: number) => {
      setFinalScore(totalCorrect);
      const isNew = saveHighScore(game.id, totalCorrect);
      setIsNewBest(isNew);
      phaseRef.current = "done";
      setPhase("done");
    },
    [game.id],
  );

  useEffect(() => {
    if (phase !== "playing") return;
    const id = window.setInterval(() => {
      const left = Math.max(0, sessionEndRef.current - Date.now());
      setTimeLeftMs(left);
      if (left <= 0 && phaseRef.current === "playing") {
        finishRound(correctRef.current);
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [phase, finishRound]);

  const handleAnswer = useCallback(
    (idx: number) => {
      if (selected !== null) return;
      if (Date.now() >= sessionEndRef.current) return;

      setSelected(idx);
      const isCorrect = shuffledOptions[idx]?.isCorrect ?? false;
      if (isCorrect) playBeep("tap");
      const baseCorrect = correctRef.current;
      const nextCorrect = isCorrect ? baseCorrect + 1 : baseCorrect;

      window.setTimeout(() => {
        if (phaseRef.current !== "playing") return;
        if (Date.now() >= sessionEndRef.current) {
          finishRound(nextCorrect);
          return;
        }

        setCorrect(nextCorrect);
        correctRef.current = nextCorrect;

        const nextIndex = current + 1;
        if (nextIndex >= deck.length) {
          setDeck(shuffleArray(PAIRS));
          setCurrent(0);
          setShuffleKey((k) => k + 1);
        } else {
          setCurrent(nextIndex);
          setShuffleKey((k) => k + 1);
        }
        setSelected(null);
      }, TRANSITION_MS);
    },
    [selected, shuffledOptions, current, deck.length, finishRound],
  );

  const handleStart = () => {
    trackPlay(game.id);
    const end = Date.now() + ROUND_MS;
    sessionEndRef.current = end;
    setDeck(shuffleArray(PAIRS));
    setCurrent(0);
    setCorrect(0);
    correctRef.current = 0;
    setSelected(null);
    setShuffleKey((k) => k + 1);
    setTimeLeftMs(ROUND_MS);
    setPhase("playing");
    phaseRef.current = "playing";
  };

  const handleRetry = () => {
    if (shouldShowAd()) setShowAd(true);
    else afterAd();
  };
  const afterAd = () => {
    setShowAd(false);
    setPhase("idle");
    phaseRef.current = "idle";
    setIsNewBest(false);
  };

  const rank = phase === "done" ? getRank(finalScore, game) : null;
  const pct = phase === "done" ? getPercentile(finalScore, game) : 0;

  if (phase === "done" && rank) {
    const normalized = normalizeTo100FromPercentile(pct, finalScore);
    return (
      <CommonResult
        game={game}
        rawScore={finalScore}
        rawUnit="correct"
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

  if (phase === "idle") {
    return (
      <div
        style={{
          background: "var(--bg-card)",
          border: "1.5px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          padding: "48px 24px",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 56, marginBottom: 16 }}>🕸️</div>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Word Association IQ</h2>
        <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 16, lineHeight: 1.7, maxWidth: 420, margin: "0 auto 16px" }}>
          You have <strong>30 seconds</strong>. Answer as many as you can. Each prompt shows a word — pick the strongest association. Questions are drawn in{" "}
          <strong>random order</strong> from 50 pairs; if you clear the full set before time runs out, the deck <strong>shuffles and loops</strong> so you can keep scoring.
        </p>
        <div style={{ background: "var(--bg-elevated)", borderRadius: 12, padding: "16px 24px", marginBottom: 24, display: "inline-block" }}>
          <div style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>Ocean →</div>
          <div style={{ fontSize: 13, color: game.accent }}>Wave ✓</div>
          <div style={{ fontSize: 13, color: "var(--text-3)" }}>Chair · Pencil · Tuesday</div>
        </div>
        <br />
        <p style={{ color: "var(--text-3)", fontSize: 11, fontFamily: "var(--font-mono)", marginBottom: 24 }}>
          50-word bank · 30-second sprint
        </p>
        <button
          onClick={handleStart}
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
          }}
        >
          ▶ PLAY
        </button>
      </div>
    );
  }

  if (!q) return null;

  const secLeft = (timeLeftMs / 1000).toFixed(1);

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 8,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--text-3)",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span>
            {current + 1} / {deck.length} · loop
          </span>
          <span style={{ color: "#f59e0b", fontWeight: 800 }}>{secLeft}s</span>
          <span style={{ color: "#10B981" }}>{correct} correct</span>
        </div>
        <div style={{ height: 3, background: "var(--border)", borderRadius: 2, marginBottom: 28 }}>
          <div
            style={{
              height: "100%",
              width: `${(timeLeftMs / ROUND_MS) * 100}%`,
              background: game.accent,
              borderRadius: 2,
              transition: "width 0.1s linear",
            }}
          />
        </div>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div
            style={{
              fontSize: "clamp(32px,8vw,52px)",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              color: "var(--text-1)",
              marginBottom: 8,
            }}
          >
            {q.word}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>Strongest association?</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {shuffledOptions.map((opt, i) => {
            const isSelected = selected === i;
            const showCorrect = selected !== null && opt.isCorrect;
            const showWrong = selected !== null && isSelected && !opt.isCorrect;
            return (
              <button
                key={`${opt.text}-${i}`}
                type="button"
                onClick={() => handleAnswer(i)}
                disabled={selected !== null}
                className="pressable"
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
                }}
              >
                {opt.text}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
