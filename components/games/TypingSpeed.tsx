"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { GameData } from "@/lib/types";
import { getHighScore, saveHighScore, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";
import CommonResult from "@/components/CommonResult";
import { normalizeTo100FromPercentile, resolveResultTone } from "@/lib/resultUtils";
const DURATION = 60;

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

// Real sentences — enough for 200 WPM in 60s = ~200 words
const PASSAGES = [
  "The human brain processes information at speeds that vary depending on the task. Simple reactions can occur in under two hundred milliseconds, while complex decisions may take several seconds. Scientists have found that regular cognitive training can improve processing speed across all age groups. The key is consistent practice combined with adequate sleep and physical exercise. Memory formation occurs during deep sleep when the brain consolidates the experiences of the day into long-term storage. People who prioritize sleep consistently outperform those who sacrifice it on nearly every cognitive measure.",
  "Typing speed is one of the most measurable cognitive motor skills. The average adult types at around forty words per minute, while professional typists can reach over one hundred. The world record exceeds two hundred and sixteen words per minute. Accuracy matters as much as speed — errors slow you down because corrections take time. Touch typing, where you type without looking at the keyboard, is significantly faster than hunting and pecking. Most people can learn the basic touch typing technique in just a few weeks of daily practice.",
  "The relationship between focus and productivity is well established in cognitive science. When you concentrate on a single task, your brain enters a state called flow, where performance improves and time seems to pass differently. Multitasking, despite its popularity, reduces efficiency by up to forty percent because the brain must constantly switch context. The most effective strategy is to work in focused blocks of time followed by short breaks. This approach, used by many high performers, aligns with the natural rhythm of human attention and energy.",
  "Language shapes the way we think more than most people realize. The words available in your vocabulary influence how you perceive and categorize the world around you. Research shows that people with larger vocabularies tend to be more precise in their thinking and communication. Reading widely across different subjects is the most effective way to expand vocabulary naturally. Unlike memorizing word lists, reading in context creates strong neural associations that make words easier to recall and use in everyday speech and writing.",
  "The science of habit formation reveals that nearly half of our daily actions are automatic. Habits are stored in a part of the brain called the basal ganglia, which operates largely outside conscious awareness. This is why breaking bad habits is so difficult — the neural pathways are deeply encoded. The most effective approach is not to eliminate a habit but to replace it with a different behavior that satisfies the same underlying need. Small consistent actions compound over time into significant changes in both behavior and brain structure.",
];

// Generate a long text by concatenating shuffled passages — enough for 200WPM in 60s
function generateText(): string {
  const shuffled = [...PASSAGES].sort(() => Math.random() - 0.5);
  // Join all passages — gives ~600 words, way more than 200WPM limit
  return shuffled.join(" ");
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
  const [highScore, setHS]      = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [finalWpm, setFinalWpm] = useState(0);
  const [finalAcc, setFinalAcc] = useState(100);
  const inputRef = useRef<HTMLTextAreaElement>(null);
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

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
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

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setIsNewBest(false); };

  const rank = phase === "done" ? getRank(finalWpm, game) : null;
  const pct  = phase === "done" ? getPercentile(finalWpm, game) : 0;

  if (phase === "done" && rank) {
    const normalized = normalizeTo100FromPercentile(pct, finalWpm);
    return (
      <CommonResult
        game={game}
        rawScore={finalWpm}
        rawUnit="wpm"
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

  // Fixed 3-line display: text stays still, only cursor moves
  // Split text into word-wrapped lines of ~45 chars each
  const getLines = () => {
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const test = current ? current + " " + word : word;
      if (test.length > 45 && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  };

  const renderText = () => {
    const cursor = typed.length;
    const lines = getLines();
    
    // Find which line the cursor is on
    let charCount = 0;
    let cursorLine = 0;
    for (let i = 0; i < lines.length; i++) {
      const lineLen = lines[i].length + (i < lines.length - 1 ? 1 : 0); // +1 for space
      if (charCount + lineLen > cursor) { cursorLine = i; break; }
      charCount += lineLen;
    }
    
    // Show: previous line (if any), current line, next line (if any)
    const showFrom = Math.max(0, cursorLine - 1);
    const showTo = Math.min(lines.length - 1, cursorLine + 1);
    const visibleLines = lines.slice(showFrom, showTo + 1);
    
    // Rebuild character positions for visible lines
    let absIdx = 0;
    for (let i = 0; i < showFrom; i++) {
      absIdx += lines[i].length + (i < lines.length - 1 ? 1 : 0);
    }
    
    return visibleLines.map((line, li) => {
      const lineStart = absIdx;
      const chars = line.split("").map((char, ci) => {
        const i = lineStart + ci;
        let color = "var(--text-3)";
        if (i < cursor) color = typed[i] === char ? "#10B981" : "#ef4444";
        else if (i === cursor) color = game.accent;
        return (
          <span key={i} style={{ color, borderBottom: i === cursor ? `2px solid ${game.accent}` : "none" }}>
            {char}
          </span>
        );
      });
      absIdx += line.length + 1; // +1 for space between lines
      const isCurrentLine = (showFrom + li) === cursorLine;
      return (
        <div key={li} style={{
          opacity: isCurrentLine ? 1 : 0.35,
          marginBottom: 4,
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}>
          {chars}
          {li < visibleLines.length - 1 && <span style={{ color: "transparent" }}> </span>}
        </div>
      );
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
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "clamp(14px,2.5vw,16px)", lineHeight: 1.9, marginBottom: 16, userSelect: "none", minHeight: 80 }}>
              {renderText()}
            </div>
            {/* Input */}
            <textarea
              ref={inputRef}
              value={typed}
              onChange={handleInput}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              rows={3}
              style={{
                width: "100%",
                background: "var(--bg-elevated)",
                border: `1.5px solid ${game.accent}40`,
                borderRadius: "var(--radius-md)",
                padding: "12px 16px",
                fontSize: 15,
                color: "var(--text-1)",
                fontFamily: "var(--font-mono)",
                outline: "none",
                resize: "none",
                lineHeight: 1.6,
              }}
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
