"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { appendTriathlonModeQuery, getTriathlonNameForGameId, getTriathlonPathForGameId } from "@/lib/triathlonDailyGames";
import {
  TRIATHLON_STORAGE_KEY,
  normalizeTriathlonRawScore,
  parseTriathlonSession,
  type TriathlonSession,
} from "@/lib/triathlonSession";

const ACCENT = "#00FF94";

type UiState =
  | null
  | { kind: "next"; path: string; nextTitle: string }
  | { kind: "complete" };

function computeUi(session: TriathlonSession, finishedGameId: string): UiState {
  if (session.currentIndex < 1) return null;
  const justFinished = session.games[session.currentIndex - 1];
  if (justFinished !== finishedGameId) return null;
  if (session.currentIndex < session.games.length) {
    const nextId = session.games[session.currentIndex];
    const path = getTriathlonPathForGameId(nextId);
    if (!path) return null;
    return { kind: "next", path: appendTriathlonModeQuery(path), nextTitle: getTriathlonNameForGameId(nextId) };
  }
  return { kind: "complete" };
}

type Props = {
  gameId: string;
  /** Percentile-based 0–100 for result card UI only. */
  normalizedScore: number;
  /** Raw game score (same units as leaderboard / finalScore) for ZCI linear normalization. */
  rawScore: number;
  /** Full-width primary CTA inside CommonResult triathlon card (no outer landing margin). */
  embedded?: boolean;
};

/**
 * When an active triathlon session matches this result leg, records the score once
 * (strict-mode safe) and shows the next-game or complete CTA below the main result UI.
 */
export default function TriathlonResultContinuation({ gameId, normalizedScore, rawScore, embedded }: Props) {
  const [ui, setUi] = useState<UiState>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Shared score landings use `/games/[id]/result` — never mutate triathlon session there.
    if (/^\/games\/[^/]+\/result\/?$/i.test(window.location.pathname)) return;

    const raw = sessionStorage.getItem(TRIATHLON_STORAGE_KEY);
    let session = parseTriathlonSession(raw);
    if (!session) return;

    const legIndex = session.games.indexOf(gameId);
    if (legIndex === -1) return;

    if (session.scores.length === legIndex && session.currentIndex === legIndex) {
      const gid = session.games[legIndex];
      session = {
        ...session,
        scores: [
          ...session.scores,
          {
            game: gid,
            score: rawScore,
            normalizedScore: normalizeTriathlonRawScore(rawScore, gid),
          },
        ],
        currentIndex: legIndex + 1,
      };
      sessionStorage.setItem(TRIATHLON_STORAGE_KEY, JSON.stringify(session));
    }

    const fresh = parseTriathlonSession(sessionStorage.getItem(TRIATHLON_STORAGE_KEY));
    if (!fresh) return;
    setUi(computeUi(fresh, gameId));
  }, [gameId, normalizedScore, rawScore]);

  if (!ui) return null;

  const linkStyleDefault: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    maxWidth: 420,
    margin: "0 auto",
    padding: "16px 20px",
    borderRadius: "var(--radius-lg)",
    background: `${ACCENT}18`,
    border: `1px solid ${ACCENT}`,
    color: ACCENT,
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    textDecoration: "none",
    textAlign: "center",
    lineHeight: 1.35,
    boxSizing: "border-box",
  };

  const linkStyleEmbedded: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "14px 18px",
    borderRadius: "var(--radius-md)",
    background: ACCENT,
    color: "#0a0a0f",
    border: `1px solid ${ACCENT}`,
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: "-0.02em",
    textDecoration: "none",
    textAlign: "center",
    lineHeight: 1.35,
    boxSizing: "border-box",
  };

  const linkStyle = embedded ? linkStyleEmbedded : linkStyleDefault;

  const inner = (
    <>
      {ui.kind === "next" ? (
        <Link href={ui.path} style={linkStyle}>
          Next Test: {ui.nextTitle} →
        </Link>
      ) : (
        <Link href="/triathlon/complete" style={linkStyle}>
          See Your ZCI →
        </Link>
      )}
    </>
  );

  if (embedded) {
    return <div style={{ width: "100%", marginBottom: 4 }}>{inner}</div>;
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 420,
        marginTop: 20,
        paddingLeft: 12,
        paddingRight: 12,
        paddingBottom: "max(8px, env(safe-area-inset-bottom))",
      }}
    >
      {inner}
    </div>
  );
}
