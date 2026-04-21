"use client";

import { trackPlay } from "@/lib/tracking";

import { useState } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { saveHighScore, generateReportCard } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";

const t = dict.en;

// ECR-based: Anxiety (A) and Avoidance (V) dimensions
const QUESTIONS = [
  { id: 1,  text: "I prefer not to share my feelings with my partner.", dim: "V" },
  { id: 2,  text: "I worry a lot about my relationships.", dim: "A" },
  { id: 3,  text: "I find it difficult to depend on romantic partners.", dim: "V" },
  { id: 4,  text: "I worry about being abandoned.", dim: "A" },
  { id: 5,  text: "I prefer not to be too close to my partner.", dim: "V" },
  { id: 6,  text: "I need a lot of reassurance that I am loved.", dim: "A" },
  { id: 7,  text: "I don't feel comfortable opening up to my partner.", dim: "V" },
  { id: 8,  text: "I often worry that my partner doesn't really love me.", dim: "A" },
  { id: 9,  text: "I find it difficult to allow myself to depend on others.", dim: "V" },
  { id: 10, text: "I often wish that my partner's feelings for me were as strong as my feelings for them.", dim: "A" },
  { id: 11, text: "I feel comfortable depending on romantic partners.", dim: "V", reverse: true },
  { id: 12, text: "I don't often worry about being abandoned.", dim: "A", reverse: true },
  { id: 13, text: "I am nervous when partners get too close to me.", dim: "V" },
  { id: 14, text: "I get frustrated when my partner is not around as much as I would like.", dim: "A" },
  { id: 15, text: "I feel comfortable sharing my private thoughts and feelings with my partner.", dim: "V", reverse: true },
  { id: 16, text: "My desire to be very close sometimes scares people away.", dim: "A" },
  { id: 17, text: "I try to avoid being too close to my partner.", dim: "V" },
  { id: 18, text: "I find that my partner doesn't want to get as close as I would like.", dim: "A" },
  { id: 19, text: "It's not difficult for me to get close to my partner.", dim: "V", reverse: true },
  { id: 20, text: "Sometimes I feel that I pressure my partner for more intimacy and commitment.", dim: "A" },
  { id: 21, text: "I find it relatively easy to get close to my partner.", dim: "V", reverse: true },
  { id: 22, text: "I worry that I won't measure up to other people.", dim: "A" },
  { id: 23, text: "I prefer not to be too intimate with romantic partners.", dim: "V" },
  { id: 24, text: "I feel that my partner only wants to be with me to avoid being alone.", dim: "A" },
];

const LABELS = ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"];

function getStyle(anxiety: number, avoidance: number): { style: string; color: string; desc: string } {
  if (anxiety < 50 && avoidance < 50) return { style: "Secure", color: "#10B981", desc: "Low anxiety, low avoidance — the most adaptive attachment pattern." };
  if (anxiety >= 50 && avoidance < 50) return { style: "Anxious-Preoccupied", color: "#EC4899", desc: "High anxiety, low avoidance — craves closeness but fears abandonment." };
  if (anxiety < 50 && avoidance >= 50) return { style: "Dismissive-Avoidant", color: "#8B5CF6", desc: "Low anxiety, high avoidance — values independence, minimizes connection needs." };
  return { style: "Fearful-Avoidant", color: "#EF4444", desc: "High anxiety, high avoidance — wants closeness but is terrified of it." };
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

type Phase = "idle" | "playing" | "done";

export default function AttachmentStyle({ game }: { game: GameData }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showAd, setShowAd] = useState(false);
  const [shareImg, setShareImg] = useState<string | null>(null);
  const [result, setResult] = useState({ anxiety: 0, avoidance: 0, style: "", color: "", desc: "", score: 0 });
  const [isNewBest, setIsNewBest] = useState(false);

  const q = QUESTIONS[current];

  const handleAnswer = (val: number) => {
    const newAnswers = { ...answers, [q.id]: val };
    setAnswers(newAnswers);

    if (current + 1 >= QUESTIONS.length) {
      let A = 0, Ac = 0, V = 0, Vc = 0;
      QUESTIONS.forEach(q => {
        const raw = newAnswers[q.id] ?? 3;
        const score = q.reverse ? (6 - raw) : raw;
        if (q.dim === "A") { A += score; Ac++; }
        else { V += score; Vc++; }
      });
      const anxietyPct = Math.round(((A - Ac) / (Ac * 4)) * 100);
      const avoidancePct = Math.round(((V - Vc) / (Vc * 4)) * 100);
      const { style, color, desc } = getStyle(anxietyPct, avoidancePct);
      // Score: security = low anxiety + low avoidance
      const score = Math.max(0, 100 - Math.round((anxietyPct + avoidancePct) / 2));
      setResult({ anxiety: anxietyPct, avoidance: avoidancePct, style, color, desc, score });
      const isNew = saveHighScore(game.id, score);
      setIsNewBest(isNew);
      setPhase("done");
    } else {
      setCurrent(c => c + 1);
    }
  };

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setCurrent(0); setAnswers({}); setShareImg(null); setIsNewBest(false); };

  const rank = getRank(result.score, game);
  const pct = getPercentile(result.score, game);

  const handleShare = async () => {
    const url = generateReportCard({ gameTitle: game.title, clinicalTitle: game.clinicalTitle, score: result.score, unit: "%", rankLabel: rank.label, rankTitle: result.style, rankSubtitle: result.desc, rankColor: result.color, percentile: pct, accent: game.accent, siteUrl: t.site.url });
    setShareImg(url);
    if (navigator.share) { try { const blob = await (await fetch(url)).blob(); await navigator.share({ title: "ZAZAZA", text: `My attachment style: ${result.style} 💔 Can you beat me? ${t.site.url}`, files: [new File([blob], "result.png", { type: "image/png" })] }); return; } catch { } }
    window.open(url, "_blank");
  };

  if (phase === "done") return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div className="anim-scale-in" style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", borderTop: `2px solid ${result.color}`, borderRadius: "var(--radius-xl)", padding: "clamp(24px,5vw,44px) clamp(20px,4vw,40px)", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>Adult Attachment Assessment</div>
        <div style={{ fontSize: "clamp(20px,5vw,28px)", fontWeight: 900, color: result.color, marginBottom: 8, letterSpacing: "-0.02em" }}>{result.style}</div>
        <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7, marginBottom: 24, maxWidth: 360, margin: "0 auto 24px" }}>{result.desc}</p>

        {/* Axes visualization */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          {[
            { label: "Attachment Anxiety", val: result.anxiety, color: "#EC4899", low: "Secure", high: "Preoccupied" },
            { label: "Attachment Avoidance", val: result.avoidance, color: "#8B5CF6", low: "Secure", high: "Dismissive" },
          ].map(s => (
            <div key={s.label} style={{ background: "var(--bg-elevated)", borderRadius: 10, padding: "14px 12px" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", textTransform: "uppercase", marginBottom: 6 }}>{s.label}</div>
              <div style={{ height: 4, background: "var(--border)", borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${s.val}%`, background: s.color, borderRadius: 2 }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 9, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>Low</span>
                <span style={{ fontSize: 9, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>High</span>
              </div>
            </div>
          ))}
        </div>

        {/* 2x2 grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 20 }}>
          {[
            { style: "Secure", color: "#10B981", ax: "Low A", av: "Low V" },
            { style: "Anxious", color: "#EC4899", ax: "High A", av: "Low V" },
            { style: "Avoidant", color: "#8B5CF6", ax: "Low A", av: "High V" },
            { style: "Fearful", color: "#EF4444", ax: "High A", av: "High V" },
          ].map(s => (
            <div key={s.style} style={{ background: s.style === result.style.split('-')[0] || result.style.includes(s.style) ? `${s.color}20` : "var(--bg-elevated)", border: `1px solid ${s.style === result.style.split('-')[0] || result.style.includes(s.style) ? s.color : "transparent"}`, borderRadius: 8, padding: "8px 10px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: s.color }}>{s.style}</div>
              <div style={{ fontSize: 9, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{s.ax} · {s.av}</div>
            </div>
          ))}
        </div>

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
      <div style={{ fontSize: 56, marginBottom: 16 }}>💔</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Attachment Style Test</h2>
      <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 16, lineHeight: 1.7, maxWidth: 380, margin: "0 auto 16px" }}>
        24 questions based on the ECR attachment scale. Your attachment style — formed in childhood — explains almost everything about your relationships.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, maxWidth: 300, margin: "0 auto 24px" }}>
        {[["🟢 Secure", "Low A · Low V"], ["💗 Anxious", "High A · Low V"], ["🟣 Avoidant", "Low A · High V"], ["🔴 Fearful", "High A · High V"]].map(([s, d]) => (
          <div key={s} style={{ background: "var(--bg-elevated)", borderRadius: 8, padding: "8px 10px", textAlign: "left" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-1)" }}>{s}</div>
            <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{d}</div>
          </div>
        ))}
      </div>
      <p style={{ color: "var(--text-3)", fontSize: 11, fontFamily: "var(--font-mono)", marginBottom: 24 }}>~4 minutes · Based on ECR scale (Brennan et al. 1998)</p>
      <button onClick={() => { trackPlay(game.id); setPhase("playing"); }} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>▶ BEGIN ASSESSMENT</button>
    </div>
  );

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>
          <span>{current + 1} / {QUESTIONS.length}</span>
          <span style={{ color: q.dim === "A" ? "#EC4899" : "#8B5CF6" }}>{q.dim === "A" ? "ANXIETY" : "AVOIDANCE"}</span>
        </div>
        <div style={{ height: 3, background: "var(--border)", borderRadius: 2, marginBottom: 24 }}>
          <div style={{ height: "100%", width: `${(current / QUESTIONS.length) * 100}%`, background: game.accent, borderRadius: 2, transition: "width 0.3s" }} />
        </div>
        <div style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-lg)", padding: "22px 20px", marginBottom: 24, minHeight: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ fontSize: "clamp(13px,2.5vw,16px)", lineHeight: 1.65, color: "var(--text-1)", fontWeight: 500, margin: 0, textAlign: "center" }}>
            &quot;{q.text}&quot;
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {LABELS.map((label, i) => (
            <button key={i} onClick={() => handleAnswer(i + 1)} className="pressable"
              style={{ padding: "13px 18px", background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-md)", fontSize: 13, color: "var(--text-2)", cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-3)", minWidth: 16 }}>{i + 1}</span>
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
