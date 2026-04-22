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
  { id: 1, text: "You walk into a new environment — new job, new city, new social group. Your instinct:", options: [
    { text: "Get friendly with everyone. Make yourself likeable.", score: 0 },
    { text: "Observe first. Move second.", score: 2 },
    { text: "Identify who has power and who has information. Those are your first contacts.", score: 3 },
    { text: "Find your people organically. The right connections happen naturally.", score: 1 },
  ]},
  { id: 2, text: "There's a limited opportunity — a job, a deal, a person — that multiple people want. You:", options: [
    { text: "Compete openly and may the best person win", score: 1 },
    { text: "Back off if someone wants it more", score: 0 },
    { text: "Move faster and quieter than anyone else realizes", score: 3 },
    { text: "Position yourself before most people know the opportunity exists", score: 2 },
  ]},
  { id: 3, text: "You've been wronged by someone in your professional or social circle. You:", options: [
    { text: "Confront them directly", score: 1 },
    { text: "Let it go — not worth the energy", score: 0 },
    { text: "Adjust your strategy. They've shown you who they are.", score: 2 },
    { text: "Say nothing. Wait. The right moment will come.", score: 3 },
  ]},
  { id: 4, text: "In a group project or collaboration:", options: [
    { text: "You make sure the group is happy and functions well", score: 0 },
    { text: "You contribute your part reliably", score: 1 },
    { text: "You'd rather work alone — collaboration means splitting credit", score: 2 },
    { text: "You identify early who the key players are and position accordingly", score: 3 },
  ]},
  { id: 5, text: "Your honest relationship to success:", options: [
    { text: "I want enough to be comfortable and happy", score: 0 },
    { text: "I want to succeed at things I care about", score: 1 },
    { text: "I want to win. I want to be at the top of my field.", score: 2 },
    { text: "I want to be in a position where others need me more than I need them", score: 3 },
  ]},
  { id: 6, text: "Someone in your circle gets an opportunity you wanted. You:", options: [
    { text: "Feel genuinely happy for them", score: 0 },
    { text: "Feel competitive but hide it", score: 1 },
    { text: "Analyze how they got it and what you should have done differently", score: 2 },
    { text: "Stay close to them. Their momentum is useful.", score: 3 },
  ]},
  { id: 7, text: "You're at your most comfortable when:", options: [
    { text: "Surrounded by people who like you", score: 0 },
    { text: "Doing meaningful work with good people", score: 1 },
    { text: "Operating independently with clear control over your outcomes", score: 2 },
    { text: "In a position where you have leverage — information, relationships, or options others don't", score: 3 },
  ]},
  { id: 8, text: "A competitor makes a mistake that benefits you. You:", options: [
    { text: "Feel a bit bad for them, honestly", score: 0 },
    { text: "Capitalize on it but don't rub it in", score: 1 },
    { text: "Capitalize fully. That's the game.", score: 2 },
    { text: "You saw it coming. You were already positioned.", score: 3 },
  ]},
  { id: 9, text: "Your approach to information:", options: [
    { text: "Share freely — transparency builds trust", score: 0 },
    { text: "Share what's relevant", score: 1 },
    { text: "Share strategically — give something to get something", score: 2 },
    { text: "Asymmetric information is power. You take it seriously.", score: 3 },
  ]},
  { id: 10, text: "You prefer to:", options: [
    { text: "Be liked by everyone", score: 0 },
    { text: "Be respected by the people who matter", score: 1 },
    { text: "Be underestimated by rivals and depended on by allies", score: 2 },
    { text: "Be the person who quietly determines outcomes", score: 3 },
  ]},
  { id: 11, text: "When you're in a position of power or advantage:", options: [
    { text: "I try to use it to help others", score: 0 },
    { text: "I use it to achieve my goals without hurting people", score: 1 },
    { text: "I consolidate it before doing anything else", score: 2 },
    { text: "I immediately think about how to turn it into more power", score: 3 },
  ]},
  { id: 12, text: "Your natural instinct when you see someone struggling:", options: [
    { text: "Help them immediately", score: 0 },
    { text: "Help if I can, when I can", score: 1 },
    { text: "Assess whether helping benefits me before deciding", score: 2 },
    { text: "Observe what the struggle reveals about them. That's information.", score: 3 },
  ]},
  { id: 13, text: "Long-term, you'd rather be:", options: [
    { text: "Loved", score: 0 },
    { text: "Successful", score: 1 },
    { text: "Feared — or at least, not someone people mess with", score: 2 },
    { text: "Indispensable. The person who can't be removed.", score: 3 },
  ]},
  { id: 14, text: "When you leave a room, you want people to:", options: [
    { text: "Have had a good time", score: 0 },
    { text: "Respect what you contributed", score: 1 },
    { text: "Remember you", score: 2 },
    { text: "Want something from you that they're not sure they can get", score: 3 },
  ]},
  { id: 15, text: "Your honest philosophy on social dynamics:", options: [
    { text: "People are generally good and cooperation benefits everyone", score: 0 },
    { text: "Competition is healthy but so is collaboration", score: 1 },
    { text: "There are predators and prey. I know which one I am.", score: 2 },
    { text: "Most people are playing checkers. A few are playing chess. I know which game I'm in.", score: 3 },
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

export default function SocialPredator({ game }: { game: GameData }) {
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

  // Animal emoji per rank
  const animalEmoji: Record<string, string> = { S: "🦈", A: "🐺", B: "🦊", C: "🐺", D: "🐕" };

  const handleShare = async () => {
    await shareReportStyleResult({
      game,
      clinicalHeader: "Social Predator Assessment",
      scoreNum: finalScore,
      scoreSuffix: "/100",
      rank,
      percentile: pct,
      emoji: animalEmoji[rank.label] ?? "🦈",
      onCopied: shareToast.onCopied,
    });
  };

  if (phase === "done") return (
    <>
      {shareToast.node}
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div className="anim-scale-in" style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", borderTop: `2px solid ${rank.color}`, borderRadius: "var(--radius-xl)", padding: "clamp(24px,5vw,44px) clamp(20px,4vw,40px)", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>Social Predator Assessment</div>
        <div style={{ fontSize: 56, marginBottom: 12 }}>{animalEmoji[rank.label] ?? "🦈"}</div>
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
      <div style={{ fontSize: 56, marginBottom: 16 }}>🦈</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Shark, Wolf, or Golden Retriever?</h2>
      <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 12, lineHeight: 1.7, maxWidth: 380, margin: "0 auto 12px" }}>
        In the social food chain, where do you actually sit? 15 questions. No flattering answers.
      </p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 20 }}>
        {[["🦈", "Apex Shark"], ["🐺", "Lone Wolf"], ["🦊", "The Fox"], ["🐕", "Golden Retriever"]].map(([e, n]) => (
          <div key={n} style={{ background: "var(--bg-elevated)", borderRadius: 8, padding: "6px 10px", textAlign: "center" }}>
            <div style={{ fontSize: 20 }}>{e}</div>
            <div style={{ fontSize: 9, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginTop: 2 }}>{n}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "var(--text-3)", fontSize: 11, fontFamily: "var(--font-mono)", marginBottom: 24 }}>~3 minutes · Answers shuffle every time</p>
      <button onClick={() => { trackPlay(game.id); setShuffleKey(k => k + 1); setPhase("playing"); }} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>▶ FIND YOUR PLACE</button>
    </div>
  );

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>
          <span>{current + 1} / {questions.length}</span>
          <span style={{ color: game.accent }}>FOOD CHAIN CHECK</span>
        </div>
        <div style={{ height: 3, background: "var(--border)", borderRadius: 2, marginBottom: 24 }}>
          <div style={{ height: "100%", width: `${(current / questions.length) * 100}%`, background: game.accent, borderRadius: 2, transition: "width 0.3s" }} />
        </div>
        <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-lg)", padding: "22px 20px", marginBottom: 20 }}>
          <p style={{ fontSize: "clamp(14px,2.5vw,17px)", lineHeight: 1.65, color: "var(--text-1)", fontWeight: 600, margin: 0 }}>{questions[current].text}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {questions[current].options.map((opt, i) => (
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
