"use client";

import { trackPlay } from "@/lib/tracking";

import { useState, useMemo } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { saveHighScore, generateReportCard, shuffleOptions, type QuizOption } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";

const t = dict.en;

interface Question { id: number; text: string; options: QuizOption[]; }

// Dark Empath = high empathy + dark strategic use of it
// Questions alternate between empathy capacity and dark application
const RAW_QUESTIONS: Question[] = [
  { id: 1, text: "Someone is upset in a group, but hiding it well. You:", options: [
    { text: "Usually don't notice until they say something", score: 0 },
    { text: "Notice eventually", score: 1 },
    { text: "Notice immediately but say nothing — I file it.", score: 2 },
    { text: "Notice immediately and decide whether it's useful information", score: 3 },
  ]},
  { id: 2, text: "You can tell someone is lying to you. You:", options: [
    { text: "Confront them directly", score: 0 },
    { text: "Ask clarifying questions to give them a chance to correct it", score: 1 },
    { text: "Let them finish. Now you know more about them than they realize.", score: 2 },
    { text: "Play along. Knowing what they're hiding is more valuable than catching them.", score: 3 },
  ]},
  { id: 3, text: "A friend is vulnerable and sharing something painful. Honestly, part of you:", options: [
    { text: "Is fully present — nothing else going through my head", score: 0 },
    { text: "Wonders how to help", score: 1 },
    { text: "Is cataloguing what this reveals about them", score: 2 },
    { text: "Recognizes this as the most honest version of them and stores it", score: 3 },
  ]},
  { id: 4, text: "You're in a conflict. You know exactly what the other person's insecurity is. You:", options: [
    { text: "Never use it — that's a line I don't cross", score: 0 },
    { text: "Avoid it deliberately, but it's there", score: 1 },
    { text: "Have come close. Once.", score: 2 },
    { text: "Have used it. It was effective. I'm aware that says something about me.", score: 3 },
  ]},
  { id: 5, text: "How accurately can you predict how someone will react to news before you tell them?", options: [
    { text: "Poorly — people surprise me a lot", score: 0 },
    { text: "Reasonably well for people I know", score: 1 },
    { text: "Very accurately, even for people I've just met", score: 2 },
    { text: "I usually know exactly how to deliver something to get the reaction I want", score: 3 },
  ]},
  { id: 6, text: "Someone you dislike is going through something hard. You:", options: [
    { text: "Feel genuine compassion regardless", score: 0 },
    { text: "Feel some compassion, despite myself", score: 1 },
    { text: "Observe it without strong feeling either way", score: 2 },
    { text: "Notice the opportunity it creates and feel slightly guilty about noticing", score: 3 },
  ]},
  { id: 7, text: "You meet someone new. Within 10 minutes you've identified:", options: [
    { text: "Their name and rough personality", score: 0 },
    { text: "What kind of person they are", score: 1 },
    { text: "Their insecurities, what they want, and what motivates them", score: 2 },
    { text: "All of the above plus how they could be useful — or dangerous", score: 3 },
  ]},
  { id: 8, text: "You've made someone feel deeply seen and understood. Afterward, you felt:", options: [
    { text: "Good — that's just being a good person", score: 0 },
    { text: "Connected to them", score: 1 },
    { text: "Satisfied — and also aware they'd now do almost anything for you", score: 2 },
    { text: "Like you'd made a precise and deliberate investment", score: 3 },
  ]},
  { id: 9, text: "People tend to open up to you quickly. You think this is because:", options: [
    { text: "I'm genuinely warm and easy to talk to", score: 0 },
    { text: "I listen well and don't judge", score: 1 },
    { text: "I give them exactly what they need to feel safe — I know how to do that", score: 2 },
    { text: "I make them feel understood in a way that creates dependency. I've always known this.", score: 3 },
  ]},
  { id: 10, text: "You can feel other people's emotions strongly. Sometimes that feels like:", options: [
    { text: "A gift — I'm genuinely connected to people", score: 0 },
    { text: "Overwhelming — I absorb too much", score: 1 },
    { text: "Data — I know what they're feeling before they do", score: 2 },
    { text: "An advantage I didn't ask for and have learned to use", score: 3 },
  ]},
  { id: 11, text: "Someone gives you a compliment that feels performative. You:", options: [
    { text: "Accept it at face value", score: 0 },
    { text: "Wonder why they're being extra nice today", score: 1 },
    { text: "Note it, note what they want, and decide whether to play along", score: 2 },
    { text: "Know exactly what they want before the conversation is over", score: 3 },
  ]},
  { id: 12, text: "You've ever withheld emotional support from someone — not because you didn't feel it, but because it wasn't the right time strategically.", options: [
    { text: "No — I give support when people need it", score: 0 },
    { text: "I've been distracted, but not strategic about it", score: 1 },
    { text: "Once or twice, if I'm honest", score: 2 },
    { text: "Timing emotional support correctly is a skill. I use it.", score: 3 },
  ]},
  { id: 13, text: "How do you feel when someone doesn't respond emotionally the way you predicted?", options: [
    { text: "Nothing — people are unpredictable", score: 0 },
    { text: "Surprised", score: 1 },
    { text: "Intrigued — there's something I'm missing", score: 2 },
    { text: "Slightly annoyed. Then I recalibrate.", score: 3 },
  ]},
  { id: 14, text: "You know someone's deepest insecurity. You've never used it against them. But you:", options: [
    { text: "Have genuinely forgotten it — it's not mine to hold", score: 0 },
    { text: "Remember it but have no interest in using it", score: 1 },
    { text: "Remember it and occasionally think about how easy it would be", score: 2 },
    { text: "Remember it, think about it strategically, and haven't used it yet", score: 3 },
  ]},
  { id: 15, text: "After a difficult conversation where you got exactly what you wanted, you feel:", options: [
    { text: "Good — I advocated for myself", score: 0 },
    { text: "Relieved it went well", score: 1 },
    { text: "Satisfied at how precisely it unfolded", score: 2 },
    { text: "The specific pleasure of having mapped someone's psychology correctly", score: 3 },
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

export default function DarkEmpath({ game }: { game: GameData }) {
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
    if (navigator.share) { try { const blob = await (await fetch(url)).blob(); await navigator.share({ title: "ZAZAZA", text: `I got "${rank.title}" on the Dark Empath test 🖤 ${t.site.url}`, files: [new File([blob], "result.png", { type: "image/png" })] }); return; } catch { } }
    window.open(url, "_blank");
  };

  if (phase === "done") return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div className="anim-scale-in" style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", borderTop: `2px solid ${rank.color}`, borderRadius: "var(--radius-xl)", padding: "clamp(24px,5vw,44px) clamp(20px,4vw,40px)", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>Dark Empathy Assessment</div>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🖤</div>
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
      <div style={{ fontSize: 56, marginBottom: 16 }}>🖤</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Dark Empath</h2>
      <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 20, lineHeight: 1.7, maxWidth: 380, margin: "0 auto 20px" }}>
        High empathy. Strategic mind. The rarest personality type — and the most dangerous. 15 questions to find out if you're one of them.
      </p>
      <p style={{ color: "var(--text-3)", fontSize: 11, fontFamily: "var(--font-mono)", marginBottom: 24 }}>~3 minutes · Be honest · Most people think they're not one</p>
      <button onClick={() => { trackPlay(game.id); setShuffleKey(k => k + 1); setPhase("playing"); }} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>▶ FIND OUT</button>
    </div>
  );

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>
          <span>{current + 1} / {questions.length}</span>
          <span style={{ color: game.accent }}>DARK EMPATHY CHECK</span>
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
