"use client";

import { useState } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { saveHighScore, generateReportCard } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";

const t = dict.en;

// Forced-choice pairs — each choice awards a point to one love language
// W=Words, T=Time, G=Gifts, A=Acts, P=Physical
const PAIRS = [
  { a: { text: "Hearing 'I love you' and being complimented", lang: "W" }, b: { text: "Receiving a thoughtful, unexpected gift", lang: "G" } },
  { a: { text: "Someone doing a chore you hate without being asked", lang: "A" }, b: { text: "Getting a long hug after a hard day", lang: "P" } },
  { a: { text: "Undivided attention — phone away, eyes on you", lang: "T" }, b: { text: "A heartfelt message or letter", lang: "W" } },
  { a: { text: "A small gift that shows they were thinking of you", lang: "G" }, b: { text: "Someone clearing your schedule to spend time with you", lang: "T" } },
  { a: { text: "A spontaneous kiss or touch on the shoulder", lang: "P" }, b: { text: "Hearing exactly why they love you, specifically", lang: "W" } },
  { a: { text: "Someone cooking your favorite meal", lang: "A" }, b: { text: "A long drive just talking together", lang: "T" } },
  { a: { text: "Being brought a coffee the way you like it", lang: "G" }, b: { text: "Sitting together in comfortable silence, just being close", lang: "P" } },
  { a: { text: "A public compliment that makes you feel seen", lang: "W" }, b: { text: "Someone handling a stressful task so you don't have to", lang: "A" } },
  { a: { text: "Being held during a difficult moment", lang: "P" }, b: { text: "Someone planning a whole day just for the two of you", lang: "T" } },
  { a: { text: "A surprise present that shows real thought", lang: "G" }, b: { text: "Someone doing something you've mentioned needing done for weeks", lang: "A" } },
  { a: { text: "Someone verbally acknowledging your effort and hard work", lang: "W" }, b: { text: "Physical affection — holding hands, a back rub, a hug", lang: "P" } },
  { a: { text: "Quality time doing something you both love", lang: "T" }, b: { text: "A meaningful, perfectly chosen gift", lang: "G" } },
  { a: { text: "Someone taking care of something practical when you're overwhelmed", lang: "A" }, b: { text: "Being told explicitly that you matter and why", lang: "W" } },
  { a: { text: "A gentle touch to check you're okay", lang: "P" }, b: { text: "Someone clearing distractions to give you their full focus", lang: "T" } },
  { a: { text: "Receiving something that shows they remembered a detail", lang: "G" }, b: { text: "Someone handling logistics so you can rest", lang: "A" } },
];

const LANG_INFO: Record<string, { name: string; color: string; emoji: string; desc: string }> = {
  W: { name: "Words of Affirmation", color: "#F43F5E", emoji: "💬", desc: "Verbal expressions of love, praise, and appreciation mean the most to you." },
  T: { name: "Quality Time", color: "#8B5CF6", emoji: "⏱️", desc: "Undivided attention and meaningful shared experiences are how you feel loved." },
  G: { name: "Receiving Gifts", color: "#F59E0B", emoji: "🎁", desc: "Thoughtful, symbolic gifts — not the price — communicate love and care to you." },
  A: { name: "Acts of Service", color: "#10B981", emoji: "🤝", desc: "Actions speak louder than words. Help, effort, and thoughtfulness show love." },
  P: { name: "Physical Touch", color: "#06B6D4", emoji: "🫶", desc: "Physical connection — touch, hugs, closeness — is how you feel safe and loved." },
};

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

export default function LoveLanguage({ game }: { game: GameData }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [current, setCurrent] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({ W: 0, T: 0, G: 0, A: 0, P: 0 });
  const [showAd, setShowAd] = useState(false);
  const [shareImg, setShareImg] = useState<string | null>(null);
  const [primary, setPrimary] = useState("");
  const [secondary, setSecondary] = useState("");
  const [isNewBest, setIsNewBest] = useState(false);

  const pair = PAIRS[current];

  const handleChoice = (lang: string) => {
    const newScores = { ...scores, [lang]: scores[lang] + 1 };
    setScores(newScores);

    if (current + 1 >= PAIRS.length) {
      const sorted = Object.entries(newScores).sort((a, b) => b[1] - a[1]);
      const prim = sorted[0][0];
      const sec = sorted[1][0];
      setPrimary(prim);
      setSecondary(sec);
      const score = Math.round((newScores[prim] / PAIRS.length) * 100);
      const isNew = saveHighScore(game.id, score);
      setIsNewBest(isNew);
      setPhase("done");
    } else {
      setCurrent(c => c + 1);
    }
  };

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setCurrent(0); setScores({ W: 0, T: 0, G: 0, A: 0, P: 0 }); setShareImg(null); setIsNewBest(false); };

  const primaryInfo = LANG_INFO[primary];
  const secondaryInfo = LANG_INFO[secondary];
  const totalScore = primaryInfo ? Math.round((scores[primary] / PAIRS.length) * 100) : 0;
  const rank = getRank(totalScore, game);
  const pct = getPercentile(totalScore, game);

  const handleShare = async () => {
    const url = generateReportCard({ gameTitle: game.title, clinicalTitle: game.clinicalTitle, score: totalScore, unit: "%", rankLabel: rank.label, rankTitle: primaryInfo?.name ?? "", rankSubtitle: primaryInfo?.desc ?? "", rankColor: primaryInfo?.color ?? game.accent, percentile: pct, accent: game.accent, siteUrl: t.site.url });
    setShareImg(url);
    if (navigator.share) { try { const blob = await (await fetch(url)).blob(); await navigator.share({ title: "ZAZAZA", text: `My love language: ${primaryInfo?.name} 💌 Can you beat me? ${t.site.url}`, files: [new File([blob], "result.png", { type: "image/png" })] }); return; } catch { } }
    window.open(url, "_blank");
  };

  if (phase === "done" && primaryInfo) return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div className="anim-scale-in" style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", borderTop: `2px solid ${primaryInfo.color}`, borderRadius: "var(--radius-xl)", padding: "clamp(24px,5vw,44px) clamp(20px,4vw,40px)", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>Love Language Assessment</div>
        <div style={{ fontSize: 52, marginBottom: 12 }}>{primaryInfo.emoji}</div>
        <div style={{ fontSize: "clamp(18px,4vw,24px)", fontWeight: 900, color: primaryInfo.color, marginBottom: 8, letterSpacing: "-0.02em" }}>{primaryInfo.name}</div>
        <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.7, marginBottom: 20, maxWidth: 360, margin: "0 auto 20px" }}>{primaryInfo.desc}</p>

        {/* Score bars */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24, textAlign: "left" }}>
          {Object.entries(scores).sort((a, b) => b[1] - a[1]).map(([lang, score]) => {
            const info = LANG_INFO[lang];
            const pct2 = Math.round((score / PAIRS.length) * 100);
            return (
              <div key={lang}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 12, color: lang === primary ? info.color : "var(--text-2)", fontWeight: lang === primary ? 700 : 400 }}>{info.emoji} {info.name}</span>
                  <span style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{score}/{PAIRS.length}</span>
                </div>
                <div style={{ height: 4, background: "var(--border)", borderRadius: 2 }}>
                  <div style={{ height: "100%", width: `${pct2}%`, background: lang === primary ? info.color : "var(--border-md)", borderRadius: 2, transition: "width 0.5s" }} />
                </div>
              </div>
            );
          })}
        </div>

        {secondaryInfo && (
          <div style={{ background: "var(--bg-elevated)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, textAlign: "left" }}>
            <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>SECONDARY LANGUAGE</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: secondaryInfo.color }}>{secondaryInfo.emoji} {secondaryInfo.name}</div>
          </div>
        )}

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
      <div style={{ fontSize: 56, marginBottom: 16 }}>💌</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Love Language Test</h2>
      <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 16, lineHeight: 1.7, maxWidth: 380, margin: "0 auto 16px" }}>
        15 forced-choice questions. Choose what would make you feel most loved. Based on Gary Chapman's Five Love Languages framework.
      </p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 24 }}>
        {Object.values(LANG_INFO).map(l => (
          <div key={l.name} style={{ background: "var(--bg-elevated)", borderRadius: 999, padding: "4px 12px", fontSize: 11, color: l.color, fontFamily: "var(--font-mono)", fontWeight: 600 }}>{l.emoji} {l.name.split(' ')[0]}</div>
        ))}
      </div>
      <p style={{ color: "var(--text-3)", fontSize: 11, fontFamily: "var(--font-mono)", marginBottom: 24 }}>~2 minutes · Share with your partner</p>
      <button onClick={() => setPhase("playing")} className="pressable" style={{ background: game.accent, color: "#fff", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>▶ BEGIN TEST</button>
    </div>
  );

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>
          <span>{current + 1} / {PAIRS.length}</span>
          <span style={{ color: game.accent }}>CHOOSE ONE</span>
        </div>
        <div style={{ height: 3, background: "var(--border)", borderRadius: 2, marginBottom: 24 }}>
          <div style={{ height: "100%", width: `${(current / PAIRS.length) * 100}%`, background: game.accent, borderRadius: 2, transition: "width 0.3s" }} />
        </div>
        <p style={{ fontSize: 13, color: "var(--text-3)", fontFamily: "var(--font-mono)", textAlign: "center", marginBottom: 16 }}>Which would make you feel MORE loved?</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[pair.a, pair.b].map((opt, i) => (
            <button key={i} onClick={() => handleChoice(opt.lang)} className="pressable"
              style={{ padding: "20px 18px", background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-lg)", fontSize: 14, color: "var(--text-1)", cursor: "pointer", textAlign: "left", lineHeight: 1.6, transition: "all 0.15s" }}>
              {opt.text}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
