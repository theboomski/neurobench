"use client";

import { trackPlay } from "@/lib/tracking";

import { useState, useMemo } from "react";
import type { GameData } from "@/lib/types";
import { saveHighScore, shuffleOptions, type QuizOption } from "@/lib/gameUtils";
import { shareReportStyleResult } from "@/lib/shareReportStyleResult";
import { useShareCopiedToast } from "@/hooks/useShareCopiedToast";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";

interface Question { id: number; text: string; options: QuizOption[]; }

const RAW_QUESTIONS: Question[] = [
  { id: 1, text: "Someone at work gets credit for something you helped with. You:", options: [
    { text: "Let it go — it's not worth the drama", score: 0 },
    { text: "Mention your contribution privately to the right person", score: 1 },
    { text: "Make sure the right people know what actually happened", score: 2 },
    { text: "File it away. You'll remember this when it matters.", score: 3 },
  ]},
  { id: 2, text: "You're in a negotiation. Your approach:", options: [
    { text: "Be fair and hope they are too", score: 0 },
    { text: "Know what you want, ask for it", score: 1 },
    { text: "Know what they want. Use it.", score: 2 },
    { text: "You've already thought about this more than they have.", score: 3 },
  ]},
  { id: 3, text: "Someone is rude to you for no reason. You:", options: [
    { text: "Categorize them. Adjust how you interact from now on.", score: 3 },
    { text: "Assume they're having a rough day", score: 0 },
    { text: "Remember it. People show you who they are.", score: 2 },
    { text: "Feel annoyed but let it pass", score: 1 },
  ]},
  { id: 4, text: "You discover something unflattering about someone you don't like. You:", options: [
    { text: "Hold onto it. Information is leverage.", score: 3 },
    { text: "Keep it to yourself — irrelevant to me", score: 0 },
    { text: "Share it with a few people. Just for context.", score: 2 },
    { text: "Mention it if it comes up naturally", score: 1 },
  ]},
  { id: 5, text: "Your genuine opinion about most people:", options: [
    { text: "Most people can be moved if you know the right pressure points", score: 3 },
    { text: "People are fundamentally good", score: 0 },
    { text: "Most people are fairly predictable once you figure them out", score: 2 },
    { text: "Mix of good and bad, like anything", score: 1 },
  ]},
  { id: 6, text: "You want something from someone unlikely to give it. You:", options: [
    { text: "You've thought of three angles. Pick the cleanest one.", score: 3 },
    { text: "Ask directly and accept whatever they say", score: 0 },
    { text: "Figure out what they want first. Structure the ask around that.", score: 2 },
    { text: "Make a clear case for why they should", score: 1 },
  ]},
  { id: 7, text: "A rule exists that doesn't apply to your situation. You:", options: [
    { text: "Rules are for people who haven't thought it through", score: 3 },
    { text: "Follow it anyway", score: 0 },
    { text: "Make the exception happen quietly", score: 2 },
    { text: "Ask if there's an exception", score: 1 },
  ]},
  { id: 8, text: "Someone trusts you with information they probably shouldn't have. You:", options: [
    { text: "People give you things because they trust you to use them well.", score: 3 },
    { text: "Keep it completely private", score: 0 },
    { text: "Store it somewhere useful in your head", score: 2 },
    { text: "Keep it private mostly", score: 1 },
  ]},
  { id: 9, text: "You make a mistake that no one else notices. You:", options: [
    { text: "Not a mistake. Just a version that didn't get used.", score: 3 },
    { text: "Acknowledge it anyway — it's the right thing to do", score: 0 },
    { text: "Fix it and move on. No need to raise it.", score: 2 },
    { text: "Fix it quietly", score: 1 },
  ]},
  { id: 10, text: "Your long-term goal is:", options: [
    { text: "You don't say it out loud. But it's a lot.", score: 3 },
    { text: "Stability and meaningful relationships", score: 0 },
    { text: "A position that comes with real power or influence", score: 2 },
    { text: "Success in something I care about", score: 1 },
  ]},
  { id: 11, text: "Someone underestimates you. You:", options: [
    { text: "You've been waiting for this, actually.", score: 3 },
    { text: "Correct the impression gently", score: 0 },
    { text: "Let them underestimate you. It's useful.", score: 2 },
    { text: "Let your work speak eventually", score: 1 },
  ]},
  { id: 12, text: "You feel genuine remorse when:", options: [
    { text: "You made an error in judgment that could have been avoided", score: 3 },
    { text: "You hurt anyone, even accidentally", score: 0 },
    { text: "You hurt someone in a way that was actually your fault", score: 2 },
    { text: "You hurt someone who didn't deserve it", score: 1 },
  ]},
  { id: 13, text: "In most social situations, you're:", options: [
    { text: "You walked in knowing the map. You're just executing.", score: 3 },
    { text: "Genuinely present and engaged", score: 0 },
    { text: "Always aware of the dynamics before you engage", score: 2 },
    { text: "Reading the room as you go", score: 1 },
  ]},
  { id: 14, text: "Your personal code:", options: [
    { text: "Flexible. Depends on the situation and what's at stake.", score: 3 },
    { text: "Treat others how you want to be treated", score: 0 },
    { text: "Do what makes sense for you, don't actively harm people", score: 2 },
    { text: "Be honest, work hard, help people when you can", score: 1 },
  ]},
  { id: 15, text: "If someone wronged you significantly, years ago:", options: [
    { text: "Patience is a form of planning.", score: 3 },
    { text: "I've genuinely moved on", score: 0 },
    { text: "I haven't forgotten. I don't need to do anything right now.", score: 2 },
    { text: "I remember but I don't act on it", score: 1 },
  ]},
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

export default function NPCorVillain({ game }: { game: GameData }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [current, setCurrent] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [showAd, setShowAd] = useState(false);
  const shareToast = useShareCopiedToast();
  const [isNewBest, setIsNewBest] = useState(false);
  const [shuffleKey, setShuffleKey] = useState(0);

  const questions = useMemo(() =>
    RAW_QUESTIONS.map(q => ({ ...q, options: shuffleOptions(q.options) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shuffleKey]
  );

  const q = questions[current];
  const maxScore = RAW_QUESTIONS.reduce((a, q) => a + Math.max(...q.options.map(o => o.score)), 0);

  const handleAnswer = (score: number) => {
    const newTotal = totalScore + score;
    if (current + 1 >= questions.length) {
      const pct = Math.round((newTotal / maxScore) * 100);
      setFinalScore(pct);
      const isNew = saveHighScore(game.id, pct);
      setIsNewBest(isNew);
      setPhase("done");
    } else {
      setTotalScore(newTotal);
      setCurrent(c => c + 1);
    }
  };

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setCurrent(0); setTotalScore(0); setIsNewBest(false); setShuffleKey(k => k + 1); };

  const rank = getRank(finalScore, game);
  const pct = getPercentile(finalScore, game);

  const handleShare = async () => {
    await shareReportStyleResult({
      game,
      clinicalHeader: "NPC or Villain Assessment",
      scoreNum: finalScore,
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
        <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>NPC or Villain Assessment</div>
        <div style={{ width: 100, height: 100, borderRadius: "50%", background: `${rank.color}15`, border: `2px solid ${rank.color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <span style={{ fontSize: 42, fontWeight: 900, color: rank.color, lineHeight: 1 }}>{rank.label}</span>
        </div>
        <div style={{ fontSize: "clamp(48px,12vw,72px)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, marginBottom: 4 }}>
          {finalScore}<span style={{ fontSize: 18, fontWeight: 400, color: "var(--text-3)", marginLeft: 4, fontFamily: "var(--font-mono)" }}>/100</span>
        </div>
        <div style={{ fontSize: 13, color: game.accent, fontWeight: 700, marginBottom: 6, fontFamily: "var(--font-mono)" }}>TOP {100 - pct}% GLOBALLY</div>
        <div style={{ fontSize: 17, fontWeight: 800, color: rank.color, marginBottom: 6 }}>{rank.title}</div>
        <div style={{ fontSize: 14, color: "var(--text-2)", fontStyle: "italic", marginBottom: 24 }}>&quot;{rank.subtitle}&quot;</div>
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
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>NPC or Villain?</h2>
      <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 20, lineHeight: 1.7, maxWidth: 380, margin: "0 auto 20px" }}>
        15 situations. Pick what you'd actually do. Answers shuffle every time — so retaking gives you a different experience.
      </p>
      <p style={{ color: "var(--text-3)", fontSize: 11, fontFamily: "var(--font-mono)", marginBottom: 24 }}>~3 minutes · Villain is not a bad result</p>
      <button onClick={() => { trackPlay(game.id); setShuffleKey(k => k + 1); setPhase("playing"); }} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>▶ PLAY</button>
    </div>
  );

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>
          <span>{current + 1} / {questions.length}</span>
          <span style={{ color: game.accent }}>NPC OR VILLAIN</span>
        </div>
        <div style={{ height: 3, background: "var(--border)", borderRadius: 2, marginBottom: 24 }}>
          <div style={{ height: "100%", width: `${(current / questions.length) * 100}%`, background: game.accent, borderRadius: 2, transition: "width 0.3s" }} />
        </div>
        <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-lg)", padding: "22px 20px", marginBottom: 20 }}>
          <p style={{ fontSize: "clamp(14px,2.5vw,17px)", lineHeight: 1.65, color: "var(--text-1)", fontWeight: 600, margin: 0 }}>{q.text}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {q.options.map((opt, i) => (
            <button key={i} onClick={() => handleAnswer(opt.score)} className="pressable"
              style={{ padding: "14px 18px", background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: 13, color: "var(--text-2)", cursor: "pointer", textAlign: "left", lineHeight: 1.5, transition: "all 0.15s" }}>
              {opt.text}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
