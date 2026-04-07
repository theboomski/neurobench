"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { getHighScore, saveHighScore, generateReportCard, playBeep } from "@/lib/gameUtils";
import InterstitialAd from "@/components/InterstitialAd";

const t = dict.en;
const DURATION = 60;

function getRank(score: number, game: GameData) {
  const ranks = [...game.stats.ranks].reverse();
  return ranks.find(r => score >= r.maxMs) ?? game.stats.ranks[game.stats.ranks.length - 1];
}
function getPercentile(score: number, game: GameData): number {
  const pts = game.stats.percentiles;
  if (score >= pts[0].ms) return pts[0].percentile;
  if (score <= pts[pts.length - 1].ms) return pts[pts.length - 1].percentile;
  for (let i = 0; i < pts.length - 1; i++) {
    if (score <= pts[i].ms && score >= pts[i + 1].ms) {
      const t2 = (pts[i].ms - score) / (pts[i].ms - pts[i + 1].ms);
      return Math.round(pts[i].percentile - t2 * (pts[i].percentile - pts[i + 1].percentile));
    }
  }
  return 50;
}

const WORDS = [
  "the","be","to","of","and","a","in","that","have","it","for","not","on","with","he","as","you","do","at","this",
  "but","his","by","from","they","we","say","her","she","or","an","will","my","one","all","would","there","their",
  "what","so","up","out","if","about","who","get","which","go","me","when","make","can","like","time","no","just",
  "him","know","take","people","into","year","your","good","some","could","them","see","other","than","then","now",
  "look","only","come","its","over","think","also","back","after","use","two","how","our","work","first","well","way",
  "even","new","want","because","any","these","give","day","most","us","great","between","need","large","often","hand",
  "high","place","hold","small","real","life","few","north","open","seem","together","next","white","children","begin",
  "got","walk","example","ease","paper","group","always","music","those","both","mark","book","letter","until","mile"
];

function generateText(wordCount = 80): string {
  const shuffled = [...WORDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, wordCount).join(" ");
}

type Phase = "idle" | "playing" | "done";

export default function TypingSpeed({ game }: { game: GameData }) {
  const [phase, setPhase]       = useState<Phase>("idle");
  const [text, setText]         = useState("");
  const [typed, setTyped]       = useState("");
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [wpm, setWpm]           = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [showAd, setShowAd]     = useState(false);
  const [shareImg, setShareImg] = useState<string | null>(null);
  const [highScore, setHS]      = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [finalWpm, setFinalWpm] = useState(0);
  const [finalAcc, setFinalAcc] = useState(100);
  const inputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedRef = useRef(false);
  const wpmRef = useRef(0);
  const accRef = useRef(100);

  useEffect(() => { setHS(getHighScore(game.id)); }, [game.id]);

  const endGame = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setFinalWpm(wpmRef.current);
    setFinalAcc(accRef.current);
    const isNew = saveHighScore(game.id, wpmRef.current);
    setIsNewBest(isNew);
    if (isNew) setHS(wpmRef.current);
    setPhase("done");
  }, [game.id]);

  const startGame = () => {
    const newText = generateText();
    setText(newText);
    setTyped("");
    setTimeLeft(DURATION);
    setWpm(0);
    setAccuracy(100);
    startedRef.current = false;
    wpmRef.current = 0;
    accRef.current = 100;
    setPhase("playing");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (phase !== "playing") return;
    const val = e.target.value;

    // Start timer on first keystroke
    if (!startedRef.current && val.length > 0) {
      startedRef.current = true;
      let tl = DURATION;
      intervalRef.current = setInterval(() => {
        tl--;
        setTimeLeft(tl);
        if (tl <= 0) endGame();
      }, 1000);
    }

    setTyped(val);

    // Calculate WPM and accuracy
    const words = val.trim().split(/\s+/).filter(Boolean);
    const correctWords = words.filter((w, i) => w === text.split(" ")[i]).length;
    const elapsed = DURATION - (timeLeft || DURATION);
    const minutes = Math.max(elapsed / 60, 1 / 60);
    const currentWpm = Math.round(correctWords / minutes);
    const totalChars = val.length;
    const correctChars = val.split("").filter((c, i) => c === text[i]).length;
    const currentAcc = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 100;

    wpmRef.current = currentWpm;
    accRef.current = currentAcc;
    setWpm(currentWpm);
    setAccuracy(currentAcc);
  }, [phase, text, timeLeft, endGame]);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const handleRetry = () => setShowAd(true);
  const afterAd = () => { setShowAd(false); setPhase("idle"); setShareImg(null); setIsNewBest(false); };

  const rank = finalWpm > 0 ? getRank(finalWpm, game) : null;
  const pct  = finalWpm > 0 ? getPercentile(finalWpm, game) : 0;

  const handleShare = async () => {
    if (!rank) return;
    const url = generateReportCard({ gameTitle: game.title, clinicalTitle: game.clinicalTitle, score: finalWpm, unit: "WPM", rankLabel: rank.label, rankTitle: rank.title, rankSubtitle: rank.subtitle, rankColor: rank.color, percentile: pct, accent: game.accent, siteUrl: t.site.url });
    setShareImg(url);
    if (navigator.share) {
      try { const blob = await (await fetch(url)).blob(); await navigator.share({ title: "My NeuroBench Report", text: t.share.text(game.title, rank.label, rank.subtitle, t.site.url), files: [new File([blob], "neurobench-report.png", { type: "image/png" })] }); return; } catch { /* fallback */ }
    }
    window.open(url, "_blank");
  };

  if (phase === "done" && rank) {
    return (
      <>
        {showAd && <InterstitialAd onDone={afterAd} />}
        <div className="anim-scale-in" style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", borderTop: `2px solid ${rank.color}`, borderRadius: "var(--radius-xl)", padding: "clamp(28px,5vw,48px) clamp(20px,4vw,40px)", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-3)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 28 }}>NeuroBench Assessment Complete · {game.clinicalTitle}</div>
          <div style={{ width: 110, height: 110, borderRadius: "50%", background: `${rank.color}12`, border: `2px solid ${rank.color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: `0 0 48px ${rank.color}25` }}>
            <span style={{ fontSize: 48, fontWeight: 900, color: rank.color, lineHeight: 1 }}>{rank.label}</span>
            <span style={{ fontSize: 9, color: rank.color, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2, fontFamily: "var(--font-mono)" }}>{rank.percentileLabel}</span>
          </div>
          <div style={{ fontSize: "clamp(52px,13vw,80px)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, marginBottom: 4 }}>
            {finalWpm}<span style={{ fontSize: "clamp(16px,3vw,22px)", fontWeight: 400, color: "var(--text-3)", marginLeft: 6, fontFamily: "var(--font-mono)" }}>wpm</span>
          </div>
          <div style={{ fontSize: 13, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 8 }}>
            Accuracy: <span style={{ color: finalAcc >= 95 ? game.accent : finalAcc >= 80 ? "#F59E0B" : "#ef4444" }}>{finalAcc}%</span>
          </div>
          <div style={{ fontSize: 13, color: game.accent, fontWeight: 700, marginBottom: 6, fontFamily: "var(--font-mono)" }}>TOP {100 - pct}% GLOBALLY</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: rank.color, marginBottom: 4 }}>{rank.title}</div>
          <div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic", marginBottom: 20 }}>&quot;{rank.subtitle}&quot;</div>
          {isNewBest && <div style={{ display: "inline-block", background: `${game.accent}12`, border: `1px solid ${game.accent}30`, color: game.accent, fontSize: 11, fontWeight: 700, padding: "3px 14px", borderRadius: 999, marginBottom: 16, fontFamily: "var(--font-mono)", letterSpacing: "0.06em", textTransform: "uppercase" }}>◆ New Personal Record</div>}
          {highScore !== null && !isNewBest && <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 16, fontFamily: "var(--font-mono)" }}>Personal best: <span style={{ color: game.accent }}>{highScore} wpm</span></div>}
          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", margin: "16px 0 24px" }}>
            {game.stats.ranks.map(r => (<div key={r.label} style={{ padding: "4px 11px", borderRadius: 6, fontSize: 12, fontWeight: 800, fontFamily: "var(--font-mono)", background: r.label === rank.label ? `${r.color}18` : "var(--bg-elevated)", color: r.label === rank.label ? r.color : "var(--text-3)", border: `1px solid ${r.label === rank.label ? r.color + "40" : "transparent"}` }}>{r.label}</div>))}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={handleRetry} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 800, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>▶ RUN AGAIN</button>
            <button onClick={handleShare} className="pressable" style={{ background: "var(--bg-elevated)", color: "var(--text-1)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 700, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>↗ EXPORT REPORT</button>
          </div>
          {shareImg && <div style={{ marginTop: 28 }}><img src={shareImg} alt="Report" style={{ maxWidth: "100%", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }} /><p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 8, fontFamily: "var(--font-mono)" }}>Long-press (mobile) · Right-click (desktop) to save</p></div>}
        </div>
      </>
    );
  }

  // Render colored text
  const renderText = () => {
    return text.split("").map((char, i) => {
      let color = "var(--text-3)";
      if (i < typed.length) color = typed[i] === char ? "var(--text-1)" : "#ef4444";
      else if (i === typed.length) color = game.accent;
      return <span key={i} style={{ color, borderBottom: i === typed.length ? `2px solid ${game.accent}` : "none" }}>{char}</span>;
    });
  };

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}

      {phase === "playing" && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-2)" }}>WPM: <span style={{ color: game.accent, fontWeight: 700 }}>{wpm}</span></div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 16, fontWeight: 900, color: timeLeft <= 10 ? "#ef4444" : "var(--text-1)" }}>{timeLeft}s</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-2)" }}>ACC: <span style={{ color: accuracy >= 95 ? game.accent : accuracy >= 80 ? "#F59E0B" : "#ef4444" }}>{accuracy}%</span></div>
        </div>
      )}

      <div style={{ background: "var(--bg-card)", border: "1.5px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "clamp(20px,4vw,32px)" }}>
        {phase === "idle" ? (
          <div className="anim-fade-up" style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: "clamp(40px,10vw,56px)", marginBottom: 20 }}>⌨️</div>
            <p style={{ fontSize: "clamp(16px,3.5vw,19px)", fontWeight: 800, marginBottom: 8 }}>Motor Sequence Automaticity Assessment</p>
            <p style={{ fontSize: 13, color: "var(--text-2)", fontFamily: "var(--font-mono)", marginBottom: 28 }}>60 seconds · Type the words · Timer starts on first keystroke</p>
            <button onClick={startGame} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>▶ BEGIN PROTOCOL</button>
          </div>
        ) : (
          <div>
            {/* Text display */}
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(14px,2.5vw,17px)", lineHeight: 2, marginBottom: 16, userSelect: "none", maxHeight: 160, overflow: "hidden" }}>
              {renderText()}
            </div>
            {/* Input */}
            <input
              ref={inputRef}
              type="text"
              value={typed}
              onChange={handleInput}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              style={{ width: "100%", background: "var(--bg-elevated)", border: `1.5px solid ${game.accent}40`, borderRadius: "var(--radius-md)", padding: "12px 16px", fontSize: 15, color: "var(--text-1)", fontFamily: "var(--font-mono)", outline: "none" }}
            />
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
        {phase === "idle" && "GLOBAL AVERAGE: ~40 WPM · TOUCH TYPISTS: 60–80 WPM"}
        {phase === "playing" && "TYPE THE WORDS ABOVE · TIMER STARTS ON FIRST KEY"}
      </div>
    </>
  );
}
