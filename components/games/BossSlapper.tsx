"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { GameData } from "@/lib/types";
import { dict } from "@/lib/i18n";
import { getRank, getPercentile, getHighScore, saveHighScore, generateReportCard, playBeep } from "@/lib/gameUtils";
import InterstitialAd, { shouldShowAd } from "@/components/InterstitialAd";

const t = dict.en;
const TOTAL_TAPS = 10;
type Phase = "idle" | "active" | "done";

export default function BossSlapper({ game }: { game: GameData }) {
  const [phase, setPhase]         = useState<Phase>("idle");
  const [taps, setTaps]           = useState(0);
  const [ms, setMs]               = useState(0);
  const [showAd, setShowAd]       = useState(false);
  const [shareImg, setShareImg]   = useState<string | null>(null);
  const [highScore, setHS]        = useState<number | null>(null);
  const [isNewBest, setIsNewBest] = useState(false);
  const [bossActive, setBossActive] = useState(false);
  const startRef = useRef<number>(0);

  useEffect(() => { setHS(getHighScore(game.id)); }, [game.id]);

  const handleBossTap = useCallback(() => {
    if (phase === "idle") {
      setPhase("active");
      setTaps(1);
      setBossActive(true);
      startRef.current = performance.now();
      playBeep("tap");
      setTimeout(() => setBossActive(false), 120);
      return;
    }
    if (phase === "active") {
      const next = taps + 1;
      playBeep("tap");
      setBossActive(true);
      setTimeout(() => setBossActive(false), 120);

      if (next >= TOTAL_TAPS) {
        const elapsed = Math.round(performance.now() - startRef.current);
        setMs(elapsed);
        setTaps(next);
        playBeep("success");
        const isNew = saveHighScore(game.id, elapsed);
        setIsNewBest(isNew);
        if (isNew) setHS(elapsed);
        setPhase("done");
      } else {
        setTaps(next);
      }
    }
  }, [phase, taps, game.id]);

  const rank = phase === "done" ? getRank(ms, game) : null;
  const pct  = phase === "done" ? getPercentile(ms, game) : 0;

  const handleRetry = () => { if (shouldShowAd()) setShowAd(true); else afterAd(); };
  const afterAd = () => { setShowAd(false); setPhase("idle"); setTaps(0); setMs(0); setShareImg(null); setIsNewBest(false); };

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
        await navigator.share({ title: "My ZAZAZA Report", text: t.share.text(game.title, rank.label, rank.subtitle, t.site.url), files: [new File([blob], "zazaza-report.png", { type: "image/png" })] });
        return;
      } catch { /* fallback */ }
    }
    window.open(url, "_blank");
  };

  // ── RESULT ──────────────────────────────────────────────────────────────────
  if (phase === "done" && rank) {
    return (
      <>
        {showAd && <InterstitialAd onDone={afterAd} />}
        <div className="anim-scale-in" style={{ background: "var(--bg-card)", border: "1px solid var(--border-md)", borderTop: `2px solid ${rank.color}`, borderRadius: "var(--radius-xl)", padding: "clamp(28px,5vw,48px) clamp(20px,4vw,40px)", textAlign: "center" }}>

          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-3)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 28 }}>
            ZAZAZA Assessment Complete · {game.clinicalTitle}
          </div>

          {/* Neutralized boss */}
          <div style={{ fontSize: "clamp(48px,12vw,72px)", marginBottom: 8, filter: "grayscale(0.6) opacity(0.6)" }}>👹</div>
          <div style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 24, letterSpacing: "0.06em" }}>STRESSOR NEUTRALIZED</div>

          {/* Rank */}
          <div style={{ width: 110, height: 110, borderRadius: "50%", background: `${rank.color}12`, border: `2px solid ${rank.color}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: `0 0 48px ${rank.color}25` }}>
            <span style={{ fontSize: 48, fontWeight: 900, color: rank.color, lineHeight: 1 }}>{rank.label}</span>
            <span style={{ fontSize: 9, color: rank.color, opacity: 0.7, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 2, fontFamily: "var(--font-mono)" }}>{rank.percentileLabel}</span>
          </div>

          <div style={{ fontSize: "clamp(48px,12vw,76px)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, marginBottom: 4, fontVariantNumeric: "tabular-nums" }}>
            {ms}<span style={{ fontSize: "clamp(14px,3vw,20px)", fontWeight: 400, color: "var(--text-3)", marginLeft: 4, fontFamily: "var(--font-mono)" }}>ms</span>
          </div>

          <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginBottom: 8 }}>
            {TOTAL_TAPS} neutralizations · {(ms / TOTAL_TAPS).toFixed(0)}ms avg per tap
          </div>

          <div style={{ fontSize: 13, color: game.accent, fontWeight: 700, marginBottom: 6, fontFamily: "var(--font-mono)" }}>
            TOP {100 - pct}% GLOBALLY
          </div>

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

          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap", margin: "16px 0 24px" }}>
            {game.stats.ranks.map(r => (
              <div key={r.label} style={{ padding: "4px 11px", borderRadius: 6, fontSize: 12, fontWeight: 800, fontFamily: "var(--font-mono)", background: r.label === rank.label ? `${r.color}18` : "var(--bg-elevated)", color: r.label === rank.label ? r.color : "var(--text-3)", border: `1px solid ${r.label === rank.label ? r.color + "40" : "transparent"}` }}>
                {r.label}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={handleRetry} className="pressable" style={{ background: "#FF6B6B", color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 800, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
              ▶ PLAY AGAIN
            </button>
            <button onClick={handleShare} className="pressable" style={{ background: "var(--bg-elevated)", color: "var(--text-1)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 700, cursor: "pointer", minWidth: 140, fontFamily: "var(--font-mono)", letterSpacing: "0.04em" }}>
              ↗ SHARE
            </button>
          </div>

          {shareImg && (
            <div style={{ marginTop: 28 }}>
              <img src={shareImg} alt="ZAZAZA Report Card" style={{ maxWidth: "100%", borderRadius: "var(--radius-lg)", border: "1px solid var(--border)" }} />
              <p style={{ fontSize: 11, color: "var(--text-3)", marginTop: 8, fontFamily: "var(--font-mono)" }}>Long-press (mobile) · Right-click (desktop) to save</p>
            </div>
          )}
        </div>
      </>
    );
  }

  // ── GAME ZONE ────────────────────────────────────────────────────────────────
  const remaining = TOTAL_TAPS - taps;
  const progress  = taps / TOTAL_TAPS;

  return (
    <>
      {showAd && <InterstitialAd onDone={afterAd} />}

      {/* Progress bar */}
      <div style={{ height: 3, background: "var(--bg-elevated)", borderRadius: 2, marginBottom: 16, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${progress * 100}%`, background: game.accent, borderRadius: 2, transition: "width 0.1s ease" }} />
      </div>

      <div style={{ background: "var(--bg-card)", border: `1.5px solid ${phase === "active" ? game.accent + "60" : "var(--border)"}`, borderRadius: "var(--radius-xl)", minHeight: "clamp(280px,48vw,360px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 24px", transition: "border-color 0.1s", userSelect: "none" }}>

        {phase === "idle" && (
          <div className="anim-fade-up" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "clamp(56px,14vw,80px)", marginBottom: 20 }}>👹</div>
            <p style={{ fontSize: "clamp(16px,3.5vw,19px)", fontWeight: 800, letterSpacing: "-0.01em", marginBottom: 10 }}>Begin Stress-Relief Protocol</p>
            <p style={{ fontSize: "clamp(12px,2.5vw,14px)", color: "var(--text-2)", fontFamily: "var(--font-mono)", marginBottom: 28 }}>Tap the stressor {TOTAL_TAPS}× · maximum velocity</p>
            <button onClick={handleBossTap} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 36px", fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
              ▶ INITIATE
            </button>
          </div>
        )}

        {phase === "active" && (
          <div style={{ textAlign: "center" }}>
            {/* Tap counter */}
            <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 16 }}>
              {remaining} remaining
            </div>

            {/* Boss - the actual tap target */}
            <div
              onClick={handleBossTap}
              className="pressable"
              style={{
                fontSize: "clamp(64px,16vw,100px)",
                cursor: "pointer",
                display: "inline-block",
                filter: bossActive ? "brightness(1.4) saturate(1.5)" : "brightness(1)",
                transform: bossActive ? "scale(1.12) rotate(-4deg)" : "scale(1)",
                transition: "filter 0.08s, transform 0.08s",
                WebkitTapHighlightColor: "transparent",
                touchAction: "manipulation",
              }}
            >
              👹
            </div>

            <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginTop: 16 }}>
              TAP {taps}/{TOTAL_TAPS}
            </div>
          </div>
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 10, fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
        {phase === "idle" && `TAP THE BOSS ${TOTAL_TAPS}× AS FAST AS POSSIBLE`}
        {phase === "active" && `NEUTRALIZE THE STRESSOR — ${remaining} REMAINING`}
      </div>
    </>
  );
}
