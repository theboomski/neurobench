"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import type { GameData } from "@/lib/types";
import { saveHighScore, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";
import CommonResult from "@/components/CommonResult";
import { normalizeTo100FromPercentile, resolveResultTone } from "@/lib/resultUtils";

// Each word: definition + 3 plausible wrong definitions (similar style, similar length)
// Key rule: all 4 options must look equally plausible to someone who doesn't know the word
const WORDS = [
  { word: "Ambiguous", level: "A2",
    correct: "Open to more than one interpretation; not clearly defined",
    wrong: ["Relating to both sides of an argument equally", "Expressing strong disagreement or opposition", "Clearly stated with no room for doubt"] },
  { word: "Benevolent", level: "A2",
    correct: "Well-meaning and kindly disposed toward others",
    wrong: ["Strictly enforcing rules for others' benefit", "Tolerant of other people's beliefs and choices", "Giving advice freely whether asked for or not"] },
  { word: "Concise", level: "A2",
    correct: "Giving a lot of information clearly in few words",
    wrong: ["Covering every possible detail thoroughly", "Organized in a way that is easy to follow", "Written in a formal and professional style"] },
  { word: "Diligent", level: "B1",
    correct: "Having or showing care and conscientiousness in work",
    wrong: ["Moving quickly from one task to another", "Focused only on outcomes, not methods", "Willing to work extra hours when required"] },
  { word: "Eloquent", level: "B1",
    correct: "Fluent, forceful, and persuasive in speaking or writing",
    wrong: ["Using technical language to sound authoritative", "Choosing simple words over complex ones", "Speaking confidently without preparation"] },
  { word: "Frugal", level: "B1",
    correct: "Sparing or economical with money or food",
    wrong: ["Unwilling to spend money on anything enjoyable", "Careful about tracking income and expenses", "Generous in small ways but cautious with large amounts"] },
  { word: "Gregarious", level: "B2",
    correct: "Fond of company; sociable by nature",
    wrong: ["Comfortable speaking in front of large groups", "Skilled at making others feel included and at ease", "Outwardly friendly while remaining emotionally guarded"] },
  { word: "Hubris", level: "B2",
    correct: "Excessive pride or self-confidence, especially leading to downfall",
    wrong: ["Intense ambition that drives a person to take risks", "Confidence that is earned through repeated success", "Pride taken in the achievements of one's group"] },
  { word: "Inimitable", level: "B2",
    correct: "So good or unusual as to be impossible to copy",
    wrong: ["Recognized immediately by those who know the field", "Developed over years of dedicated practice", "Admired but rarely successfully taught to others"] },
  { word: "Juxtapose", level: "C1",
    correct: "To place two things side by side for contrasting effect",
    wrong: ["To combine two opposing ideas into a single argument", "To examine two subjects using the same criteria", "To present two options and allow the reader to choose"] },
  { word: "Laconic", level: "C1",
    correct: "Using very few words; brief to the point of seeming rude",
    wrong: ["Speaking only when one has something important to say", "Preferring written communication over spoken", "Delivering information in a flat, emotionless tone"] },
  { word: "Mendacious", level: "C1",
    correct: "Not telling the truth; lying",
    wrong: ["Frequently changing one's stated position", "Saying what people want to hear rather than the truth", "Presenting facts selectively to create a false impression"] },
  { word: "Nefarious", level: "C1",
    correct: "Wicked or criminal in nature",
    wrong: ["Done without proper legal authority", "Harmful to others through carelessness rather than intent", "Operating outside accepted social norms"] },
  { word: "Obsequious", level: "C1",
    correct: "Excessively eager to serve, please, or obey; fawning",
    wrong: ["Polite and cooperative in professional settings", "Quick to agree in order to avoid conflict", "Willing to take on tasks others consider beneath them"] },
  { word: "Perfidious", level: "C2",
    correct: "Deceitful and untrustworthy; guilty of betrayal",
    wrong: ["Pursuing one's interests without regard for others", "Presenting a trustworthy appearance while hiding true motives", "Willing to switch allegiances under sufficient pressure"] },
  { word: "Querulous", level: "C2",
    correct: "Complaining in a petulant or whining manner",
    wrong: ["Asking detailed questions that others find irritating", "Expressing dissatisfaction in a measured, formal way", "Frequently finding fault with processes rather than people"] },
  { word: "Recalcitrant", level: "C2",
    correct: "Stubbornly resistant to authority or discipline",
    wrong: ["Slow to adopt new methods or technologies", "Unwilling to engage in discussion about one's behavior", "Resistant to change even when outcomes would improve"] },
  { word: "Sycophant", level: "C2",
    correct: "A person who flatters powerful people to gain personal advantage",
    wrong: ["Someone who agrees with others to avoid confrontation", "A person who admires leaders without critical judgment", "Someone who mimics those they admire in order to impress them"] },
  { word: "Tendentious", level: "C2",
    correct: "Promoting a particular cause or point of view; biased",
    wrong: ["Reaching conclusions before examining the evidence", "Presenting only the strongest version of one's argument", "Allowing personal experience to influence analysis"] },
  { word: "Verisimilitude", level: "C2",
    correct: "The appearance of being true or real",
    wrong: ["The quality of being verified by independent sources", "The degree to which a story follows internal logic", "The use of realistic details to create emotional impact"] },
];

// Shuffle array utility (local, no import needed)
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build shuffled options for each word: attach correct flag to each option
function buildShuffledOptions(word: typeof WORDS[0]) {
  const opts = shuffle([
    { text: word.correct, isCorrect: true },
    ...word.wrong.map(w => ({ text: w, isCorrect: false })),
  ]);
  return opts;
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
      const tt = (pts[i].ms - score) / (pts[i].ms - pts[i + 1].ms);
      return Math.round(pts[i].percentile - tt * (pts[i].percentile - pts[i + 1].percentile));
    }
  }
  return 50;
}

function vocabAge(score: number): number {
  if (score >= 95) return 18;
  if (score >= 85) return 25;
  if (score >= 70) return 32;
  if (score >= 55) return 42;
  if (score >= 40) return 55;
  return 65;
}

type Phase = "idle" | "playing" | "done";

export default function VocabularyAge({ game }: { game: GameData }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [current, setCurrent] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showAd, setShowAd] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);
  const [shuffleKey, setShuffleKey] = useState(0);

  // Build shuffled options once per game (re-shuffles on retry)
  const shuffledWords = useMemo(() =>
    WORDS.map(w => ({ ...w, shuffledOptions: buildShuffledOptions(w) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shuffleKey]
  );

  const q = shuffledWords[current];
  const correctRef = useRef(0);

  const handleAnswer = useCallback((idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    const isCorrect = q.shuffledOptions[idx].isCorrect;
    if (isCorrect) playBeep("tap");
    if (isCorrect) correctRef.current += 1;
    const newCorrect = correctRef.current;
    setTimeout(() => {
      if (current + 1 >= WORDS.length) {
        const score = Math.round((newCorrect / WORDS.length) * 100);
        setFinalScore(score);
        setCorrect(newCorrect);
        const isNew = saveHighScore(game.id, score);
        setIsNewBest(isNew);
        setPhase("done");
      } else {
        setCorrect(newCorrect);
        setCurrent(c => c + 1);
        setSelected(null);
      }
    }, 900);
  }, [selected, q, current, game.id]);

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => {
    setShowAd(false); setPhase("idle"); setCurrent(0); setCorrect(0);
    correctRef.current = 0; setSelected(null);
    setIsNewBest(false); setShuffleKey(k => k + 1);
  };

  const rank = phase === "done" ? getRank(finalScore, game) : null;
  const pct = phase === "done" ? getPercentile(finalScore, game) : 0;
  const vAge = vocabAge(finalScore);

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
      <div style={{ fontSize: 56, marginBottom: 16 }}>📚</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Vocabulary Age Test</h2>
      <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 16, lineHeight: 1.7, maxWidth: 380, margin: "0 auto 16px" }}>
        20 words. 4 definitions each — all plausible. Choose the correct one. Words escalate from A2 to C2.
      </p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 24 }}>
        {["A2", "B1", "B2", "C1", "C2"].map(l => (
          <div key={l} style={{ background: "var(--bg-elevated)", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{l}</div>
        ))}
      </div>
      <p style={{ color: "var(--text-3)", fontSize: 11, fontFamily: "var(--font-mono)", marginBottom: 24 }}>~3 minutes · Options shuffle every time</p>
      <button onClick={() => { setShuffleKey(k => k + 1); setPhase("playing"); }} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>▶ BEGIN TEST</button>
    </div>
  );

  const levelColors: Record<string, string> = { A2: "#10B981", B1: "#06B6D4", B2: "#F59E0B", C1: "#F97316", C2: "#EF4444" };

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>
          <span>{current + 1} / {WORDS.length}</span>
          <span style={{ color: levelColors[q.level] ?? "var(--text-3)" }}>{q.level}</span>
        </div>
        <div style={{ height: 3, background: "var(--border)", borderRadius: 2, marginBottom: 28 }}>
          <div style={{ height: "100%", width: `${(current / WORDS.length) * 100}%`, background: game.accent, borderRadius: 2, transition: "width 0.3s" }} />
        </div>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: "clamp(28px,7vw,42px)", fontWeight: 900, letterSpacing: "-0.03em", color: "var(--text-1)", marginBottom: 8 }}>{q.word}</div>
          <div style={{ fontSize: 11, color: levelColors[q.level], fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>CEFR {q.level}</div>
        </div>

        <p style={{ fontSize: 13, color: "var(--text-3)", fontFamily: "var(--font-mono)", textAlign: "center", marginBottom: 16 }}>Choose the correct definition:</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {q.shuffledOptions.map((opt, i) => {
            const isSelected = selected === i;
            const showCorrect = selected !== null && opt.isCorrect;
            const showWrong = selected !== null && isSelected && !opt.isCorrect;
            return (
              <button key={i} onClick={() => handleAnswer(i)} disabled={selected !== null} className="pressable"
                style={{
                  padding: "14px 18px",
                  background: showCorrect ? "#10B98120" : showWrong ? "#EF444420" : "var(--bg-card)",
                  border: `1.5px solid ${showCorrect ? "#10B981" : showWrong ? "#EF4444" : "var(--border)"}`,
                  borderRadius: "var(--radius-md)",
                  fontSize: 13,
                  color: showCorrect ? "#10B981" : showWrong ? "#EF4444" : "var(--text-2)",
                  cursor: selected !== null ? "default" : "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  transition: "all 0.15s",
                  lineHeight: 1.5,
                }}>
                <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-3)", minWidth: 16 }}>{String.fromCharCode(65 + i)}</span>
                {opt.text}
                {showCorrect && <span style={{ marginLeft: "auto" }}>✓</span>}
                {showWrong && <span style={{ marginLeft: "auto" }}>✗</span>}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
