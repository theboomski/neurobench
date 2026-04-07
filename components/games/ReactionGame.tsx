"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { getRank, getPercentile, getHighScore, saveHighScore, generateShareCard, playBeep } from "@/lib/gameUtils";
import InterstitialAd from "@/components/InterstitialAd";

const t = dict.en;
const MIN_WAIT = 1500;
const MAX_WAIT = 5500;

type Phase = "idle" | "waiting" | "go" | "toosoon" | "done";

export default function ReactionGame({ game }: { game: GameData }) {
  const [phase, setPhase]         = useState<Phase>("idle");
  const [ms, setMs]               = useState(0);
  const [showAd, setShowAd]       = useState(false);
  const [shareImg, setShareImg]   = useState<string | null>(null);
  const [highScore, setHS]        = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const startRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setHS(getHighScore(game.id)); }, [game.id]);

  const clearT = () => { if (timerRef.current) clearTimeout(timerRef.current); };

  const beginWait = useCallback(() => {
    setPhase("waiting");
    setShareImg(null);
    timerRef.current = setTimeout(() => {
      setPhase("go");
      startRef.current = performance.now();
      playBeep("go");
    }, MIN_WAIT + Math.random() * (MAX_WAIT - MIN_WAIT));
  }, []);

  const handleTap = useCallback(() => {
    if (phase === "idle")    { beginWait(); return; }
    if (phase === "waiting") { clearT(); playBeep("fail"); setPhase("toosoon"); return; }
    if (phase === "toosoon") { beginWait(); return; }
    if (phase === "done")    { return; }

    if (phase === "go") {
      const elapsed = Math.round(performance.now() - startRef.current);
      setMs(elapsed);
      playBeep("success");
      const isNew = saveHighScore(game.id, elapsed);
      setIsNewBest(isNew);
      if (isNew) setHS(elapsed);
      setPhase("done");
    }
  }, [phase, beginWait, game.id]);

  useEffect(() => () => clearT(), []);

  const rank = phase === "done" ? getRank(ms, game) : null;
  const pct  = phase === "done" ? getPercentile(ms, game) : 0;

  const handleRetry = () => setShowAd(true);
  const afterAd = () => { setShowAd(false); setPhase("idle"); setShareImg(null); setIsNewBest(false); };

  const handleShare = async () => {
    if (!rank) return;
    const url = generateShareCard({
      gameTitle: game.title, score: ms,
      rankLabel: rank.label, rankTitle: rank.title, rankColor: rank.color,
      percentile: pct, accent: game.accent, siteUrl: "neurobench.io",
    });
    setShareImg(url);
    const text = t.share.text(ms, rank.label, "neurobench.io");
    if (navigator.share) {
      try {
        const blob = await (await fetch(url)).blob();
        await navigator.share({ title: "My Reaction Time", text, files: [new File([blob], "result.png", { type: "image/png" })] });
        return;
      } catch { /* fallback */ }
    }
    window.open(url, "_blank");
  };

  const zoneBg: Record<Phase, string> = {
    idle: "var(--bg-card)", waiting: "#1a0808",
    go: "#071a0c", toosoon: "#1a0808", done: "var(--bg-card)",
  };
  const zoneBorder: Record<Phase, string> = {
    idle: "var(--border)", waiting: "#7f1d1d",
    go: game.accent, toosoon: "#ef4444", done: "var(--border-md)",
  };

  // ── RESULT ──────────────────────────────────────────────────────────────────
  if (phase === "done" && rank) {
    return (
      <>
        {showAd && <InterstitialAd onDone={afterAd} />}
        <div className="anim-scale-in" style={{
          background: "var(--bg-card)", border: "1px solid var(--border-md)",
          borderTop: `3px solid ${rank.color}`, borderRadius: "var(--radius-xl)",
          padding: "clamp(28px, 6vw, 52px) clamp(20px, 5vw, 40px)", textAlign: "center",
        }}>
          {/* Rank badge */}
          <div style={{
            width: 108, height: 108, borderRadius: "50%",
            background: `${rank.color}16`, border: `2.5px solid ${rank.color}`,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px", boxShadow: `0 0 48px ${rank.color}30`,
          }}>
            <span style={{ fontSize: 46, fontWeight: 900, color: rank.color, lineHeight: 1 }}>{rank.label}</span>
            <span style={{ fontSize: 9, color: rank.color, opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2 }}>{rank.title}</span>
          </div>

          {/* Score */}
          <div style={{ fontSize: "clamp(56px, 14vw, 88px)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, marginBottom: 6, fontVariantNumeric: "tabular-nums" }}>
            {ms}
            <span style={{ fontSize: "clamp(18px, 4vw, 26px)", fontWeight: 400, color: "var(--text-3)", marginLeft: 4 }}>ms</span>
          </div>

          <div style={{ fontSize: 14, color: game.accent, fontWeight: 600, marginBottom: 10 }}>
            Top {100 - pct}% worldwide
          </div>

          {isNewBest && (
            <div style={{
              display: "inline-block", background: `${game.accent}18`, border: `1px solid ${game.accent}40`,
              color: game.accent, fontSize: 12, fontWeight: 700, padding: "3px 14px",
              borderRadius: 999, marginBottom: 16, letterSpacing: "0.06em", textTransform: "uppercase",
            }}>
              🏆 New Personal Best!
            </div>
          )}

          {highScore !== null && !isNewBest && (
            <div style={{ fontSize: 13, color: "var(--text-3)", marginBottom: 16 }}>
              Personal best: <span style={{ color: game.accent, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{highScore}ms</span>
            </div>
          )}

          {/* Rank scale */}
          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", margin: "18px 0 26px" }}>
            {game.stats.ranks.map(r => (
              <div key={r.label} style={{
                padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                background: r.label === rank.label ? `${r.color}20` : "var(--bg-elevated)",
                color: r.label === rank.label ? r.color : "var(--text-3)",
                border: `1px solid ${r.label === rank.label ? r.color + "50" : "transparent"}`,
              }}>{r.label}</div>
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={handleRetry} style={{
              background: "#1DB954", color: "#000", border: "none",
              borderRadius: "var(--radius-md)", padding: "14px 28px",
              fontSize: 15, fontWeight: 700, cursor: "pointer", minWidth: 140,
              WebkitTapHighlightColor: "transparent",
            }}>
              🔁 Try Again
            </button>
            <button onClick={handleShare} style={{
              background: "var(--bg-elevated)", color: "var(--text-1)",
              border: "1px solid var(--border-md)", borderRadius: "var(--radius-md)",
              padding: "14px 28px", fontSize: 15, fontWeight: 600,
              cursor: "pointer", minWidth: 140, WebkitTapHighlightColor: "transparent",
            }}>
              📤 Share
            </button>
          </div>

          {shareImg && (
            <div style={{ marginTop: 28 }}>
              <img src={shareImg} alt="Result card" style={{ maxWidth: "100%", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }} />
              <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 8 }}>
                Long-press (mobile) · Right-click (desktop) to save
              </p>
            </div>
          )}
        </div>
      </>
    );
  }

  // ── GAME ZONE ────────────────────────────────────────────────────────────────
  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div
        onClick={handleTap}
        style={{
          background: zoneBg[phase],
          border: `1.5px solid ${zoneBorder[phase]}`,
          boxShadow: phase === "go" ? `0 0 72px ${game.accent}28` : "none",
          borderRadius: "var(--radius-xl)",
          minHeight: "clamp(280px, 50vw, 380px)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          cursor: "pointer", userSelect: "none",
          transition: "background 0.1s, border-color 0.1s, box-shadow 0.15s",
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
        }}
      >
        {phase === "idle" && (
          <div className="anim-fade-up" style={{ textAlign: "center", padding: "32px 24px" }}>
            <div style={{ fontSize: "clamp(44px, 12vw, 64px)", marginBottom: 20 }}>⚡</div>
            <p style={{ fontSize: "clamp(18px, 4vw, 22px)", fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 10 }}>
              Tap to start
            </p>
            <p style={{ fontSize: "clamp(13px, 3vw, 15px)", color: "var(--text-2)", lineHeight: 1.6 }}>
              Click the moment you see green
            </p>
          </div>
        )}

        {phase === "waiting" && (
          <div className="anim-fade-up" style={{ textAlign: "center", padding: "32px 24px" }}>
            <div className="anim-pulse" style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "#ef444428", border: "2px solid #ef4444",
              margin: "0 auto 20px",
            }} />
            <p style={{ fontSize: "clamp(16px, 4vw, 19px)", fontWeight: 600, color: "#fca5a5" }}>
              Wait for green...
            </p>
            <p style={{ fontSize: 13, color: "var(--text-3)", marginTop: 8 }}>Don&apos;t click early!</p>
          </div>
        )}

        {phase === "go" && (
          <div className="anim-scale-in" style={{ textAlign: "center", padding: "32px 24px" }}>
            <div style={{
              width: 80, height: 80, borderRadius: "50%",
              background: game.accent, margin: "0 auto 20px",
              boxShadow: `0 0 56px ${game.accent}`,
            }} />
            <p style={{ fontSize: "clamp(24px, 6vw, 34px)", fontWeight: 900, color: game.accent, letterSpacing: "-0.02em" }}>
              CLICK NOW!
            </p>
          </div>
        )}

        {phase === "toosoon" && (
          <div className="anim-shake" style={{ textAlign: "center", padding: "32px 24px" }}>
            <div style={{ fontSize: "clamp(36px, 10vw, 52px)", marginBottom: 16 }}>😬</div>
            <p style={{ fontSize: "clamp(17px, 4vw, 21px)", fontWeight: 700, color: "#ef4444", marginBottom: 8 }}>
              Too soon!
            </p>
            <p style={{ fontSize: "clamp(13px, 3vw, 15px)", color: "var(--text-2)" }}>Tap to try again</p>
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 12, fontSize: 13, color: "var(--text-3)", fontFamily: "monospace" }}>
        {phase === "idle" && "Tap anywhere · Click when green appears"}
        {phase === "waiting" && "Get ready..."}
        {phase === "go" && "NOW!"}
        {phase === "toosoon" && "Tap to retry"}
      </div>
    </>
  );
}
