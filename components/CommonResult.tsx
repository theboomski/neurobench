"use client";

import { useMemo, useState } from "react";
import ShareCopiedToast from "@/components/ShareCopiedToast";
import InterstitialAd from "@/components/InterstitialAd";
import LeaderboardSection from "@/components/LeaderboardSection";
import { createSharedResultUrl } from "@/lib/createSharedResultUrl";
import type { ResultSharePayloadV1 } from "@/lib/resultShareTypes";
import { shareZazazaChallenge } from "@/lib/shareResultChallenge";
import type { GameData } from "@/lib/types";

type AnalysisTone = "brain" | "office" | "focus" | "vocab";

interface Props {
  game: GameData;
  rawScore: number;
  rawUnit: string;
  normalizedScore: number;
  percentile: number;
  rank: { label: string; color: string; title: string; subtitle: string };
  highScore: number | null;
  isNewBest: boolean;
  showAd: boolean;
  onAdDone: () => void;
  onRetry: () => void;
  tone: AnalysisTone;
  /** When set, replaces the default tier-based killer line (e.g. game-specific viral copy). */
  killerLineOverride?: string | null;
  /** When set, replaces the default share challenge string. */
  shareTextOverride?: string | null;
  /** When set, replaces auto-generated benchmark note line. */
  benchmarkNoteOverride?: string | null;
}

function getLevel(normalized: number) {
  if (normalized >= 90) return { label: "MAIN CHARACTER ENERGY ✨", tier: 1 };
  if (normalized >= 75) return { label: "BUILT DIFFERENT 💪", tier: 2 };
  if (normalized >= 55) return { label: "THE AVERAGE JOE 🧔", tier: 3 };
  if (normalized >= 30) return { label: "STILL LOADING... ⏳", tier: 4 };
  return { label: "NPC VIBES 🤖", tier: 5 };
}

function getScoreEmoji(normalized: number): string {
  if (normalized >= 90) return "👑";
  if (normalized >= 75) return "🦾";
  if (normalized >= 55) return "😎";
  if (normalized >= 30) return "🫠";
  return "💩";
}

function getKillerLine(tone: AnalysisTone, normalized: number): string {
  const tier = normalized >= 90 ? 1 : normalized >= 75 ? 2 : normalized >= 55 ? 3 : normalized >= 30 ? 4 : 5;
  if (tier === 1) return "This run has 'drop the screenshot and start a group chat fight' energy.";
  if (tier === 2) return "You are one hot streak away from becoming everyone else's worst nightmare.";
  if (tier === 3) return "Respectable baseline, but your villain arc clearly has better stats than this.";
  if (tier === 4) return "You are not losing. You are collecting data for a brutal comeback.";
  return "This is cinematic rock bottom. Perfect setup for the greatest redemption post.";

  // kept for future tone-specific variants
  if (tone === "focus") {
    if (normalized >= 96) return "Your attention span is sharper than a samurai blade.";
    if (normalized >= 86) return "You focus like deadlines are personal.";
    if (normalized >= 71) return "You stay locked in longer than most.";
    return "You are one streak away from a comeback arc.";
  }
  if (tone === "office") {
    if (normalized >= 96) return "You make decisions like a boardroom final boss.";
    if (normalized >= 86) return "Your office instincts are dangerously efficient.";
    if (normalized >= 71) return "You can outplay chaos in most work battles.";
    return "Your strategy patch is loading - big upgrade incoming.";
  }
  if (tone === "vocab") {
    if (normalized >= 96) return "Your vocabulary has executive aura.";
    if (normalized >= 86) return "You weaponize words better than most people argue.";
    if (normalized >= 71) return "Your language game is clean and competitive.";
    return "Your next reading streak could change this whole graph.";
  }
  if (normalized >= 96) return "You have the brain of a Silicon Valley founder.";
  if (normalized >= 86) return "Your processing speed is unfair to everyone else.";
  if (normalized >= 71) return "You are operating above the global default settings.";
  return "Your ceiling is much higher than this run.";
}

function getNeonByScore(normalized: number): string {
  if (normalized >= 90) return "radial-gradient(120% 90% at 25% 10%, rgba(250,204,21,0.45) 0%, rgba(59,130,246,0.28) 45%, rgba(2,6,23,0.95) 100%)";
  if (normalized >= 70) return "radial-gradient(120% 90% at 25% 10%, rgba(56,189,248,0.42) 0%, rgba(139,92,246,0.30) 45%, rgba(2,6,23,0.95) 100%)";
  if (normalized >= 50) return "radial-gradient(120% 90% at 25% 10%, rgba(168,85,247,0.35) 0%, rgba(37,99,235,0.25) 50%, rgba(2,6,23,0.96) 100%)";
  return "radial-gradient(120% 90% at 25% 10%, rgba(71,85,105,0.35) 0%, rgba(30,41,59,0.25) 50%, rgba(2,6,23,0.98) 100%)";
}

function formatMsAsMinSec(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min} min ${String(sec).padStart(2, "0")} sec`;
}

function getGameBenchmarkNote(game: GameData, rawScore: number): string | null {
  const cfg: Record<string, { average: number; unit: string; higherIsBetter: boolean; metric: string; decimals?: number }> = {
    "number-memory": { average: 7, unit: "digits", higherIsBetter: true, metric: "working-memory span" },
    "sequence-memory": { average: 6, unit: "steps", higherIsBetter: true, metric: "sequence span" },
    "verbal-memory": { average: 22, unit: "words", higherIsBetter: true, metric: "recognition memory score" },
    "visual-memory": { average: 8, unit: "levels", higherIsBetter: true, metric: "visual memory level" },
    "chimp-test": { average: 7, unit: "numbers", higherIsBetter: true, metric: "sequence recall span" },
    "typing-speed": { average: 40, unit: "wpm", higherIsBetter: true, metric: "typing speed" },
    "color-conflict": { average: 10, unit: "correct", higherIsBetter: true, metric: "inhibition-control score" },
    "color-conflict-2": { average: 24, unit: "correct", higherIsBetter: true, metric: "meaning-ink match score" },
    "instant-comparison": { average: 12, unit: "correct", higherIsBetter: true, metric: "magnitude-comparison score" },
    "rapid-scan": { average: 8, unit: "rounds", higherIsBetter: true, metric: "visual search score" },
    "count-master": { average: 72, unit: "% acc", higherIsBetter: true, metric: "numerosity accuracy" },
    "distraction-shield": { average: 68, unit: "%", higherIsBetter: true, metric: "focus control score" },
    "reaction-time": { average: 270, unit: "ms", higherIsBetter: false, metric: "reaction latency" },
    "temporal-pulse": { average: 130, unit: "ms avg", higherIsBetter: false, metric: "timing error" },
    "dont-blink": { average: 420, unit: "ms avg", higherIsBetter: false, metric: "change-detection latency" },
    "angle-precision": { average: 12, unit: "deg error", higherIsBetter: false, metric: "angle error" },
    "boss-slapper": { average: 1900, unit: "ms", higherIsBetter: false, metric: "10-tap stress neutralization time" },
    "report-or-favor": { average: 7, unit: "streak", higherIsBetter: true, metric: "boundary-decision streak" },
    "boss-dodge": { average: 15, unit: "caught", higherIsBetter: true, metric: "selective response score" },
    "raise-or-raise": { average: 62, unit: "% peak", higherIsBetter: true, metric: "negotiation timing capture" },
    "corporate-climber": { average: 11, unit: "promotions", higherIsBetter: true, metric: "adaptive planning score" },
    "attention-span": { average: 66, unit: "%", higherIsBetter: true, metric: "sustained attention score" },
    "task-switching": { average: 58, unit: "%", higherIsBetter: true, metric: "cognitive flexibility score" },
    "vocabulary-age": { average: 61, unit: "%", higherIsBetter: true, metric: "vocabulary precision score" },
    "word-speed": { average: 57, unit: "%", higherIsBetter: true, metric: "lexical decision score" },
    "word-association": { average: 60, unit: "%", higherIsBetter: true, metric: "semantic association score" },
    "mini-speed-sudoku": { average: 320000, unit: "ms", higherIsBetter: false, metric: "3-round total completion time" },
  };

  const b = cfg[game.id];
  if (!b) return null;

  if (game.id === "mini-speed-sudoku") {
    const meMs = Math.max(0, Math.round(rawScore));
    const avgMs = Math.max(0, Math.round(b.average));
    const deltaMs = Math.abs(meMs - avgMs);
    if (meMs <= avgMs) {
      return `Benchmark: ${b.metric} ${formatMsAsMinSec(meMs)}; global average ${formatMsAsMinSec(avgMs)}. You are ${formatMsAsMinSec(deltaMs)} faster than average.`;
    }
    return `Benchmark: ${b.metric} ${formatMsAsMinSec(meMs)}; global average ${formatMsAsMinSec(avgMs)}. You are ${formatMsAsMinSec(deltaMs)} slower than average.`;
  }

  const decimals = b.decimals ?? 0;
  const me = Number(rawScore.toFixed(decimals));
  const avg = Number(b.average.toFixed(decimals));
  const delta = Number(Math.abs(me - avg).toFixed(decimals));

  if (b.higherIsBetter) {
    if (me >= avg) {
      return `Benchmark: ${b.metric} ${me} ${b.unit}; global average ${avg} ${b.unit}. You are +${delta} above average.`;
    }
    return `Benchmark: ${b.metric} ${me} ${b.unit}; global average ${avg} ${b.unit}. You are ${delta} below average.`;
  }

  if (me <= avg) {
    return `Benchmark: ${b.metric} ${me} ${b.unit}; global average ${avg} ${b.unit}. You are ${delta} better (lower) than average.`;
  }
  return `Benchmark: ${b.metric} ${me} ${b.unit}; global average ${avg} ${b.unit}. You are ${delta} above average (higher error/latency).`;
}

export default function CommonResult({
  game,
  rawScore,
  rawUnit,
  normalizedScore,
  percentile,
  rank,
  highScore,
  isNewBest,
  showAd,
  onAdDone,
  onRetry,
  tone,
  killerLineOverride,
  shareTextOverride,
  benchmarkNoteOverride,
}: Props) {
  const level = getLevel(normalizedScore);
  const scoreEmoji = getScoreEmoji(normalizedScore);
  const killerLine = killerLineOverride ?? getKillerLine(tone, normalizedScore);
  const benchmarkNote = benchmarkNoteOverride ?? getGameBenchmarkNote(game, rawScore);
  const WORLD_POP = 8_200_000_000;
  const higherThanPct = Math.max(0, Math.min(99.9, percentile));
  const peopleCount = Math.round((higherThanPct / 100) * WORLD_POP);
  const peopleBillions = (peopleCount / 1_000_000_000).toFixed(2);
  const [copiedToast, setCopiedToast] = useState(false);
  const shareText = useMemo(() => {
    if (shareTextOverride) return shareTextOverride;
    const link = `https://zazaza.app/${game.category}/${game.id}`;
    return `I scored ${normalizedScore} points in ${game.title}. Can you beat me? 🕹️ ${link}`;
  }, [game.category, game.id, game.title, normalizedScore, shareTextOverride]);

  const handleShare = async () => {
    const percentileSentence = `Your score is higher than ${higherThanPct.toFixed(1)}% of the world - about ${peopleBillions} billion people.`;
    const payload: ResultSharePayloadV1 = {
      v: 1,
      kind: "common",
      category: game.category,
      id: game.id,
      gameTitle: game.title,
      primaryColor: game.accent,
      normalizedScore,
      rawScore,
      rawUnit,
      percentile,
      rank,
      levelLabel: level.label,
      scoreEmoji,
      percentileSentence,
      killerLine,
      benchmarkNote,
      tone,
    };
    const url = await createSharedResultUrl(payload);
    const challenge = shareTextOverride
      ? `${shareTextOverride} ${url}`
      : `${scoreEmoji} I got ${level.label} in ${game.title}! Score: ${normalizedScore}/100. Can you beat me? ${url}`;
    await shareZazazaChallenge({
      title: `${scoreEmoji} ${level.label} — ${game.title} | ZAZAZA`,
      text: challenge,
      url,
      onCopied: () => {
        setCopiedToast(true);
        window.setTimeout(() => setCopiedToast(false), 2200);
      },
    });
  };

  return (
    <>
      <ShareCopiedToast show={copiedToast} />
      {showAd && <InterstitialAd onDone={onAdDone} />}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div
          className="anim-scale-in"
          style={{
            width: "min(92vw, 420px)",
            minHeight: "min(88vh, 760px)",
            background: getNeonByScore(normalizedScore),
            border: "1px solid rgba(255,255,255,0.22)",
            borderTop: `2px solid ${rank.color}`,
            borderRadius: 24,
            padding: "20px 16px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 8,
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            boxShadow: `0 20px 60px rgba(0,0,0,0.45), 0 0 50px ${rank.color}33`,
            overflow: "visible",
            fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          }}
        >
        <div style={{ fontSize: 106, lineHeight: 1, marginTop: 2, marginBottom: 2 }}>
          {scoreEmoji}
        </div>
        <div style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4, fontFamily: "var(--font-mono)" }}>
          ZAZAZA Result
        </div>

        <div style={{ margin: "12px auto 8px", width: "100%", borderRadius: 18, padding: "16px 10px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", boxShadow: `0 0 36px ${rank.color}66 inset` }}>
        <div style={{ fontSize: "clamp(72px,21vw,122px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1, color: "#fff", textShadow: `0 0 22px ${rank.color}, 0 10px 28px rgba(0,0,0,0.45)` }}>
          {normalizedScore}
          <span style={{ fontSize: "clamp(18px,3vw,24px)", fontWeight: 700, color: "rgba(255,255,255,0.95)", marginLeft: 10, letterSpacing: "0.04em" }}>/100</span>
        </div>
        </div>

        <div style={{ fontSize: 38, color: "#fff", fontWeight: 900, marginBottom: 8, letterSpacing: "-0.01em", lineHeight: 1.03, textWrap: "balance" as never, textShadow: `2px 0 rgba(255,0,128,0.28), -2px 0 rgba(0,255,255,0.28), 0 0 18px ${rank.color}` }}>
          {level.label}
        </div>
        <div style={{ fontSize: 16, color: "rgba(255,255,255,0.96)", fontWeight: 700, marginBottom: 6, lineHeight: 1.3, textWrap: "balance" as never }}>
          You scored {normalizedScore} in {game.title}.
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "rgba(255,255,255,0.95)", marginBottom: 6, lineHeight: 1.3 }}>
          Your score is higher than {higherThanPct.toFixed(1)}% of the world - about {peopleBillions} billion people.
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: "rgba(209,250,229,0.98)", marginBottom: 10, lineHeight: 1.25, textWrap: "balance" as never, textShadow: `0 0 18px ${rank.color}66`, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, padding: "10px 12px" }}>
          {killerLine}
        </div>

        {benchmarkNote && (
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.62)", lineHeight: 1.4, marginBottom: 8, fontFamily: "var(--font-mono)" }}>
            {benchmarkNote}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "nowrap", marginTop: "auto", paddingBottom: "max(6px, env(safe-area-inset-bottom))" }}>
          <button onClick={onRetry} className="pressable" style={{ background: "var(--bg-elevated)", color: "var(--text-1)", border: "1px solid var(--border-md)", borderRadius: "var(--radius-md)", padding: "14px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer", width: "50%", fontFamily: "inherit", letterSpacing: "0.01em" }}>
            ▶ PLAY AGAIN
          </button>
          <button onClick={handleShare} className="pressable" style={{ background: game.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "14px 12px", fontSize: 12, fontWeight: 900, cursor: "pointer", width: "50%", fontFamily: "inherit", letterSpacing: "0.01em" }}>
            Share Result
          </button>
        </div>
        </div>
      </div>
      {game.hasLeaderboard && (
        <LeaderboardSection gameId={game.id} rawScore={rawScore} rawUnit={rawUnit} accent={game.accent} />
      )}
      </div>
    </>
  );
}
