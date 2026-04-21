"use client";

import { trackPlay } from "@/lib/tracking";

import { useState, useMemo } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { saveHighScore, generateReportCard, shuffleOptions, type QuizOption } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";

const t = dict.en;

interface Question {
  id: number;
  text: string;
  options: QuizOption[];
}

const RAW_QUESTIONS: Question[] = [
  { id: 1, text: "You walk into a party where you don't know anyone.", options: [
    { text: "Find a corner and survive", score: 0 },
    { text: "Introduce yourself to a few people", score: 1 },
    { text: "Work the room. You've been looking forward to this.", score: 2 },
    { text: "Mentally note who's worth talking to and start there", score: 3 },
  ]},
  { id: 2, text: "Someone tells a story you've already heard. You:", options: [
    { text: "Interrupt with a better version of the story", score: 3 },
    { text: "Listen politely anyway", score: 0 },
    { text: "Gently mention you've heard it", score: 2 },
    { text: "Zone out but nod", score: 1 },
  ]},
  { id: 3, text: "You post something online and it gets zero engagement.", options: [
    { text: "The algorithm is broken. Not you.", score: 3 },
    { text: "Delete it immediately", score: 0 },
    { text: "Post again — maybe they didn't see it", score: 2 },
    { text: "Leave it but feel weird about it", score: 1 },
  ]},
  { id: 4, text: "Your friend cancels plans last minute. You think:", options: [
    { text: "That's fine, I'll find something else", score: 0 },
    { text: "Do they not realize I rearranged my whole day?", score: 3 },
    { text: "A little annoyed but whatever", score: 1 },
    { text: "They should have told me sooner", score: 2 },
  ]},
  { id: 5, text: "Someone is better than you at something you care about. You:", options: [
    { text: "Start looking for reasons their skill doesn't count", score: 3 },
    { text: "Feel genuinely inspired", score: 0 },
    { text: "Feel the need to find something you're better at", score: 2 },
    { text: "Feel a little competitive", score: 1 },
  ]},
  { id: 6, text: "You're in a group meeting. You speak:", options: [
    { text: "Only when you have something specific to add", score: 0 },
    { text: "You run the energy of the room whether or not you meant to", score: 3 },
    { text: "More than average — you usually have good ideas", score: 2 },
    { text: "Your fair share", score: 1 },
  ]},
  { id: 7, text: "Someone gives you critical feedback. Your gut reaction:", options: [
    { text: "They're wrong, or they don't understand the context", score: 3 },
    { text: "Genuine curiosity about what they mean", score: 0 },
    { text: "They probably have an ulterior motive", score: 2 },
    { text: "Slight defensiveness that you quickly suppress", score: 1 },
  ]},
  { id: 8, text: "You're telling a story. How long does it take?", options: [
    { text: "People always say I tell great stories", score: 3 },
    { text: "As short as possible — I hate taking up time", score: 0 },
    { text: "Longer than I planned — details matter", score: 2 },
    { text: "Normal length, I pay attention to the room", score: 1 },
  ]},
  { id: 9, text: "Your friend gets a huge opportunity. Your first thought:", options: [
    { text: "Why didn't that happen to me", score: 3 },
    { text: "Genuinely so happy for them", score: 0 },
    { text: "Wonder if you put in a word for them somehow", score: 2 },
    { text: "Happy for them, tiny bit envious", score: 1 },
  ]},
  { id: 10, text: "Someone doesn't find you funny. You:", options: [
    { text: "They don't get it. Most people do.", score: 3 },
    { text: "Not everyone has to laugh at everything", score: 0 },
    { text: "They must be in a bad mood", score: 2 },
    { text: "Maybe it wasn't a great joke", score: 1 },
  ]},
  { id: 11, text: "You're early to an achievement your peers are still working toward.", options: [
    { text: "It's just part of who you are. People know.", score: 3 },
    { text: "Keep it quiet until someone asks", score: 0 },
    { text: "Find natural ways to bring it up", score: 2 },
    { text: "Mention it if relevant", score: 1 },
  ]},
  { id: 12, text: "A stranger is rude to you for no reason. You:", options: [
    { text: "Consider it a reflection of their character, not yours. Obviously.", score: 3 },
    { text: "Assume they're having a bad day", score: 0 },
    { text: "Think about what you should have said for the rest of the day", score: 2 },
    { text: "Feel briefly bothered then move on", score: 1 },
  ]},
  { id: 13, text: "By the end of meeting someone new, they know:", options: [
    { text: "They're probably still thinking about me", score: 3 },
    { text: "A lot about me, not much about them", score: 2 },
    { text: "A lot about them and not much about me", score: 0 },
    { text: "Pretty even exchange", score: 1 },
  ]},
  { id: 14, text: "Your honest opinion about most people you meet:", options: [
    { text: "You can count the truly interesting ones on one hand", score: 3 },
    { text: "Everyone has something interesting to offer", score: 0 },
    { text: "A lot of people are kind of forgettable", score: 2 },
    { text: "Most are fine, a few are great", score: 1 },
  ]},
  { id: 15, text: "Rules you think apply to you:", options: [
    { text: "The ones that make sense given the situation", score: 3 },
    { text: "All of them", score: 0 },
    { text: "The reasonable ones", score: 2 },
    { text: "Most of them", score: 1 },
  ]},
  { id: 16, text: "When you imagine your future:", options: [
    { text: "It's a lot. You don't say it out loud.", score: 3 },
    { text: "Modest and stable", score: 0 },
    { text: "Something people will notice", score: 2 },
    { text: "Successful in ways that matter to me", score: 1 },
  ]},
  { id: 17, text: "You realized you stopped listening because you were thinking about yourself. How often?", options: [
    { text: "I thought that was just how listening worked", score: 3 },
    { text: "Rarely", score: 0 },
    { text: "More than I'd like to admit", score: 2 },
    { text: "Sometimes", score: 1 },
  ]},
  { id: 18, text: "You're in a photo. You:", options: [
    { text: "You look good. That's the baseline.", score: 3 },
    { text: "Try to avoid being in them", score: 0 },
    { text: "Check if you look good before deciding to keep it", score: 2 },
    { text: "Don't mind either way", score: 1 },
  ]},
  { id: 19, text: "Someone disagrees with you confidently. You:", options: [
    { text: "They haven't seen the full picture yet", score: 3 },
    { text: "Immediately consider they might be right", score: 0 },
    { text: "Dig deeper into your own position", score: 2 },
    { text: "Think about it genuinely before responding", score: 1 },
  ]},
  { id: 20, text: "In your social circle, you're probably:", options: [
    { text: "The one the dynamic shifts around. You've noticed.", score: 3 },
    { text: "The listener / the stable one", score: 0 },
    { text: "The one people come to for advice or energy", score: 2 },
    { text: "One of the group, no specific role", score: 1 },
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

export default function MainCharacter({ game }: { game: GameData }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [current, setCurrent] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [showAd, setShowAd] = useState(false);
  const [shareImg, setShareImg] = useState<string | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [shuffleKey, setShuffleKey] = useState(0);

  // Shuffle options for each question on every new game
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
  const afterAd = () => {
    setShowAd(false); setPhase("idle"); setCurrent(0);
    setTotalScore(0); setShareImg(null); setIsNewBest(false);
    setShuffleKey(k => k + 1); // re-shuffle on retry
  };

  const rank = getRank(finalScore, game);
  const pct = getPercentile(finalScore, game);

  const handleShare = async () => {
    const url = generateReportCard({ gameTitle: game.title, clinicalTitle: game.clinicalTitle, score: finalScore, unit: "/100", rankLabel: rank.label, rankTitle: rank.title, rankSubtitle: rank.subtitle, rankColor: rank.color, percentile: pct, accent: game.accent, siteUrl: t.site.url });
    setShareImg(url);
    if (navigator.share) { try { const blob = await (await fetch(url)).blob(); await navigator.share({ title: "ZAZAZA", text: `My Main Character score: ${finalScore}/100 🎬 Can you beat me? ${t.site.url}`, files: [new File([blob], "result.png", { type: "image/png" })] }); return; } catch { } }
    window.open(url, "_blank");
  };

  if (phase === "done") return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div className="anim-scale-in" style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", borderTop: `2px solid ${rank.color}`, borderRadius: "var(--radius-xl)", padding: "clamp(24px,5vw,44px) clamp(20px,4vw,40px)", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>Main Character Assessment</div>
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
      <div style={{ fontSize: 56, marginBottom: 16 }}>🎬</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Are You the Main Character?</h2>
      <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 20, lineHeight: 1.7, maxWidth: 380, margin: "0 auto 20px" }}>
        20 situations. Pick the most honest answer — not the most flattering one.
      </p>
      <p style={{ color: "var(--text-3)", fontSize: 11, fontFamily: "var(--font-mono)", marginBottom: 24 }}>~3 minutes · Answers shuffle every time · Be real</p>
      <button onClick={() => { trackPlay(game.id); setShuffleKey(k => k + 1); setPhase("playing"); }} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>▶ FIND OUT</button>
    </div>
  );

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>
          <span>{current + 1} / {questions.length}</span>
          <span style={{ color: game.accent }}>MAIN CHARACTER CHECK</span>
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
