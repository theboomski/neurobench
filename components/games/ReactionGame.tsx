"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { getRank, getPercentile, getHighScore, saveHighScore, generateReportCard, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";

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
    setPhase("waiting"); setShareImg(null);
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

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setShareImg(null); setIsNewBest(false); };

  const handleShare = async () => {
    if (!rank) return;
    const url = generateReportCard({
      gameTitle: game.title, clinicalTitle: game.clinicalTitle,
      score: ms, unit: "MILLISECONDS",
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

  // Zone styles
  const zoneBg: Record<Phase, string> = { idle: "var(--bg-card)", waiting: "#1a0808", go: "#071509", toosoon: "#1a0808", done: "var(--bg-card)" };
  const zoneBorder: Record<Phase, string> = { idle: "var(--border)", waiting: "rgba(239,68,68,0.4)", go: game.accent, toosoon: "rgba(239,68,68,0.6)", done: "var(--border-md)" };

  // ── RESULT ──────────────────────────────────────────────────────────────────
  if (phase === "done" && rank) {
    return (
      <>
        {showAd && <InterstitialAd onDone={afterAd} />}
        <div className="anim-scale-in" style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", borderTop: `2px solid ${rank.color}`, borderRadius: "var(--radius-xl)", padding: "clamp(28px,5vw,48px) clamp(20px,4vw,40px)", textAlign: "center" }}>

          {/* Report header */}
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-3)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 28 }}>
            NeuroBench Assessment Complete · {game.clinicalTitle}
          </div>

          {/* Rank */}
          <div style={{ width: 110, height: 110, borderRadius: "50%", background: `${rank.color}12`, border: `2px solid ${rank.color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: `0 0 48px ${rank.color}25` }}>
            <span style={{ fontSize: 48, fontWeight: 900, color: rank.color, lineHeight: 1 }}>{rank.label}</span>
            <span style={{ fontSize: 9, color: rank.color, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2, fontFamily: "var(--font-mono)" }}>{rank.percentileLabel}</span>
          </div>

          {/* Score */}
          <div style={{ fontSize: "clamp(52px, 13vw, 80px)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, marginBottom: 4, fontVariantNumeric: "tabular-nums" }}>
            {ms}<span style={{ fontSize: "clamp(16px,3vw,22px)", fontWeight: 400, color: "var(--text-3)", marginLeft: 4, fontFamily: "var(--font-mono)" }}>ms</span>
          </div>

          <div style={{ fontSize: 13, color: game.accent, fontWeight: 700, marginBottom: 6, fontFamily: "var(--font-mono)" }}>
            TOP {100 - pct}% GLOBALLY
          </div>

          {/* Rank title + humorous subtitle */}
          <div style={{ fontSize: 15, fontWeight: 700, color: rank.color, marginBottom: 4 }}>{rank.title}</div>
          <div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic", marginBottom: 24 }}>&quot;{rank.subtitle}&quot;</div>

          {isNewBest && (
            <div style={{ display: "inline-block", background: `${game.accent}12`, border: `1px solid ${game.accent}30`, color: game.accent, fontSize: 11, fontWeight: 700, padding: "3px 14px", borderRadius: 999, marginBottom: 16, fontFamily: "var(--font-mono)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              ◆ New Personal Record
            </div>
          )}

          {highScore !== null && !isNewBest && (
            <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 16, fontFamily: "var(--font-mono)" }}>
              Personal best: <span style={{ color: game.accent }}>{highScore}ms</span>
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

          {/* Buttons */}
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={handleRetry} className="pressable" style={{ background: "#00FF94", color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 800, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
              ▶ PLAY AGAIN
            </button>
            <button onClick={handleShare} className="pressable" style={{ background: "var(--bg-elevated)", color: "var(--text-1)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 700, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
              ↗ SHARE
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

  // ── GAME ZONE ────────────────────────────────────────────────────────────────
  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}
      <div onClick={handleTap} style={{ background: zoneBg[phase], border: `1.5px solid ${zoneBorder[phase]}`, boxShadow: phase === "go" ? `0 0 80px ${game.accent}20` : "none", borderRadius: "var(--radius-xl)", minHeight: "clamp(280px,48vw,360px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", userSelect: "none", transition: "background 0.1s, border-color 0.12s, box-shadow 0.15s", WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}>

        {phase === "idle" && (
          <div className="anim-fade-up" style={{ textAlign: "center", padding: "32px 24px" }}>
            <div style={{ fontSize: "clamp(40px,10vw,60px)", marginBottom: 20 }}>{game.emoji}</div>
            <p style={{ fontSize: "clamp(17px,3.5vw,20px)", fontWeight: 800, letterSpacing: "-0.01em", marginBottom: 10 }}>Initiate Protocol</p>
            <p style={{ fontSize: "clamp(12px,2.5vw,14px)", color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>Click when the stimulus turns green</p>
          </div>
        )}

        {phase === "waiting" && (
          <div className="anim-fade-up" style={{ textAlign: "center", padding: "32px 24px" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(239,68,68,0.15)", border: "2px solid rgba(239,68,68,0.5)", margin: "0 auto 20px", animation: "pulseRing 1.2s ease infinite" }} />
            <p style={{ fontSize: "clamp(14px,3vw,18px)", fontWeight: 600, color: "rgba(239,68,68,0.8)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>STANDBY...</p>
            <p style={{ fontSize: 12, color: "var(--text-3)", marginTop: 8, fontFamily: "var(--font-mono)" }}>Await stimulus · Do not interact</p>
          </div>
        )}

        {phase === "go" && (
          <div className="anim-scale-in" style={{ textAlign: "center", padding: "32px 24px" }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: game.accent, margin: "0 auto 20px", boxShadow: `0 0 60px ${game.accent}` }} />
            <p style={{ fontSize: "clamp(22px,5vw,32px)", fontWeight: 900, color: game.accent, letterSpacing: "-0.02em", fontFamily: "var(--font-mono)" }}>RESPOND NOW</p>
          </div>
        )}

        {phase === "toosoon" && (
          <div className="anim-shake" style={{ textAlign: "center", padding: "32px 24px" }}>
            <div style={{ fontSize: "clamp(32px,8vw,48px)", marginBottom: 16 }}>⚠️</div>
            <p style={{ fontSize: "clamp(15px,3vw,18px)", fontWeight: 700, color: "#ef4444", marginBottom: 8, fontFamily: "var(--font-mono)" }}>Pre-emptive Response</p>
            <p style={{ fontSize: 13, color: "var(--text-2)" }}>Tap to re-initiate protocol</p>
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
        {phase === "idle" && "TAP ANYWHERE TO BEGIN"}
        {phase === "waiting" && "AWAITING STIMULUS..."}
        {phase === "go" && "RESPOND IMMEDIATELY"}
        {phase === "toosoon" && "PROTOCOL INTERRUPTED — TAP TO RETRY"}
      </div>
    </>
  );
}
