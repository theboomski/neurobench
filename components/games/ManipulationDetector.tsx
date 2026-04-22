"use client";

import { trackPlay } from "@/lib/tracking";

import { useState } from "react";
import type { GameData } from "@/lib/types";
import { saveHighScore } from "@/lib/gameUtils";
import { shareReportStyleResult } from "@/lib/shareReportStyleResult";
import { useShareCopiedToast } from "@/hooks/useShareCopiedToast";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";

// Scenarios: detect manipulation tactic + personal tendency
const SCENARIOS = [
  {
    id: 1, type: "detect",
    setup: "A colleague says: \"I'd ask someone else, but honestly you're the only one who really understands this project. Could you work this weekend?\"",
    question: "What manipulation tactic is being used?",
    options: [
      "Genuine compliment — they really do value you",
      "Flattery to create obligation",
      "Creating false urgency",
      "Appealing to fear of missing out",
    ],
    correct: 1,
  },
  {
    id: 2, type: "tendency",
    setup: "",
    question: "When you want something from someone, you tend to:",
    options: [
      "Ask directly and accept the answer",
      "Soften them up with compliments first",
      "Find the right moment and angle",
      "Engineer the situation so they feel it was their idea",
    ],
    correct: -1, // no wrong answer — measures tendency
  },
  {
    id: 3, type: "detect",
    setup: "Your manager says: \"Everyone else on the team has already agreed to this. I just need your sign-off.\"",
    question: "What's happening here?",
    options: [
      "Transparent information sharing",
      "Social proof manipulation",
      "Legitimate team consensus",
      "Simple peer pressure",
    ],
    correct: 1,
  },
  {
    id: 4, type: "detect",
    setup: "A friend says: \"After everything I've done for you, I just thought you'd be willing to help me with this one small thing.\"",
    question: "Identify the manipulation tactic:",
    options: [
      "Honest expression of disappointment",
      "Reciprocity exploitation",
      "Emotional blackmail",
      "Guilt-tripping through past favors",
    ],
    correct: 3,
  },
  {
    id: 5, type: "tendency",
    setup: "",
    question: "In a negotiation, your instinct is to:",
    options: [
      "State your position honestly and find a fair middle ground",
      "Anchor high and make strategic concessions",
      "Read their weaknesses and use them",
      "Control the information flow to your advantage",
    ],
    correct: -1,
  },
  {
    id: 6, type: "detect",
    setup: "A salesperson says: \"This price is only available today. I can't guarantee it'll be here tomorrow.\"",
    question: "What persuasion technique is this?",
    options: [
      "Genuine limited availability",
      "Artificial scarcity / false urgency",
      "Loss aversion exploitation",
      "Both B and C",
    ],
    correct: 3,
  },
  {
    id: 7, type: "tendency",
    setup: "",
    question: "When someone disagrees with you strongly, you typically:",
    options: [
      "Listen to understand their perspective",
      "Find common ground to bring them around",
      "Reframe the argument until they see your point",
      "Identify what they want and use it to change their mind",
    ],
    correct: -1,
  },
  {
    id: 8, type: "detect",
    setup: "Your partner says: \"I'm not angry, I just thought you'd know this mattered to me. But fine. Do what you want.\"",
    question: "What's the dynamic here?",
    options: [
      "Healthy emotional expression",
      "Passive aggression / indirect guilt",
      "Genuine indifference",
      "Conflict avoidance",
    ],
    correct: 1,
  },
  {
    id: 9, type: "detect",
    setup: "A charity caller says: \"Imagine a child going to bed hungry tonight. For just the price of a coffee...\"",
    question: "This is an example of:",
    options: [
      "Factual information",
      "Emotional appeal / identifiable victim effect",
      "Social responsibility appeal",
      "Manipulation — charities shouldn't do this",
    ],
    correct: 1,
  },
  {
    id: 10, type: "tendency",
    setup: "",
    question: "If you wanted someone to make a decision that benefits you, you would:",
    options: [
      "Explain why it's good for them too, honestly",
      "Present options where one clearly looks best",
      "Control the framing so they reach the 'right' conclusion",
      "Remove objections before they can voice them",
    ],
    correct: -1,
  },
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

export default function ManipulationDetector({ game }: { game: GameData }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showFeedback, setShowFeedback] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const shareToast = useShareCopiedToast();
  const [scores, setScores] = useState({ detector: 0, operator: 0, total: 0 });
  const [isNewBest, setIsNewBest] = useState(false);

  const q = SCENARIOS[current];

  const handleAnswer = (val: number) => {
    const newAnswers = { ...answers, [q.id]: val };
    setAnswers(newAnswers);

    if (q.type === "detect") {
      setShowFeedback(true);
      setTimeout(() => {
        setShowFeedback(false);
        advance(newAnswers);
      }, 1200);
    } else {
      advance(newAnswers);
    }
  };

  const advance = (newAnswers: Record<number, number>) => {
    if (current + 1 >= SCENARIOS.length) {
      const detectQs = SCENARIOS.filter(s => s.type === "detect");
      const tendencyQs = SCENARIOS.filter(s => s.type === "tendency");
      const detectorScore = detectQs.filter(s => newAnswers[s.id] === s.correct).length;
      const detectorPct = Math.round((detectorScore / detectQs.length) * 100);
      // Operator score: higher index answer = more strategic
      const opScores = tendencyQs.map(s => (newAnswers[s.id] ?? 0) * 33);
      const operatorPct = Math.min(100, Math.round(opScores.reduce((a, b) => a + b, 0) / tendencyQs.length));
      const total = Math.round((detectorPct + operatorPct) / 2);
      setScores({ detector: detectorPct, operator: operatorPct, total });
      const isNew = saveHighScore(game.id, total);
      setIsNewBest(isNew);
      setPhase("done");
    } else {
      setCurrent(c => c + 1);
    }
  };

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setCurrent(0); setAnswers({}); setIsNewBest(false); setShowFeedback(false); };

  const rank = getRank(scores.total, game);
  const pct = getPercentile(scores.total, game);

  const handleShare = async () => {
    await shareReportStyleResult({
      game,
      clinicalHeader: "Manipulation Assessment",
      scoreNum: scores.total,
      scoreSuffix: "/100",
      rank,
      percentile: pct,
      emoji: "🎭",
      onCopied: shareToast.onCopied,
    });
  };

  if (phase === "done") return (
    <>
      {shareToast.node}
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div className="anim-scale-in" style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", borderTop: `2px solid ${rank.color}`, borderRadius: "var(--radius-xl)", padding: "clamp(24px,5vw,44px) clamp(20px,4vw,40px)", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 20 }}>Manipulation Assessment</div>
        <div style={{ width: 100, height: 100, borderRadius: "50%", background: `${rank.color}12`, border: `2px solid ${rank.color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <span style={{ fontSize: 42, fontWeight: 900, color: rank.color, lineHeight: 1 }}>{rank.label}</span>
          <span style={{ fontSize: 9, color: rank.color, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-mono)" }}>{rank.percentileLabel}</span>
        </div>
        <div style={{ fontSize: "clamp(48px,12vw,72px)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, marginBottom: 4 }}>
          {scores.total}<span style={{ fontSize: 18, fontWeight: 400, color: "var(--text-3)", marginLeft: 4, fontFamily: "var(--font-mono)" }}>/100</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "20px 0" }}>
          {[
            { label: "Detector Score", val: scores.detector, color: "#06B6D4", desc: "Spotting manipulation" },
            { label: "Operator Score", val: scores.operator, color: "#F97316", desc: "Using manipulation" },
          ].map(s => (
            <div key={s.label} style={{ background: "var(--bg-elevated)", borderRadius: 10, padding: "14px 10px" }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>{s.label}</div>
              <div style={{ fontSize: 10, color: s.color, marginTop: 2 }}>{s.desc}</div>
              <div style={{ height: 3, background: "var(--border)", borderRadius: 2, marginTop: 6 }}>
                <div style={{ height: "100%", width: `${s.val}%`, background: s.color, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 13, color: game.accent, fontWeight: 700, marginBottom: 6, fontFamily: "var(--font-mono)" }}>TOP {100 - pct}% GLOBALLY</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: rank.color, marginBottom: 4 }}>{rank.title}</div>
        <div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic", marginBottom: 20 }}>&quot;{rank.subtitle}&quot;</div>
        {isNewBest && <div style={{ display: "inline-block", background: `${game.accent}12`, border: `1px solid ${game.accent}30`, color: game.accent, fontSize: 11, fontWeight: 700, padding: "3px 14px", borderRadius: 999, marginBottom: 16, fontFamily: "var(--font-mono)" }}>◆ New Personal Record</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={handleRetry} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 800, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)" }}>▶ RETAKE</button>
          <button onClick={() => void handleShare()} className="pressable" style={{ background: "var(--bg-elevated)", color: "var(--text-1)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 700, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)" }}>↗ SHARE</button>
        </div>
      </div>
    </>
  );

  if (phase === "idle") return (
    <div style={{ background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "48px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🎭</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Manipulation Detector</h2>
      <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 16, lineHeight: 1.7, maxWidth: 380, margin: "0 auto 16px" }}>
        10 scenarios. Some test whether you can <strong style={{ color: "#06B6D4" }}>spot manipulation</strong> in others. Some reveal your own <strong style={{ color: "#F97316" }}>operator tendencies</strong>. Which side are you on?
      </p>
      <p style={{ color: "var(--text-3)", fontSize: 11, fontFamily: "var(--font-mono)", marginBottom: 24 }}>~3 minutes · Answer instinctively</p>
      <button onClick={() => { trackPlay(game.id); setPhase("playing"); }} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>▶ BEGIN</button>
    </div>
  );

  const isCorrect = showFeedback && q.type === "detect" && answers[q.id] === q.correct;
  const isWrong = showFeedback && q.type === "detect" && answers[q.id] !== q.correct;

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>
          <span>{current + 1} / {SCENARIOS.length}</span>
          <span style={{ color: q.type === "detect" ? "#06B6D4" : "#F97316" }}>
            {q.type === "detect" ? "DETECT" : "TENDENCY"}
          </span>
        </div>
        <div style={{ height: 3, background: "var(--border)", borderRadius: 2, marginBottom: 24 }}>
          <div style={{ height: "100%", width: `${(current / SCENARIOS.length) * 100}%`, background: game.accent, borderRadius: 2, transition: "width 0.3s" }} />
        </div>

        {q.setup && (
          <div style={{ background: "var(--bg-elevated)", borderLeft: `3px solid ${q.type === "detect" ? "#06B6D4" : "#F97316"}`, borderRadius: "var(--radius-md)", padding: "16px 18px", marginBottom: 16, fontSize: 13, lineHeight: 1.7, color: "var(--text-2)", fontStyle: "italic" }}>
            {q.setup}
          </div>
        )}
        <p style={{ fontSize: "clamp(13px,2.5vw,16px)", fontWeight: 600, marginBottom: 20, lineHeight: 1.5, color: "var(--text-1)" }}>{q.question}</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {q.options.map((opt, i) => {
            const isSelected = answers[q.id] === i;
            const showCorrect = showFeedback && i === q.correct;
            const showWrong = showFeedback && isSelected && i !== q.correct;
            return (
              <button key={i} onClick={() => !showFeedback && handleAnswer(i)} className="pressable"
                style={{
                  padding: "13px 18px",
                  background: showCorrect ? "#10B98120" : showWrong ? "#EF444420" : isSelected ? `${game.accent}15` : "var(--bg-card)",
                  border: `1.5px solid ${showCorrect ? "#10B981" : showWrong ? "#EF4444" : isSelected ? game.accent : "var(--border)"}`,
                  borderRadius: "var(--radius-md)",
                  fontSize: 13,
                  color: showCorrect ? "#10B981" : showWrong ? "#EF4444" : "var(--text-2)",
                  cursor: showFeedback ? "default" : "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  transition: "all 0.15s",
                }}>
                <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-3)", minWidth: 16 }}>{i + 1}</span>
                {opt}
                {showCorrect && <span style={{ marginLeft: "auto", fontSize: 14 }}>✓</span>}
                {showWrong && <span style={{ marginLeft: "auto", fontSize: 14 }}>✗</span>}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
