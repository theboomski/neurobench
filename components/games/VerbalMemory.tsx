"use client";

import { useState, useCallback, useEffect } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { getHighScore, saveHighScore, generateReportCard, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";

const t = dict.en;

// Higher score = better
function getRank(score: number, game: GameData) {
  // Higher score = better: S has highest threshold
  // Find the highest rank where score >= maxMs
  const sorted = [...game.stats.ranks].sort((a, b) => b.maxMs - a.maxMs);
  return sorted.find(r => score >= r.maxMs) ?? game.stats.ranks[game.stats.ranks.length - 1];
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

const WORD_POOL = [
  "apple","bridge","cloud","dance","eagle","flame","ghost","horse","island","jungle",
  "knife","lemon","mirror","night","ocean","piano","queen","river","stone","tower",
  "umbrella","violet","window","yellow","zebra","alarm","beach","cabin","desert","engine",
  "forest","garden","hammer","income","jacket","kettle","ladder","market","needle","office",
  "palace","rabbit","school","temple","unique","vacuum","wallet","cotton","domain","effort",
  "fabric","global","hunter","impact","junior","kitten","linear","mental","narrow","option",
  "pepper","rescue","silver","target","useful","valley","winter","oxygen","planet","rubber",
  "sample","talent","update","vendor","worker","export","frozen","gather","hollow","inject"
];

type Phase = "idle" | "playing" | "done";

export default function VerbalMemory({ game }: { game: GameData }) {
  const [phase, setPhase]       = useState<Phase>("idle");
  const [score, setScore]       = useState(0);
  const [lives, setLives]       = useState(3);
  const [currentWord, setCurrentWord] = useState("");
  const [seenWords, setSeenWords]     = useState<Set<string>>(new Set());
  const [shownWords, setShownWords]   = useState<string[]>([]);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [showAd, setShowAd]     = useState(false);
  const [shareImg, setShareImg] = useState<string | null>(null);
  const [highScore, setHS]      = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => { setHS(getHighScore(game.id)); }, [game.id]);

  const getNextWord = useCallback((shown: string[], seen: Set<string>) => {
    // 40% chance to show a seen word (if any exist)
    if (seen.size > 0 && Math.random() < 0.4) {
      const seenArr = Array.from(seen);
      return seenArr[Math.floor(Math.random() * seenArr.length)];
    }
    // New word
    const unused = WORD_POOL.filter(w => !shown.includes(w));
    if (unused.length === 0) return WORD_POOL[Math.floor(Math.random() * WORD_POOL.length)];
    return unused[Math.floor(Math.random() * unused.length)];
  }, []);

  const startGame = () => {
    const firstWord = WORD_POOL[Math.floor(Math.random() * 20)];
    setPhase("playing");
    setScore(0);
    setLives(3);
    setSeenWords(new Set());
    setShownWords([firstWord]);
    setCurrentWord(firstWord);
    setFeedback(null);
  };

  const handleAnswer = useCallback((answer: "seen" | "new") => {
    if (phase !== "playing") return;
    const isSeen = seenWords.has(currentWord);
    const correct = (answer === "seen" && isSeen) || (answer === "new" && !isSeen);

    if (correct) {
      playBeep("success");
      setFeedback("correct");
      const newSeen = new Set(seenWords);
      if (!isSeen) newSeen.add(currentWord);
      const newShown = [...shownWords];
      const next = getNextWord(newShown, newSeen);
      newShown.push(next);
      const newScore = score + 1;
      setScore(newScore);
      setSeenWords(newSeen);
      setShownWords(newShown);
      setTimeout(() => {
        setCurrentWord(next);
        setFeedback(null);
      }, 300);
    } else {
      playBeep("fail");
      setFeedback("wrong");
      const newLives = lives - 1;
      setLives(newLives);
      if (newLives <= 0) {
        const isNew = saveHighScore(game.id, score);
        setIsNewBest(isNew);
        if (isNew) setHS(score);
        setFinalScore(score);
        setTimeout(() => setPhase("done"), 600);
      } else {
        // Continue with same word shown, move to next
        const newSeen = new Set(seenWords);
        if (!isSeen) newSeen.add(currentWord);
        const newShown = [...shownWords];
        const next = getNextWord(newShown, newSeen);
        newShown.push(next);
        setSeenWords(newSeen);
        setShownWords(newShown);
        setTimeout(() => {
          setCurrentWord(next);
          setFeedback(null);
        }, 600);
      }
    }
  }, [phase, seenWords, currentWord, shownWords, score, lives, game.id, getNextWord]);

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setShareImg(null); setIsNewBest(false); };

  const rank = finalScore > 0 ? getRank(finalScore, game) : null;
  const pct  = finalScore > 0 ? getPercentile(finalScore, game) : 0;

  const handleShare = async () => {
    if (!rank) return;
    const url = generateReportCard({ gameTitle: game.title, clinicalTitle: game.clinicalTitle, score: finalScore, unit: "WORDS", rankLabel: rank.label, rankTitle: rank.title, rankSubtitle: rank.subtitle, rankColor: rank.color, percentile: pct, accent: game.accent, siteUrl: t.site.url });
    setShareImg(url);
    if (navigator.share) {
      try { const blob = await (await fetch(url)).blob(); await navigator.share({ title: "My ZAZAZA Report", text: t.share.text(game.title, rank.label, rank.subtitle, t.site.url), files: [new File([blob], "zazaza-report.png", { type: "image/png" })] }); return; } catch { /* fallback */ }
    }
    window.open(url, "_blank");
  };

  if (phase === "done" && rank) {
    return (
      <>
        {showAd && <InterstitialAd onDone={afterAd} />}
        <div className="anim-scale-in" style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", borderTop: `2px solid ${rank.color}`, borderRadius: "var(--radius-xl)", padding: "clamp(28px,5vw,48px) clamp(20px,4vw,40px)", textAlign: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-3)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 28 }}>ZAZAZA Assessment Complete · {game.clinicalTitle}</div>
          <div style={{ width: 110, height: 110, borderRadius: "50%", background: `${rank.color}12`, border: `2px solid ${rank.color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: `0 0 48px ${rank.color}25` }}>
            <span style={{ fontSize: 48, fontWeight: 900, color: rank.color, lineHeight: 1 }}>{rank.label}</span>
            <span style={{ fontSize: 9, color: rank.color, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2, fontFamily: "var(--font-mono)" }}>{rank.percentileLabel}</span>
          </div>
          <div style={{ fontSize: "clamp(52px,13vw,80px)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, marginBottom: 4 }}>
            {finalScore}<span style={{ fontSize: "clamp(16px,3vw,22px)", fontWeight: 400, color: "var(--text-3)", marginLeft: 6, fontFamily: "var(--font-mono)" }}>words</span>
          </div>
          <div style={{ fontSize: 13, color: game.accent, fontWeight: 700, marginBottom: 6, fontFamily: "var(--font-mono)" }}>TOP {100 - pct}% GLOBALLY</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: rank.color, marginBottom: 4 }}>{rank.title}</div>
          <div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic", marginBottom: 20 }}>&quot;{rank.subtitle}&quot;</div>
          {isNewBest && <div style={{ display: "inline-block", background: `${game.accent}12`, border: `1px solid ${game.accent}30`, color: game.accent, fontSize: 11, fontWeight: 700, padding: "3px 14px", borderRadius: 999, marginBottom: 16, fontFamily: "var(--font-mono)", letterSpacing: "0.06em", textTransform: "uppercase" }}>◆ New Personal Record</div>}
          {highScore !== null && !isNewBest && <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 16, fontFamily: "var(--font-mono)" }}>Personal best: <span style={{ color: game.accent }}>{highScore} words</span></div>}
          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", margin: "16px 0 24px" }}>
            {game.stats.ranks.map(r => (<div key={r.label} style={{ padding: "4px 11px", borderRadius: 6, fontSize: 12, fontWeight: 800, fontFamily: "var(--font-mono)", background: r.label === rank.label ? `${r.color}18` : "var(--bg-elevated)", color: r.label === rank.label ? r.color : "var(--text-3)", border: `1px solid ${r.label === rank.label ? r.color + "40" : "transparent"}` }}>{r.label}</div>))}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={handleRetry} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 800, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>▶ PLAY AGAIN</button>
            <button onClick={handleShare} className="pressable" style={{ background: "var(--bg-elevated)", color: "var(--text-1)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 700, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>↗ SHARE</button>
          </div>
          {shareImg && <div style={{ marginTop: 28 }}><img src={shareImg} alt="Report" style={{ maxWidth: "100%", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }} /><p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 8, fontFamily: "var(--font-mono)" }}>Long-press (mobile) · Right-click (desktop) to save</p></div>}
        </div>
      </>
    );
  }

  const isSeen = seenWords.has(currentWord);
  const borderColor = feedback === "correct" ? "#22c55e60" : feedback === "wrong" ? "#ef444460" : "var(--border)";

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      {phase === "idle" ? (
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius-xl)", padding: "clamp(32px,6vw,56px) clamp(20px,4vw,40px)", textAlign: "center" }}>
          <div style={{ fontSize: "clamp(40px,10vw,56px)", marginBottom: 20 }}>📝</div>
          <p style={{ fontSize: "clamp(16px,3.5vw,19px)", fontWeight: 800, marginBottom: 8 }}>Semantic Recognition Memory</p>
          <p style={{ fontSize: 13, color: "var(--text-2)", fontFamily: "var(--font-mono)", marginBottom: 8 }}>SEEN it before or NEW? You have 3 lives.</p>
          <p style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 28 }}>One wrong answer costs a life — three strikes and you're out</p>
          <button onClick={startGame} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>▶ BEGIN PROTOCOL</button>
        </div>
      ) : (
        <div>
          {/* Stats bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-2)" }}>
              SCORE: <span style={{ color: game.accent, fontWeight: 700 }}>{score}</span>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {[0,1,2].map(i => <span key={i} style={{ fontSize: 16 }}>{i < lives ? "❤️" : "🖤"}</span>)}
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-3)" }}>
              SEEN: {seenWords.size}
            </div>
          </div>

          {/* Word display */}
          <div style={{ background: "var(--bg-card)", border: `1.5px solid ${borderColor}`, borderRadius: "var(--radius-xl)", minHeight: "clamp(180px,35vw,240px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", marginBottom: 16, transition: "border-color 0.15s" }}>
            <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
              {isSeen ? "⚡ Previously shown" : ""}
            </div>
            <div style={{ fontSize: "clamp(28px,7vw,48px)", fontWeight: 900, letterSpacing: "-0.02em", color: feedback === "correct" ? "#22c55e" : feedback === "wrong" ? "#ef4444" : "var(--text-1)", transition: "color 0.15s" }}>
              {currentWord}
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <button onClick={() => handleAnswer("seen")} className="pressable" style={{ background: `${game.accent}15`, color: game.accent, border: `1.5px solid ${game.accent}40`, borderRadius: "var(--radius-md)", padding: "16px 0", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)", letterSpacing: "0.04em", WebkitTapHighlightColor: "transparent" }}>
              SEEN
            </button>
            <button onClick={() => handleAnswer("new")} className="pressable" style={{ background: "var(--bg-elevated)", color: "var(--text-1)", border: "1.5px solid var(--border-md)", borderRadius: "var(--radius-md)", padding: "16px 0", fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)", letterSpacing: "0.04em", WebkitTapHighlightColor: "transparent" }}>
              NEW
            </button>
          </div>
        </div>
      )}
    </>
  );
}
