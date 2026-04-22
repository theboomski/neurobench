"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import CommonResult from "@/components/CommonResult";
import GameLayout from "@/components/GameLayout";
import LeaderboardSection from "@/components/LeaderboardSection";
import ShareCopiedToast from "@/components/ShareCopiedToast";
import { canonicalGamePath } from "@/lib/canonicalGamePaths";
import { createSharedResultUrl } from "@/lib/createSharedResultUrl";
import { ALL_GAMES } from "@/lib/games";
import { getHighScore } from "@/lib/gameUtils";
import { gunzipBase64UrlToJson } from "@/lib/resultShareCodec";
import { gameForPayload, isResultSharePayloadV1, payloadMatchesRoute, type ResultSharePayloadV1 } from "@/lib/resultShareTypes";
import { resolveResultTone } from "@/lib/resultUtils";
import { shareReportStyleResult } from "@/lib/shareReportStyleResult";
import { shareZazazaChallenge } from "@/lib/shareResultChallenge";
import type { GameData } from "@/lib/types";

function leaderboardUnitFromQuizPayload(p: Extract<ResultSharePayloadV1, { kind: "quiz" }>): string {
  const s = p.scoreSuffix.trim();
  if (s === "/100") return "/100";
  if (s === "%") return "%";
  return s || "pts";
}

function ReportQuizResultBody({
  game,
  payload,
  onPlayAgain,
}: {
  game: GameData;
  payload: Extract<ResultSharePayloadV1, { kind: "quiz" }>;
  onPlayAgain: () => void;
}) {
  const [toast, setToast] = useState(false);
  const pct = payload.percentile;
  const rank = useMemo(
    () => ({
      label: payload.rankLabel,
      color: payload.rankColor,
      title: payload.rankTitle,
      subtitle: payload.rankSubtitle,
      percentileLabel: payload.rankPercentileLabel || "GLOBAL",
    }),
    [payload],
  );

  const handleShare = async () => {
    await shareReportStyleResult({
      game,
      clinicalHeader: payload.clinicalHeader,
      scoreNum: payload.scoreNum,
      scoreSuffix: payload.scoreSuffix,
      rank,
      percentile: pct,
      emoji: payload.ogEmoji,
      onCopied: () => {
        setToast(true);
        window.setTimeout(() => setToast(false), 2200);
      },
    });
  };

  return (
    <>
      <ShareCopiedToast show={toast} />
      <div
        className="anim-scale-in"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-md)",
          borderTop: `2px solid ${rank.color}`,
          borderRadius: "var(--radius-xl)",
          padding: "clamp(28px,5vw,48px) clamp(20px,4vw,40px)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: "var(--text-3)",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 20,
          }}
        >
          {payload.clinicalHeader}
        </div>
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: `${rank.color}12`,
            border: `2px solid ${rank.color}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <span style={{ fontSize: 42, fontWeight: 900, color: rank.color, lineHeight: 1 }}>{rank.label}</span>
          <span
            style={{
              fontSize: 9,
              color: rank.color,
              opacity: 0.7,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontFamily: "var(--font-mono)",
            }}
          >
            {rank.percentileLabel}
          </span>
        </div>
        <div style={{ fontSize: "clamp(52px,13vw,80px)", fontWeight: 900, letterSpacing: "-0.05em", lineHeight: 1, marginBottom: 4 }}>
          {payload.scoreNum}
          <span style={{ fontSize: 20, fontWeight: 400, color: "var(--text-3)", marginLeft: 4, fontFamily: "var(--font-mono)" }}>
            {payload.scoreSuffix}
          </span>
        </div>
        <div style={{ fontSize: 13, color: game.accent, fontWeight: 700, marginBottom: 6, fontFamily: "var(--font-mono)" }}>
          TOP {100 - pct}% GLOBALLY
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: rank.color, marginBottom: 4 }}>{rank.title}</div>
        <div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic", marginBottom: 20 }}>&quot;{rank.subtitle}&quot;</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginTop: 8 }}>
          <button
            type="button"
            onClick={onPlayAgain}
            className="pressable"
            style={{
              background: game.accent,
              color: "#000",
              border: "none",
              borderRadius: "var(--radius-md)",
              padding: "13px 28px",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              minWidth: 140,
              fontFamily: "var(--font-mono)",
            }}
          >
            ▶ PLAY AGAIN
          </button>
          <button
            type="button"
            onClick={() => void handleShare()}
            className="pressable"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-1)",
              border: "1px solid var(--border-md)",
              borderRadius: "var(--radius-md)",
              padding: "13px 28px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              minWidth: 140,
              fontFamily: "var(--font-mono)",
            }}
          >
            ↗ SHARE
          </button>
        </div>
      </div>
      {game.hasLeaderboard && (
        <LeaderboardSection
          gameId={game.id}
          rawScore={payload.scoreNum}
          rawUnit={leaderboardUnitFromQuizPayload(payload)}
          accent={game.accent}
        />
      )}
    </>
  );
}

function SudokuResultBody({
  game,
  payload,
  onPlayAgain,
}: {
  game: GameData;
  payload: Extract<ResultSharePayloadV1, { kind: "sudoku" }>;
  onPlayAgain: () => void;
}) {
  const [toast, setToast] = useState(false);

  const handleShare = async () => {
    const url = await createSharedResultUrl(payload);
    const text = `${payload.ogEmoji} I got ${payload.ogLabel} in ${payload.ogTestName}! Score: ${payload.ogScore}. ${payload.ogPercentileLine} Can you beat me? ${url}`;
    await shareZazazaChallenge({
      title: `${payload.ogEmoji} ${payload.ogLabel} — ${payload.ogTestName} | ZAZAZA`,
      text,
      url,
      onCopied: () => {
        setToast(true);
        window.setTimeout(() => setToast(false), 2200);
      },
    });
  };

  return (
    <>
      <ShareCopiedToast show={toast} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: "min(92vw, 420px)",
            borderRadius: 18,
            border: "1px solid var(--border-md)",
            background: "var(--bg-card)",
            padding: "20px 16px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 44, marginBottom: 8 }}>🧩</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em", color: "var(--text-3)", marginBottom: 8 }}>
            SPEED SUDOKU RESULTS
          </div>
          <div style={{ fontSize: 34, fontWeight: 900, color: game.accent, letterSpacing: "-0.02em", marginBottom: 8 }}>{payload.totalScore}</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-2)", marginBottom: 14 }}>TOTAL SCORE</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 8px" }}>
              <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>Levels completed</div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{payload.levelsCompleted}</div>
            </div>
            <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 8px" }}>
              <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>Avg time / puzzle</div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>
                {(() => {
                  const m = Math.floor(payload.avgSec / 60);
                  const s = payload.avgSec % 60;
                  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
                })()}
              </div>
            </div>
            <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 8px" }}>
              <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>Difficulty reached</div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{payload.difficultyLabel}</div>
            </div>
            <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 8px" }}>
              <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>Best score</div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{getHighScore(game.id) ?? payload.totalScore}</div>
            </div>
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35, marginBottom: 14 }}>{payload.outcomeLine}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={onPlayAgain}
              className="pressable"
              style={{
                width: "50%",
                background: "var(--bg-elevated)",
                color: "var(--text-1)",
                border: "1px solid var(--border-md)",
                borderRadius: "var(--radius-md)",
                padding: "12px 10px",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
              }}
            >
              ▶ PLAY AGAIN
            </button>
            <button
              type="button"
              onClick={() => void handleShare()}
              className="pressable"
              style={{
                width: "50%",
                background: game.accent,
                color: "#000",
                border: "none",
                borderRadius: "var(--radius-md)",
                padding: "12px 10px",
                fontSize: 12,
                fontWeight: 900,
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
              }}
            >
              Share Result
            </button>
          </div>
        </div>
        <LeaderboardSection gameId={game.id} rawScore={payload.totalScore} rawUnit="pts" accent={game.accent} />
      </div>
    </>
  );
}

type Props = {
  category?: string;
  id?: string;
  zParam?: string;
  payload?: ResultSharePayloadV1;
};

export default function ResultShareLanding({ category, id, zParam, payload: prefetchedPayload }: Props) {
  const router = useRouter();
  const [payload, setPayload] = useState<ResultSharePayloadV1 | null>(prefetchedPayload ?? null);
  const [bad, setBad] = useState(false);

  useEffect(() => {
    if (prefetchedPayload) {
      setPayload(prefetchedPayload);
      setBad(false);
      return;
    }
    let cancelled = false;
    (async () => {
      if (!zParam) {
        setBad(true);
        return;
      }
      const decoded = await gunzipBase64UrlToJson<unknown>(decodeURIComponent(zParam));
      if (cancelled) return;
      if (!isResultSharePayloadV1(decoded)) {
        setBad(true);
        return;
      }
      if (category && id && !payloadMatchesRoute(decoded, category, id)) {
        setBad(true);
        return;
      }
      setPayload(decoded);
    })();
    return () => {
      cancelled = true;
    };
  }, [category, id, zParam, prefetchedPayload]);

  const game = useMemo(() => {
    if (!payload) return undefined;
    return gameForPayload(payload, ALL_GAMES);
  }, [payload]);

  const onPlayAgain = useCallback(() => {
    if (game) router.push(canonicalGamePath(game));
    else if (category && id) router.push(`/${category}/${id}`);
    else router.push("/");
  }, [router, game, category, id]);

  if (bad || (payload && !game)) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: "var(--text-2)", fontFamily: "var(--font-mono)" }}>
        Invalid or expired result link.
      </div>
    );
  }

  if (!payload || !game) {
    return (
      <div style={{ padding: 48, textAlign: "center", color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
        Loading…
      </div>
    );
  }

  if (payload.kind === "common") {
    const hs = getHighScore(game.id);
    const tone = resolveResultTone(game);
    return (
      <GameLayout game={game}>
        <CommonResult
          game={game}
          rawScore={payload.rawScore}
          rawUnit={payload.rawUnit}
          normalizedScore={payload.normalizedScore}
          percentile={payload.percentile}
          rank={payload.rank}
          highScore={hs}
          isNewBest={false}
          showAd={false}
          onAdDone={() => {}}
          onRetry={onPlayAgain}
          tone={tone}
          killerLineOverride={payload.killerLine}
          shareTextOverride={null}
        />
      </GameLayout>
    );
  }

  if (payload.kind === "quiz") {
    return (
      <GameLayout game={game}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, paddingBottom: 24 }}>
          <ReportQuizResultBody game={game} payload={payload} onPlayAgain={onPlayAgain} />
        </div>
      </GameLayout>
    );
  }

  return (
    <GameLayout game={game}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, paddingBottom: 24 }}>
        <SudokuResultBody game={game} payload={payload} onPlayAgain={onPlayAgain} />
      </div>
    </GameLayout>
  );
}
