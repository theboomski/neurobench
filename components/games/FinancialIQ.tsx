"use client";

import { trackPlay } from "@/lib/tracking";

import { useState, useCallback, useMemo } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { saveHighScore, generateReportCard, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";

const t = dict.en;


function shuffleOpts(options: string[], correct: number) {
  const indexed = options.map((text, i) => ({ text, isCorrect: i === correct }));
  for (let i = indexed.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }
  return indexed;
}


const QUESTIONS = [
  {
    id: 1, level: "Basic",
    question: "You invest $1,000 at 5% annual interest, compounded yearly. After 2 years, you have approximately:",
    options: ["$1,050", "$1,100", "$1,102", "$1,150"],
    correct: 2,
    explanation: "$1,000 × 1.05 × 1.05 = $1,102.50. Compounding means you earn interest on your interest — the key to long-term wealth."
  },
  {
    id: 2, level: "Basic",
    question: "Inflation is running at 3% per year. If you keep $10,000 in a non-interest savings account for 10 years, its real purchasing power will be approximately:",
    options: ["$10,000", "$9,700", "$7,440", "$6,000"],
    correct: 2,
    explanation: "$10,000 × (0.97)^10 ≈ $7,374. Inflation silently destroys wealth sitting idle — a critical concept most people underestimate."
  },
  {
    id: 3, level: "Basic",
    question: "Diversification across asset classes (stocks, bonds, real estate) primarily:",
    options: ["Guarantees higher returns", "Eliminates all investment risk", "Reduces portfolio volatility without proportionally reducing returns", "Is only for wealthy investors"],
    correct: 2,
    explanation: "Diversification reduces unsystematic (specific) risk. It doesn't eliminate market risk, but it optimizes the risk/return ratio — the core of Modern Portfolio Theory."
  },
  {
    id: 4, level: "Intermediate",
    question: "The 'Rule of 72' states that dividing 72 by your annual return rate gives you approximately:",
    options: ["Your expected annual profit", "The number of years to double your money", "Your tax liability", "Your maximum safe withdrawal rate"],
    correct: 1,
    explanation: "At 8% annual return, your money doubles in approximately 72 ÷ 8 = 9 years. Simple but powerful for mental math on compound growth."
  },
  {
    id: 5, level: "Intermediate",
    question: "An expense ratio of 1% vs 0.05% on an index fund seems trivial. Over 30 years on a $100,000 investment at 7% gross return, the difference in ending wealth is approximately:",
    options: ["$3,000", "$15,000", "$120,000", "$240,000"],
    correct: 2,
    explanation: "A 1% fee compounds to devastating losses. At 7% net: ~$761,000. At 6% net (1% fee): ~$574,000. Difference: ~$187,000. Fees are the silent wealth destroyers."
  },
  {
    id: 6, level: "Intermediate",
    question: "What is dollar-cost averaging (DCA)?",
    options: ["Investing a lump sum when markets are low", "Investing fixed amounts at regular intervals regardless of price", "Borrowing to invest when rates are low", "Converting investments to dollars during volatility"],
    correct: 1,
    explanation: "DCA removes the need to time the market by automatically buying more shares when prices are low and fewer when high. It reduces the impact of volatility on entry prices."
  },
  {
    id: 7, level: "Intermediate",
    question: "A P/E ratio of 30 compared to a historical average of 15 for a stock means:",
    options: ["The stock is definitely overvalued", "Investors are paying a premium for expected growth", "The company is losing money", "The dividend yield is 30%"],
    correct: 1,
    explanation: "P/E ratio = Price / Earnings per share. A high P/E reflects growth expectations, not necessarily overvaluation. Context (sector, growth rate, interest rates) matters enormously."
  },
  {
    id: 8, level: "Advanced",
    question: "Tax-loss harvesting involves:",
    options: ["Avoiding all capital gains taxes", "Selling losing investments to offset capital gains tax liability", "Investing in tax-free government bonds only", "Moving assets offshore to minimize taxes"],
    correct: 1,
    explanation: "By realizing losses strategically, you can offset capital gains and reduce tax liability. You can then reinvest in similar (not identical) assets to maintain market exposure — a legal, powerful wealth-preservation strategy."
  },
  {
    id: 9, level: "Advanced",
    question: "The Sharpe Ratio measures:",
    options: ["Total portfolio return", "Return relative to risk taken (excess return per unit of volatility)", "How sharp an asset's price movements are", "The ratio of stocks to bonds in a portfolio"],
    correct: 1,
    explanation: "Sharpe = (Portfolio Return – Risk-Free Rate) / Standard Deviation. It reveals whether returns are due to smart risk-taking or just taking excessive risk. Higher is better."
  },
  {
    id: 10, level: "Advanced",
    question: "In a rising interest rate environment, existing bond prices typically:",
    options: ["Rise, because bonds become more attractive", "Fall, because new bonds offer higher yields", "Stay the same — bonds are fixed income", "Double, due to increased demand"],
    correct: 1,
    explanation: "Bond prices and interest rates move inversely. When new bonds offer 5%, existing bonds yielding 3% become less attractive, so their market price drops to equalize yield."
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

const LEVEL_COLORS: Record<string, string> = { Basic: "#10B981", Intermediate: "#F59E0B", Advanced: "#EF4444" };
type Phase = "idle" | "playing" | "done";

export default function FinancialIQ({ game }: { game: GameData }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [current, setCurrent] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showAd, setShowAd] = useState(false);
  const [shareImg, setShareImg] = useState<string | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [isNewBest, setIsNewBest] = useState(false);

  const [shuffleKey, setShuffleKey] = useState(0);

  const shuffledQs = useMemo(() =>
    QUESTIONS.map(q => ({ ...q, shuffledOptions: shuffleOpts(q.options, q.correct) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shuffleKey]
  );
  const q = shuffledQs[current];

  const handleAnswer = useCallback((idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    const isCorrect = q.shuffledOptions[idx].isCorrect;
    if (isCorrect) playBeep("tap");
    const newCorrect = isCorrect ? correct + 1 : correct;
    setCorrect(newCorrect);
    setShowExplanation(true);

    setTimeout(() => {
      setShowExplanation(false);
      if (current + 1 >= QUESTIONS.length) {
        const score = Math.round((newCorrect / QUESTIONS.length) * 100);
        setFinalScore(score);
        const isNew = saveHighScore(game.id, score);
        setIsNewBest(isNew);
        setPhase("done");
      } else {
        setCurrent(c => c + 1);
        setSelected(null);
      }
    }, 2000);
  }, [selected, q, correct, current, game.id]);

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setCurrent(0); setCorrect(0); setSelected(null); setShareImg(null); setIsNewBest(false); setShuffleKey(k => k + 1); };

  const rank = getRank(finalScore, game);
  const pct = getPercentile(finalScore, game);

  const handleShare = async () => {
    const url = generateReportCard({ gameTitle: game.title, clinicalTitle: game.clinicalTitle, score: finalScore, unit: "%", rankLabel: rank.label, rankTitle: rank.title, rankSubtitle: rank.subtitle, rankColor: rank.color, percentile: pct, accent: game.accent, siteUrl: t.site.url });
    setShareImg(url);
    if (navigator.share) { try { const blob = await (await fetch(url)).blob(); await navigator.share({ title: "ZAZAZA", text: `My Financial IQ: ${finalScore}% 🏦 Can you beat me? ${t.site.url}`, files: [new File([blob], "result.png", { type: "image/png" })] }); return; } catch { } }
    window.open(url, "_blank");
  };

  if (phase === "done") return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div className="anim-scale-in" style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", borderTop: `2px solid ${rank.color}`, borderRadius: "var(--radius-xl)", padding: "clamp(24px,5vw,44px) clamp(20px,4vw,40px)", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 16 }}>Financial Literacy Assessment</div>
        <div style={{ width: 100, height: 100, borderRadius: "50%", background: `${rank.color}15`, border: `2px solid ${rank.color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
          <span style={{ fontSize: 42, fontWeight: 900, color: rank.color, lineHeight: 1 }}>{rank.label}</span>
          <span style={{ fontSize: 9, color: rank.color, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "var(--font-mono)" }}>{rank.percentileLabel}</span>
        </div>
        <div style={{ fontSize: "clamp(48px,12vw,72px)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, marginBottom: 4 }}>
          {finalScore}<span style={{ fontSize: 18, fontWeight: 400, color: "var(--text-3)", marginLeft: 4, fontFamily: "var(--font-mono)" }}>%</span>
        </div>
        <div style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 8 }}>{correct} / {QUESTIONS.length} correct</div>
        <div style={{ fontSize: 13, color: game.accent, fontWeight: 700, marginBottom: 6, fontFamily: "var(--font-mono)" }}>TOP {100 - pct}% GLOBALLY</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: rank.color, marginBottom: 4 }}>{rank.title}</div>
        <div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic", marginBottom: 20 }}>&quot;{rank.subtitle}&quot;</div>
        {isNewBest && <div style={{ display: "inline-block", background: `${game.accent}12`, border: `1px solid ${game.accent}30`, color: game.accent, fontSize: 11, fontWeight: 700, padding: "3px 14px", borderRadius: 999, marginBottom: 16, fontFamily: "var(--font-mono)" }}>◆ New Personal Record</div>}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={handleRetry} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 800, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)" }}>▶ PLAY AGAIN</button>
          <button onClick={handleShare} className="pressable" style={{ background: "var(--bg-elevated)", color: "var(--text-1)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 700, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)" }}>↗ SHARE</button>
        </div>
        {shareImg && <div style={{ marginTop: 24 }}><img src={shareImg} alt="Result" style={{ maxWidth: "100%", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }} /></div>}
      </div>
    </>
  );

  if (phase === "idle") return (
    <div style={{ background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "48px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🏦</div>
      <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Financial IQ Test</h2>
      <p style={{ color: "var(--text-2)", fontSize: 14, marginBottom: 16, lineHeight: 1.7, maxWidth: 380, margin: "0 auto 16px" }}>
        10 questions from Basic to Advanced. Compound interest, inflation, diversification, P/E ratios, tax-loss harvesting. Each answer includes an explanation. Most people fail.
      </p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24 }}>
        {["🟢 Basic", "🟡 Intermediate", "🔴 Advanced"].map(l => (
          <div key={l} style={{ background: "var(--bg-elevated)", borderRadius: 999, padding: "4px 12px", fontSize: 11, color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>{l}</div>
        ))}
      </div>
      <p style={{ color: "var(--text-3)", fontSize: 11, fontFamily: "var(--font-mono)", marginBottom: 24 }}>~5 minutes · Learn while you play</p>
      <button onClick={() => { trackPlay(game.id); setShuffleKey(k => k + 1); setPhase("playing"); }} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>▶ BEGIN TEST</button>
    </div>
  );

  const levelColor = LEVEL_COLORS[q.level] ?? "#94A3B8";

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-3)" }}>
          <span>{current + 1} / {QUESTIONS.length}</span>
          <span style={{ color: levelColor }}>{q.level.toUpperCase()}</span>
        </div>
        <div style={{ height: 3, background: "var(--border)", borderRadius: 2, marginBottom: 24 }}>
          <div style={{ height: "100%", width: `${(current / QUESTIONS.length) * 100}%`, background: game.accent, borderRadius: 2, transition: "width 0.3s" }} />
        </div>
        <div style={{ background: "var(--bg-elevated)", borderLeft: `3px solid ${levelColor}`, borderRadius: "var(--radius-md)", padding: "18px 16px", marginBottom: 20 }}>
          <p style={{ fontSize: "clamp(13px,2.5vw,15px)", lineHeight: 1.65, color: "var(--text-1)", margin: 0, fontWeight: 500 }}>{q.question}</p>
        </div>

        {showExplanation && (
          <div style={{ background: selected === q.correct ? "#10B98115" : "#EF444415", border: `1px solid ${selected === q.correct ? "#10B981" : "#EF4444"}`, borderRadius: "var(--radius-md)", padding: "14px 16px", marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: selected === q.correct ? "#10B981" : "#EF4444", fontFamily: "var(--font-mono)", marginBottom: 6 }}>
              {selected === q.correct ? "✓ CORRECT" : "✗ INCORRECT"}
            </div>
            <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.7, margin: 0 }}>{q.explanation}</p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {q.shuffledOptions.map((opt, i) => {
            const isSelected = selected === i;
            const showCorrect = selected !== null && opt.isCorrect;
            const showWrong = selected !== null && isSelected && !opt.isCorrect;
            return (
              <button key={i} onClick={() => handleAnswer(i)} disabled={selected !== null} className="pressable"
                style={{
                  padding: "13px 16px", fontSize: 13, cursor: selected !== null ? "default" : "pointer",
                  background: showCorrect ? "#10B98118" : showWrong ? "#EF444418" : "var(--bg-card)",
                  border: `1.5px solid ${showCorrect ? "#10B981" : showWrong ? "#EF4444" : "var(--border)"}`,
                  borderRadius: "var(--radius-md)", color: showCorrect ? "#10B981" : showWrong ? "#EF4444" : "var(--text-2)",
                  textAlign: "left", display: "flex", alignItems: "center", gap: 12, transition: "all 0.15s",
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
