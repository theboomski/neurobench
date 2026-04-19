"use client";

import { useState, useMemo } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { saveHighScore, generateReportCard, shuffleOptions, type QuizOption } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";

const t = dict.en;

interface Question { id: number; text: string; options: QuizOption[]; }

const RAW_QUESTIONS: Question[] = [
  { id: 1, text: "You want someone to change their mind. Your first move:", options: [
    { text: "Make your case directly and let them decide", score: 0 },
    { text: "Find the right moment and frame it well", score: 1 },
    { text: "Figure out what they actually want, then connect your ask to that", score: 2 },
    { text: "Plant the idea so it feels like it came from them", score: 3 },
  ]},
  { id: 2, text: "Someone is upset with you. You:", options: [
    { text: "Get defensive first, then apologize", score: 1 },
    { text: "Listen and take accountability", score: 0 },
    { text: "Apologize in a way that subtly makes them feel guilty too", score: 3 },
    { text: "Stay calm while they vent, then reframe what happened", score: 2 },
  ]},
  { id: 3, text: "You notice someone in a group is the real decision-maker, even though they're quiet. You:", options: [
    { text: "Focus your energy on the loudest person", score: 0 },
    { text: "Try to win over the group generally", score: 1 },
    { text: "Find a way to talk to the quiet one separately", score: 2 },
    { text: "Have already been building a relationship with them for weeks", score: 3 },
  ]},
  { id: 4, text: "You give a compliment. It's:", options: [
    { text: "Just a genuine compliment", score: 0 },
    { text: "Genuine, but also good timing", score: 1 },
    { text: "Strategic, but it's also true", score: 2 },
    { text: "Engineered to produce a specific emotional response", score: 3 },
  ]},
  { id: 5, text: "In a conflict, you've ever said something that made the other person question their own memory of events.", options: [
    { text: "No — if I'm wrong, I say so", score: 0 },
    { text: "Not intentionally, but maybe accidentally", score: 1 },
    { text: "Once or twice — I didn't fully realize what I was doing", score: 2 },
    { text: "Yes, and it worked exactly as intended", score: 3 },
  ]},
  { id: 6, text: "Someone does you a small favor. You:", options: [
    { text: "Thank them and that's it", score: 0 },
    { text: "Thank them warmly — goodwill matters", score: 1 },
    { text: "Thank them and mentally file that you have some social credit now", score: 2 },
    { text: "Thank them in a way that implies they'll want to do it again", score: 3 },
  ]},
  { id: 7, text: "You've ever withheld information from someone to maintain an advantage.", options: [
    { text: "No — I'm pretty transparent", score: 0 },
    { text: "In professional settings, occasionally", score: 1 },
    { text: "When the stakes were high, yes", score: 2 },
    { text: "Information control is just good strategy", score: 3 },
  ]},
  { id: 8, text: "Someone is pulling away from you. You:", options: [
    { text: "Give them space and hope they come back", score: 0 },
    { text: "Reach out and ask what's going on", score: 1 },
    { text: "Become slightly more interesting and slightly less available", score: 2 },
    { text: "Engineer a situation where they need you", score: 3 },
  ]},
  { id: 9, text: "You've ever said 'I'm fine' when you were definitely not fine, to make someone worry.", options: [
    { text: "No — I say what I mean", score: 0 },
    { text: "Not to make them worry — just to avoid the conversation", score: 1 },
    { text: "Once or twice, if I'm honest", score: 2 },
    { text: "It's a tool. You use what works.", score: 3 },
  ]},
  { id: 10, text: "You're in a negotiation. Your strategy:", options: [
    { text: "Be honest about what I want and find a fair middle ground", score: 0 },
    { text: "Know my bottom line and don't go below it", score: 1 },
    { text: "Know their bottom line too. Structure the conversation around that.", score: 2 },
    { text: "Control what information they have access to throughout", score: 3 },
  ]},
  { id: 11, text: "A friend made a decision you think is wrong. You:", options: [
    { text: "Tell them honestly and respect whatever they decide", score: 0 },
    { text: "Mention your concern once, then drop it", score: 1 },
    { text: "Say nothing now, but position yourself to be right later", score: 2 },
    { text: "Ask questions that lead them to your conclusion, so they think it's theirs", score: 3 },
  ]},
  { id: 12, text: "Someone frequently cancels on you last minute. You:", options: [
    { text: "Bring it up directly and say it bothers you", score: 0 },
    { text: "Start making backup plans without telling them", score: 1 },
    { text: "Become slightly less available. See if they notice.", score: 2 },
    { text: "Cancel on them first, once, for no reason. Just to recalibrate.", score: 3 },
  ]},
  { id: 13, text: "You've ever made someone feel guilty about something that wasn't really their fault.", options: [
    { text: "No — that's genuinely not something I do", score: 0 },
    { text: "Accidentally, maybe. Not on purpose.", score: 1 },
    { text: "I've stretched the blame attribution before, yes", score: 2 },
    { text: "Guilt is a useful motivator and I've used it deliberately", score: 3 },
  ]},
  { id: 14, text: "When you want someone to like you, you:", options: [
    { text: "Just be myself and see what happens", score: 0 },
    { text: "Find common ground and be warm", score: 1 },
    { text: "Identify what they respond to and give them more of that", score: 2 },
    { text: "Mirror their energy, let them feel understood, and become indispensable", score: 3 },
  ]},
  { id: 15, text: "Reflect honestly: in your closest relationships, who sets the emotional tone?", options: [
    { text: "It genuinely depends on the day", score: 0 },
    { text: "Usually the other person", score: 1 },
    { text: "Usually me, but not intentionally", score: 2 },
    { text: "Me. I've always known this.", score: 3 },
  ]},
  { id: 16, text: "You've ever given someone attention and warmth specifically to get something from them.", options: [
    { text: "No — I don't use people like that", score: 0 },
    { text: "In very low-stakes ways, maybe", score: 1 },
    { text: "In professional contexts, definitely", score: 2 },
    { text: "Yes, and the attention was real. The strategy was also real.", score: 3 },
  ]},
  { id: 17, text: "Someone does something that annoys you. You:", options: [
    { text: "Tell them it annoyed you", score: 0 },
    { text: "Let it go unless it happens again", score: 1 },
    { text: "Say nothing, but adjust how you interact with them going forward", score: 2 },
    { text: "File it. You don't react immediately. You respond when it's useful.", score: 3 },
  ]},
  { id: 18, text: "In a group, you've ever said something that subtly shifted the group's opinion of someone else.", options: [
    { text: "No — I don't talk about people that way", score: 0 },
    { text: "Not deliberately, but it might have happened", score: 1 },
    { text: "Yes, when I thought the group was missing something true", score: 2 },
    { text: "Yes, with a specific outcome in mind", score: 3 },
  ]},
  { id: 19, text: "How often do you think about how others perceive you?", options: [
    { text: "Rarely — I mostly focus on what I think of myself", score: 0 },
    { text: "Sometimes, especially in new situations", score: 1 },
    { text: "Often — I'm aware of my image and manage it deliberately", score: 2 },
    { text: "Always. Perception is reality. I take it seriously.", score: 3 },
  ]},
  { id: 20, text: "Be honest: have you ever love-bombed someone? (Flooded them with attention and affection early on to hook them.)", options: [
    { text: "No — I don't even think I'm capable of that", score: 0 },
    { text: "I've been very enthusiastic early in relationships. Whether that counts, I'm not sure.", score: 1 },
    { text: "Probably yes, looking back", score: 2 },
    { text: "Yes. It's effective. I know exactly what I was doing.", score: 3 },
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

export default function PuppetMaster({ game }: { game: GameData }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [current, setCurrent] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [showAd, setShowAd] = useState(false);
  const [shareImg, setShareImg] = useState<string | null>(null);
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
  const afterAd = () => { setShowAd(false); setPhase("idle"); setCurrent(0); setTotalScore(0); setShareImg(null); setIsNewBest(false); setShuffleKey(k => k + 1); };

  const rank = getRank(finalScore, game);
  const pct = getPercentile(finalScore, game);

  const handleShare = async () => {
    const url = generateReportCard({ gameTitle: game.title, clinicalTitle: game.clinicalTitle, score: finalScore, unit: "/100", rankLabel: rank.label, rankTitle: rank.title, rankSubtitle: rank.subtitle, rankColor: rank.color, percentile: pct, accent: game.accent, siteUrl: t.site.url });
    setShareImg(url);
    if (navigator.share) { try { const blob = await (await fetch(url)).blob(); await navigator.share({ title: "ZAZAZA", text: `I got "${rank.title}" on the Puppet Master test 🎪 Can you beat me? ${t.site.url}`, files: [new File([blob], "result.png", { type: "image/png" })] }); return; } catch { } }
    window.open(url, "_blank");
  };

  if (phase === "done") return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div className="anim-scale-in" style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", borderTop: `2px solid ${rank.color}`, borderRadius: "var(--radius-xl)", padding: "clamp(24px,5vw,44px) clamp(20px,4vw,40px)", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>Social Influence Assessment</div>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎪</div>
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
          <button onClick={handleShare} className="pressable" style={{ background: "var(--bg-elevated)", color: "var(--text-1)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 700, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)" }}>↗ SHARE</button>
        </div>
        {shareImg && <div style={{ marginTop: 24 }}><img src={shareImg} alt="Result" style={{ maxWidth: "100%", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }} /></div>}
      </div>
    </>
  );

  if (phase === "idle") return (
    <div style={{ background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "48px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🎪</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Puppet Master or Puppet?</h2>
      <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 20, lineHeight: 1.7, maxWidth: 380, margin: "0 auto 20px" }}>
        Do you run the room — or does the room run you? 20 questions about how you actually influence people. Be honest.
      </p>
      <p style={{ color: "var(--text-3)", fontSize: 11, fontFamily: "var(--font-mono)", marginBottom: 24 }}>~4 minutes · Answers shuffle every time · Gaslighting section included</p>
      <button onClick={() => { setShuffleKey(k => k + 1); setPhase("playing"); }} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>▶ FIND OUT</button>
    </div>
  );

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>
          <span>{current + 1} / {questions.length}</span>
          <span style={{ color: game.accent }}>PUPPET MASTER CHECK</span>
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
