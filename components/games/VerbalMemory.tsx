"use client";

import { trackPlay } from "@/lib/tracking";

import { useState, useCallback, useEffect } from "react";
import type { GameData } from "@/lib/types";
import { getHighScore, saveHighScore, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";
import CommonResult from "@/components/CommonResult";
import { normalizeTo100FromPercentile, resolveResultTone } from "@/lib/resultUtils";

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
  const [highScore, setHS]      = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => { setHS(getHighScore(game.id)); }, [game.id]);

  const getNextWord = useCallback((shown: string[], seen: Set<string>, current: string) => {
    // 40% chance to show a seen word (if any exist), but never the same word twice in a row
    if (seen.size > 0 && Math.random() < 0.4) {
      const seenArr = Array.from(seen).filter(w => w !== current);
      if (seenArr.length > 0) {
        return seenArr[Math.floor(Math.random() * seenArr.length)];
      }
    }
    // New word — never same as current
    const unused = WORD_POOL.filter(w => !shown.includes(w) && w !== current);
    if (unused.length === 0) {
      const fallback = WORD_POOL.filter(w => w !== current);
      return fallback[Math.floor(Math.random() * fallback.length)];
    }
    return unused[Math.floor(Math.random() * unused.length)];
  }, []);

  const startGame = () => {
    trackPlay(game.id);
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
      const next = getNextWord(newShown, newSeen, currentWord);
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
        const next = getNextWord(newShown, newSeen, currentWord);
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
  const afterAd = () => { setShowAd(false); setPhase("idle"); setIsNewBest(false); };

  const rank = phase === "done" ? getRank(finalScore, game) : null;
  const pct  = phase === "done" ? getPercentile(finalScore, game) : 0;

  if (phase === "done" && rank) {
    const normalized = normalizeTo100FromPercentile(pct, finalScore);
    return (
      <CommonResult
        game={game}
        rawScore={finalScore}
        rawUnit="words"
        normalizedScore={normalized}
        percentile={pct}
        rank={rank}
        highScore={highScore}
        isNewBest={isNewBest}
        showAd={showAd}
        onAdDone={afterAd}
        onRetry={handleRetry}
        tone={resolveResultTone(game)}
      />
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
              {""}
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
