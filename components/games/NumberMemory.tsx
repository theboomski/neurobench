"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { getHighScore, saveHighScore, generateReportCard, playBeep } from "@/lib/gameUtils";
import InterstitialAd from "@/components/InterstitialAd";

const t = dict.en;

// Number memory: HIGHER digits = BETTER (opposite of reaction time)
// ranks are ordered S→D with minDigits threshold (>= this to qualify)
function getMemoryRank(digits: number, game: GameData) {
  // ranks in games.json: maxMs field repurposed as "minDigits to achieve this rank"
  // S=13+, A=10+, B=8+, C=6+, D=<6
  // We reverse-search: find the best rank the user qualifies for
  const ranks = [...game.stats.ranks].reverse(); // D→C→B→A→S
  return ranks.find(r => digits >= r.maxMs) ?? game.stats.ranks[game.stats.ranks.length - 1];
}
function getMemoryPercentile(digits: number, game: GameData): number {
  const pts = game.stats.percentiles; // ms field = digit count, percentile = % who score this or lower
  if (digits >= pts[0].ms) return pts[0].percentile;       // best
  if (digits <= pts[pts.length - 1].ms) return pts[pts.length - 1].percentile; // worst
  for (let i = 0; i < pts.length - 1; i++) {
    if (digits <= pts[i].ms && digits >= pts[i + 1].ms) {
      const t = (pts[i].ms - digits) / (pts[i].ms - pts[i + 1].ms);
      return Math.round(pts[i].percentile - t * (pts[i].percentile - pts[i + 1].percentile));
    }
  }
  return 50;
}

type Phase = "idle" | "showing" | "input" | "correct" | "wrong" | "done";

function generateSequence(length: number): string {
  let s = "";
  for (let i = 0; i < length; i++) {
    // Avoid leading zero and avoid repeating last digit
    let d: number;
    do { d = Math.floor(Math.random() * 10); }
    while (i === 0 && d === 0);
    s += d;
  }
  return s;
}

export default function NumberMemory({ game }: { game: GameData }) {
  const [phase, setPhase]         = useState<Phase>("idle");
  const [level, setLevel]         = useState(1);          // current digit count
  const [sequence, setSequence]   = useState("");
  const [input, setInput]         = useState("");
  const [showAd, setShowAd]       = useState(false);
  const [shareImg, setShareImg]   = useState<string | null>(null);
  const [highScore, setHS]        = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [timeLeft, setTimeLeft]   = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setHS(getHighScore(game.id)); }, [game.id]);

  const clearTimer = () => { if (timerRef.current) clearInterval(timerRef.current); };

  const startLevel = useCallback((lvl: number) => {
    const seq = generateSequence(lvl);
    setSequence(seq);
    setInput("");
    setPhase("showing");

    // Display time: 600ms per digit
    const displayMs = lvl * 600;
    const totalTicks = Math.ceil(displayMs / 100);
    let ticks = totalTicks;
    setTimeLeft(100);

    timerRef.current = setInterval(() => {
      ticks--;
      setTimeLeft(Math.round((ticks / totalTicks) * 100));
      if (ticks <= 0) {
        clearTimer();
        setPhase("input");
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    }, 100);
  }, []);

  useEffect(() => () => clearTimer(), []);

  const handleBegin = () => { setLevel(1); startLevel(1); };

  const handleSubmit = useCallback(() => {
    if (input === sequence) {
      playBeep("success");
      setPhase("correct");
      setTimeout(() => startLevel(level + 1), 900);
      setLevel(l => l + 1);
    } else {
      playBeep("fail");
      const score = level - 1 || 1;
      setFinalScore(score);
      const isNew = saveHighScore(game.id, score);
      setIsNewBest(isNew);
      if (isNew) setHS(score);
      setPhase("wrong");
      setTimeout(() => setPhase("done"), 1800);
    }
  }, [input, sequence, level, game.id, startLevel]);

  // Keyboard input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (phase !== "input") return;
      if (e.key === "Enter") { handleSubmit(); return; }
      if (e.key === "Backspace") { setInput(s => s.slice(0, -1)); return; }
      if (/^\d$/.test(e.key)) { setInput(s => s.length < sequence.length ? s + e.key : s); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, handleSubmit, sequence.length]);

  const handleKeypad = (key: string) => {
    if (phase !== "input") return;
    if (key === "⌫") { setInput(s => s.slice(0, -1)); return; }
    if (key === "✓") { handleSubmit(); return; }
    if (input.length < sequence.length) { setInput(s => s + key); }
  };

  const handleRetry = () => setShowAd(true);
  const afterAd = () => {
    setShowAd(false); setPhase("idle"); setLevel(1);
    setInput(""); setSequence(""); setShareImg(null); setIsNewBest(false);
  };

  const rank = finalScore > 0 ? getMemoryRank(finalScore, game) : null;
  const pct  = finalScore > 0 ? getMemoryPercentile(finalScore, game) : 0;

  const handleShare = async () => {
    if (!rank) return;
    const url = generateReportCard({
      gameTitle: game.title, clinicalTitle: game.clinicalTitle,
      score: finalScore, unit: "DIGITS",
      rankLabel: rank.label, rankTitle: rank.title, rankSubtitle: rank.subtitle,
      rankColor: rank.color, percentile: pct, accent: game.accent, siteUrl: t.site.url,
    });
    setShareImg(url);
    if (navigator.share) {
      try {
        const blob = await (await fetch(url)).blob();
        await navigator.share({ title: "My NeuroBench Report", text: t.share.text(game.title, rank.label, rank.subtitle, t.site.url), files: [new File([blob], "neurobench-report.png", { type: "image/png" })] });
        return;
      } catch { /* fallback */ }
    }
    window.open(url, "_blank");
  };

  // ── DONE SCREEN ──────────────────────────────────────────────────────────────
  if (phase === "done" && rank) {
    return (
      <>
        {showAd && <InterstitialAd onDone={afterAd} />}
        <div className="anim-scale-in" style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", borderTop: `2px solid ${rank.color}`, borderRadius: "var(--radius-xl)", padding: "clamp(28px,5vw,48px) clamp(20px,4vw,40px)", textAlign: "center" }}>

          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-3)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 28 }}>
            NeuroBench Assessment Complete · {game.clinicalTitle}
          </div>

          {/* Rank badge */}
          <div style={{ width: 110, height: 110, borderRadius: "50%", background: `${rank.color}12`, border: `2px solid ${rank.color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: `0 0 48px ${rank.color}25` }}>
            <span style={{ fontSize: 48, fontWeight: 900, color: rank.color, lineHeight: 1 }}>{rank.label}</span>
            <span style={{ fontSize: 9, color: rank.color, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2, fontFamily: "var(--font-mono)" }}>{rank.percentileLabel}</span>
          </div>

          {/* Score */}
          <div style={{ fontSize: "clamp(52px,13vw,80px)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, marginBottom: 4 }}>
            {finalScore}
            <span style={{ fontSize: "clamp(16px,3vw,22px)", fontWeight: 400, color: "var(--text-3)", marginLeft: 6, fontFamily: "var(--font-mono)" }}>digits</span>
          </div>

          <div style={{ fontSize: 13, color: game.accent, fontWeight: 700, marginBottom: 6, fontFamily: "var(--font-mono)" }}>
            TOP {100 - pct}% GLOBALLY
          </div>

          <div style={{ fontSize: 15, fontWeight: 700, color: rank.color, marginBottom: 4 }}>{rank.title}</div>
          <div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic", marginBottom: 8 }}>&quot;{rank.subtitle}&quot;</div>

          <div style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 20 }}>
            World average: <span style={{ color: "var(--text-2)" }}>7 digits</span>
          </div>

          {isNewBest && (
            <div style={{ display: "inline-block", background: `${game.accent}12`, border: `1px solid ${game.accent}30`, color: game.accent, fontSize: 11, fontWeight: 700, padding: "3px 14px", borderRadius: 999, marginBottom: 16, fontFamily: "var(--font-mono)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              ◆ New Personal Record
            </div>
          )}

          {highScore !== null && !isNewBest && (
            <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 16, fontFamily: "var(--font-mono)" }}>
              Personal best: <span style={{ color: game.accent }}>{highScore} digits</span>
            </div>
          )}

          {/* Rank scale */}
          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", margin: "16px 0 24px" }}>
            {game.stats.ranks.map(r => (
              <div key={r.label} style={{ padding: "4px 11px", borderRadius: 6, fontSize: 12, fontWeight: 800, fontFamily: "var(--font-mono)", background: r.label === rank.label ? `${r.color}18` : "var(--bg-elevated)", color: r.label === rank.label ? r.color : "var(--text-3)", border: `1px solid ${r.label === rank.label ? r.color + "40" : "transparent"}` }}>
                {r.label}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={handleRetry} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 800, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
              ▶ RUN AGAIN
            </button>
            <button onClick={handleShare} className="pressable" style={{ background: "var(--bg-elevated)", color: "var(--text-1)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 700, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
              ↗ EXPORT REPORT
            </button>
          </div>

          {shareImg && (
            <div style={{ marginTop: 28 }}>
              <img src={shareImg} alt="NeuroBench Report Card" style={{ maxWidth: "100%", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }} />
              <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 8, fontFamily: "var(--font-mono)" }}>Long-press (mobile) · Right-click (desktop) to save</p>
            </div>
          )}
        </div>
      </>
    );
  }

  // ── KEYPAD ───────────────────────────────────────────────────────────────────
  const keys = ["1","2","3","4","5","6","7","8","9","⌫","0","✓"];

  // ── GAME ZONE ────────────────────────────────────────────────────────────────
  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}

      {/* Level indicator */}
      {phase !== "idle" && (
        <div style={{ display: "flex", gap: 4, marginBottom: 14, justifyContent: "center" }}>
          {Array.from({ length: Math.max(level, 3) }).map((_, i) => (
            <div key={i} style={{ width: 28, height: 3, borderRadius: 2, background: i < level - 1 ? game.accent : i === level - 1 ? `${game.accent}60` : "var(--bg-elevated)", transition: "background 0.3s" }} />
          ))}
        </div>
      )}

      <div style={{ background: "var(--bg-card)", border: `1.5px solid ${phase === "input" ? game.accent + "60" : phase === "correct" ? "#22c55e60" : phase === "wrong" ? "#ef444460" : "var(--border)"}`, borderRadius: "var(--radius-xl)", minHeight: "clamp(240px,42vw,320px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", transition: "border-color 0.15s", position: "relative", overflow: "hidden" }}>

        {/* IDLE */}
        {phase === "idle" && (
          <div className="anim-fade-up" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "clamp(44px,11vw,64px)", marginBottom: 20 }}>🧠</div>
            <p style={{ fontSize: "clamp(16px,3.5vw,19px)", fontWeight: 800, marginBottom: 8, letterSpacing: "-0.01em" }}>Working Memory Capacity Assessment</p>
            <p style={{ fontSize: 13, color: "var(--text-2)", fontFamily: "var(--font-mono)", marginBottom: 28 }}>Memorize the sequence · Type it back · Go as long as you can</p>
            <button onClick={handleBegin} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
              ▶ BEGIN PROTOCOL
            </button>
          </div>
        )}

        {/* SHOWING — number flash */}
        {phase === "showing" && (
          <div className="anim-scale-in" style={{ textAlign: "center", width: "100%" }}>
            <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
              Level {level} · Memorize
            </div>
            {/* Timer bar */}
            <div style={{ width: "80%", maxWidth: 320, height: 2, background: "var(--bg-elevated)", borderRadius: 1, margin: "0 auto 24px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${timeLeft}%`, background: game.accent, borderRadius: 1, transition: "width 0.1s linear" }} />
            </div>
            <div style={{
              fontSize: `clamp(${Math.max(24, 56 - level * 3)}px, ${Math.max(6, 12 - level * 0.5)}vw, ${Math.max(32, 72 - level * 4)}px)`,
              fontWeight: 900,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.18em",
              color: "var(--text-1)",
              wordBreak: "break-all",
              textAlign: "center",
              padding: "0 16px",
            }}>
              {sequence}
            </div>
          </div>
        )}

        {/* INPUT */}
        {phase === "input" && (
          <div style={{ textAlign: "center", width: "100%" }}>
            <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
              Level {level} · What was the number?
            </div>

            {/* Hidden input for keyboard */}
            <input
              ref={inputRef}
              type="tel"
              value={input}
              onChange={() => {}}
              style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
            />

            {/* Display boxes */}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 24, padding: "0 8px" }}>
              {sequence.split("").map((_, i) => (
                <div key={i} style={{
                  width: "clamp(32px, 8vw, 48px)",
                  height: "clamp(40px, 9vw, 56px)",
                  borderRadius: 8,
                  background: i < input.length ? `${game.accent}18` : "var(--bg-elevated)",
                  border: `1.5px solid ${i < input.length ? game.accent + "60" : i === input.length ? game.accent : "var(--border)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "clamp(16px,4vw,22px)", fontWeight: 900, fontFamily: "var(--font-mono)",
                  color: i < input.length ? "var(--text-1)" : "transparent",
                  transition: "all 0.1s",
                }}>
                  {input[i] ?? ""}
                </div>
              ))}
            </div>

            {/* Keypad */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, maxWidth: 240, margin: "0 auto" }}>
              {keys.map(k => (
                <button
                  key={k}
                  onClick={() => handleKeypad(k)}
                  className="pressable"
                  style={{
                    background: k === "✓" ? game.accent : k === "⌫" ? "var(--bg-elevated)" : "var(--bg-elevated)",
                    color: k === "✓" ? "#000" : "var(--text-1)",
                    border: `1px solid ${k === "✓" ? "transparent" : "var(--border)"}`,
                    borderRadius: "var(--radius-md)",
                    padding: "14px 0",
                    fontSize: k === "✓" || k === "⌫" ? 18 : 20,
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    cursor: "pointer",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* CORRECT */}
        {phase === "correct" && (
          <div className="anim-scale-in" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <p style={{ fontSize: 20, fontWeight: 800, color: "#22c55e", fontFamily: "var(--font-mono)" }}>CORRECT</p>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 8, fontFamily: "var(--font-mono)" }}>Level {level} incoming...</p>
          </div>
        )}

        {/* WRONG */}
        {phase === "wrong" && (
          <div className="anim-shake" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
            <p style={{ fontSize: 18, fontWeight: 800, color: "#ef4444", marginBottom: 8, fontFamily: "var(--font-mono)" }}>INCORRECT</p>
            <p style={{ fontSize: 13, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
              Answer was: <span style={{ color: "var(--text-1)", letterSpacing: "0.15em" }}>{sequence}</span>
            </p>
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
        {phase === "idle"    && "WORLD AVERAGE: 7 DIGITS (MILLER'S LAW)"}
        {phase === "showing" && `LEVEL ${level} · ${level} DIGIT${level > 1 ? "S" : ""} · MEMORIZE NOW`}
        {phase === "input"   && `TYPE THE ${level}-DIGIT SEQUENCE · PRESS ✓ TO CONFIRM`}
        {phase === "correct" && "CORRECT · NEXT LEVEL LOADING"}
        {phase === "wrong"   && "PROTOCOL TERMINATED · CALCULATING RESULTS"}
      </div>
    </>
  );
}
