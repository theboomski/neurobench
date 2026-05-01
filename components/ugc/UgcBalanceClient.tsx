"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { shareTextNativeOrClipboard } from "@/lib/shareTextNativeOrClipboard";
import { getSupabaseBrowser } from "@/lib/supabase";

type BalanceGame = { id: string; title: string; slug: string; description?: string | null; play_count?: number };
type BalanceOption = { id: string; option_a: string; option_b: string; round: number; order: number };
type BalanceSummary = { aFinalWins: number; bFinalWins: number; totalPlays: number; aRoundWins: number; bRoundWins: number };

type BalanceScoreRow = { id: "a" | "b"; name: string; matchCount: number; winCount: number; finalWinsCount: number };

const MUSTARD = "#b8860b";

export default function UgcBalanceClient({ game, options, summary }: { game: BalanceGame; options: BalanceOption[]; summary: BalanceSummary }) {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [started, setStarted] = useState(false);
  const [mobileMode, setMobileMode] = useState<"top" | "all">("top");
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<{ id: string; pick: "a" | "b" }[]>([]);
  const [winner, setWinner] = useState<"a" | "b" | null>(null);
  const [hovered, setHovered] = useState<"a" | "b" | null>(null);
  const [winFlash, setWinFlash] = useState<"a" | "b" | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const onChange = () => setIsMobile(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const current = options[index];
  const optionALabel = options[0]?.option_a?.trim() || "Option A";
  const optionBLabel = options[0]?.option_b?.trim() || "Option B";

  const totalRoundPicks = summary.aRoundWins + summary.bRoundWins;
  const scoreboard: BalanceScoreRow[] = useMemo(
    () => [
      { id: "a", name: optionALabel, matchCount: totalRoundPicks, winCount: summary.aRoundWins, finalWinsCount: summary.aFinalWins },
      { id: "b", name: optionBLabel, matchCount: totalRoundPicks, winCount: summary.bRoundWins, finalWinsCount: summary.bFinalWins },
    ],
    [optionALabel, optionBLabel, summary.aFinalWins, summary.aRoundWins, summary.bFinalWins, summary.bRoundWins, totalRoundPicks],
  );

  const rankedScoreboard = useMemo(() => rankScoreboard(scoreboard, Number(summary.totalPlays ?? 0)), [scoreboard, summary.totalPlays]);
  const mobileRows = useMemo(() => (mobileMode === "top" ? rankedScoreboard.slice(0, 5) : rankedScoreboard), [mobileMode, rankedScoreboard]);

  const canonicalUrl = `https://zazaza.app/ugc/balance/${game.slug}`;

  const sharePrePlay = async () => {
    const text = `Everyone's voting on "${game.title}"\nWhat's your pick? → ${canonicalUrl}`;
    await shareTextNativeOrClipboard({
      title: game.title,
      text,
      analytics: { content_type: "ugc_balance", item_id: game.slug },
    });
  };

  const sharePostPlay = async (winnerName: string) => {
    const votes = Number(game.play_count ?? 0);
    const text = `I voted ${winnerName} in "${game.title}" (${votes} votes so far)\nYou agree? → ${canonicalUrl}`;
    await shareTextNativeOrClipboard({
      title: game.title,
      text,
      analytics: { content_type: "ugc_balance", item_id: game.slug },
    });
  };

  const onPick = async (value: "a" | "b") => {
    setWinFlash(value);
    await new Promise((resolve) => window.setTimeout(resolve, 320));
    setWinFlash(null);
    const next = [...picked, { id: current.id, pick: value }];
    if (index + 1 >= options.length) {
      const aCount = next.filter((n) => n.pick === "a").length;
      const bCount = next.length - aCount;
      const finalWinner = aCount >= bCount ? "a" : "b";
      setWinner(finalWinner);
      const supabase = getSupabaseBrowser();
      const token = (await supabase?.auth.getSession())?.data.session?.access_token;
      await fetch("/api/ugc/complete-play", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          gameId: game.id,
          winnerOption: finalWinner,
          balanceRoundStats: { aCount, bCount },
        }),
      });
      return;
    }
    setPicked(next);
    setIndex(index + 1);
  };

  if (winner) {
    const aCount = picked.filter((n) => n.pick === "a").length;
    const bCount = picked.length - aCount;
    const winnerName = winner === "a" ? optionALabel : optionBLabel;
    const finalRows = rankScoreboardWithRun(scoreboard, winner, aCount, bCount, Number(summary.totalPlays ?? 0));
    const finalMobileRows = mobileMode === "top" ? finalRows.slice(0, 5) : finalRows;
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px 56px", textAlign: "center" }}>
        <h1 style={{ fontSize: 36, fontWeight: 900 }}>{game.title}</h1>
        {game.description && <p style={{ marginTop: 6, color: "var(--text-2)", fontSize: 14 }}>{game.description}</p>}
        <div style={{ marginTop: 12, display: "grid", justifyItems: "center", gap: 10 }}>
          <p style={{ margin: 0, color: "var(--text-1)", fontSize: "clamp(28px, 6.5vw, 52px)", fontWeight: 900, lineHeight: 1.04, letterSpacing: "-0.02em" }}>
            Your #1 choice is
          </p>
          <div
            style={{
              width: 180,
              aspectRatio: "1 / 1",
              borderRadius: 14,
              border: "1px solid var(--border)",
              background: "linear-gradient(145deg, rgba(184,134,11,0.22), rgba(20,16,8,0.9))",
              display: "grid",
              placeItems: "center",
              padding: 14,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 900, lineHeight: 1.12, color: "var(--text-1)", textAlign: "center", wordBreak: "break-word" }}>
              {winnerName}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14 }}>
          <button onClick={() => sharePostPlay(winnerName)} style={{ borderRadius: 10, border: "1px solid var(--border)", padding: "10px 12px", cursor: "pointer" }}>
            Share
          </button>
          <button onClick={() => window.location.reload()} style={{ borderRadius: 10, border: "1px solid var(--border)", padding: "10px 12px", cursor: "pointer" }}>
            Play Again
          </button>
          <button onClick={() => router.push(`/ugc/balance/${game.slug}/tier`)} style={{ borderRadius: 10, border: "none", padding: "10px 12px", background: MUSTARD, color: "#231600", fontWeight: 800, cursor: "pointer" }}>
            Tier
          </button>
        </div>
        {isMobile ? (
          <>
            <div style={{ marginTop: 12, display: "inline-flex", border: "1px solid var(--border)", borderRadius: 999, overflow: "hidden" }}>
              <button
                onClick={() => setMobileMode("top")}
                style={{
                  border: "none",
                  background: mobileMode === "top" ? "rgba(184,134,11,0.24)" : "transparent",
                  color: mobileMode === "top" ? MUSTARD : "var(--text-2)",
                  padding: "8px 12px",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Top 5
              </button>
              <button
                onClick={() => setMobileMode("all")}
                style={{
                  border: "none",
                  background: mobileMode === "all" ? "rgba(184,134,11,0.24)" : "transparent",
                  color: mobileMode === "all" ? MUSTARD : "var(--text-2)",
                  padding: "8px 12px",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                All
              </button>
            </div>
            <MobileBalanceResultsList rows={finalMobileRows} />
          </>
        ) : (
          <ResultsTable rows={finalRows} />
        )}
      </div>
    );
  }

  if (!started) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px 56px" }}>
        <div>
          <h1 style={{ fontSize: 36, fontWeight: 900 }}>{game.title}</h1>
          {game.description && <p style={{ marginTop: 6, color: "var(--text-1)", fontSize: 14, fontWeight: 600 }}>{game.description}</p>}
          <p style={{ marginTop: 6, color: "var(--text-2)", fontSize: 13 }}>Current Standings</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            <button onClick={() => setStarted(true)} style={{ border: "none", borderRadius: 10, padding: "11px 14px", background: MUSTARD, color: "#231600", fontWeight: 900, cursor: "pointer" }}>
              ▶ PLAY
            </button>
            <button onClick={sharePrePlay} style={{ borderRadius: 10, border: "1px solid var(--border)", padding: "9px 12px", cursor: "pointer" }}>
              Share
            </button>
          </div>
        </div>
        {isMobile ? (
          <>
            <div style={{ marginTop: 12, display: "inline-flex", border: "1px solid var(--border)", borderRadius: 999, overflow: "hidden" }}>
              <button
                onClick={() => setMobileMode("top")}
                style={{
                  border: "none",
                  background: mobileMode === "top" ? "rgba(184,134,11,0.24)" : "transparent",
                  color: mobileMode === "top" ? MUSTARD : "var(--text-2)",
                  padding: "8px 12px",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Top 5
              </button>
              <button
                onClick={() => setMobileMode("all")}
                style={{
                  border: "none",
                  background: mobileMode === "all" ? "rgba(184,134,11,0.24)" : "transparent",
                  color: mobileMode === "all" ? MUSTARD : "var(--text-2)",
                  padding: "8px 12px",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                All
              </button>
            </div>
            <MobileBalanceResultsList rows={mobileRows} />
          </>
        ) : (
          <ResultsTable rows={rankedScoreboard} />
        )}
        <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-start" }}>
          <ReportLink gameId={game.id} slug={game.slug} gameType="balance" label="Report This" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px 56px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 900 }}>{game.title}</h1>
      <p style={{ marginTop: 4, color: "var(--text-2)", fontSize: 12 }}>
        Round {index + 1} / {options.length}
      </p>
      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center" }}>
        <button
          onClick={() => onPick("a")}
          onMouseEnter={() => setHovered("a")}
          onMouseLeave={() => setHovered(null)}
          style={{
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "20px 14px",
            background: "var(--bg-card)",
            textAlign: "center",
            minHeight: 180,
            cursor: "pointer",
            transition: "transform 140ms ease",
            transform: winFlash === "a" ? "scale(1.04)" : hovered === "a" ? "scale(1.02)" : "scale(1)",
            position: "relative",
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.2 }}>{current.option_a}</div>
          {winFlash === "a" && (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: MUSTARD, fontWeight: 900, fontSize: 36, textShadow: "0 0 18px rgba(0,0,0,0.7)" }}>
              WIN
            </div>
          )}
        </button>
        <div style={{ fontSize: 34, fontWeight: 900, color: "var(--text-2)", textAlign: "center" }}>VS</div>
        <button
          onClick={() => onPick("b")}
          onMouseEnter={() => setHovered("b")}
          onMouseLeave={() => setHovered(null)}
          style={{
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "20px 14px",
            background: "var(--bg-card)",
            textAlign: "center",
            minHeight: 180,
            cursor: "pointer",
            transition: "transform 140ms ease",
            transform: winFlash === "b" ? "scale(1.04)" : hovered === "b" ? "scale(1.02)" : "scale(1)",
            position: "relative",
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.2 }}>{current.option_b}</div>
          {winFlash === "b" && (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: MUSTARD, fontWeight: 900, fontSize: 36, textShadow: "0 0 18px rgba(0,0,0,0.7)" }}>
              WIN
            </div>
          )}
        </button>
      </div>
    </div>
  );
}

function MobileBalanceResultsList({ rows }: { rows: Array<BalanceScoreRow & { oneVsOneRatio: number; finalWinRatio: number }> }) {
  return (
    <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
      {rows.map((row, idx) => (
        <div
          key={row.id}
          style={{
            border: "1px solid var(--border)",
            borderRadius: 12,
            background: "var(--bg-card)",
            padding: 10,
            display: "grid",
            gridTemplateColumns: "28px 1fr",
            gap: 10,
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-2)", fontWeight: 900 }}>#{idx + 1}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, lineHeight: 1.2 }}>{row.name}</div>
            <div style={{ marginTop: 6, display: "grid", gap: 5 }}>
              <div style={{ display: "grid", gap: 3 }}>
                <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>Final Win {row.finalWinRatio.toFixed(1)}%</div>
                <div style={{ height: 6, borderRadius: 999, background: "rgba(148,163,184,0.22)", overflow: "hidden" }}>
                  <div style={{ width: `${Math.max(0, Math.min(100, row.finalWinRatio))}%`, height: "100%", background: "#3b82f6" }} />
                </div>
              </div>
              <div style={{ display: "grid", gap: 3 }}>
                <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>Round Win {row.oneVsOneRatio.toFixed(1)}%</div>
                <div style={{ height: 6, borderRadius: 999, background: "rgba(148,163,184,0.22)", overflow: "hidden" }}>
                  <div style={{ width: `${Math.max(0, Math.min(100, row.oneVsOneRatio))}%`, height: "100%", background: "#22c55e" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function rankScoreboard(rows: BalanceScoreRow[], totalPlays: number) {
  const normalized = rows.map((row) => ({
    ...row,
    oneVsOneRatio: row.matchCount > 0 ? Math.round((row.winCount / row.matchCount) * 1000) / 10 : 0,
    finalWinRatio: totalPlays > 0 ? Math.round((row.finalWinsCount / totalPlays) * 1000) / 10 : 0,
  }));
  normalized.sort((a, b) => {
    if (b.finalWinRatio !== a.finalWinRatio) return b.finalWinRatio - a.finalWinRatio;
    if (b.oneVsOneRatio !== a.oneVsOneRatio) return b.oneVsOneRatio - a.oneVsOneRatio;
    return a.name.localeCompare(b.name);
  });
  return normalized;
}

function rankScoreboardWithRun(rows: BalanceScoreRow[], winnerId: "a" | "b", runACount: number, runBCount: number, currentTotalPlays: number) {
  const nextTotalPlays = currentTotalPlays + 1;
  const runPicks = runACount + runBCount;
  const nextRows: BalanceScoreRow[] = rows.map((row) => {
    if (row.id === "a") {
      return {
        ...row,
        matchCount: row.matchCount + runPicks,
        winCount: row.winCount + runACount,
        finalWinsCount: row.finalWinsCount + (winnerId === "a" ? 1 : 0),
      };
    }
    return {
      ...row,
      matchCount: row.matchCount + runPicks,
      winCount: row.winCount + runBCount,
      finalWinsCount: row.finalWinsCount + (winnerId === "b" ? 1 : 0),
    };
  });
  return rankScoreboard(nextRows, nextTotalPlays);
}

function ResultsTable({ rows }: { rows: Array<BalanceScoreRow & { oneVsOneRatio: number; finalWinRatio: number }> }) {
  return (
    <div style={{ marginTop: 12, border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--bg-card)" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "54px minmax(120px,1fr) minmax(120px,1fr) minmax(120px,1fr)",
          gap: 10,
          alignItems: "center",
          padding: "10px 12px",
          borderBottom: "1px solid var(--border)",
          fontSize: 12,
          color: "var(--text-1)",
          fontFamily: "var(--font-mono)",
          fontWeight: 900,
          letterSpacing: "0.02em",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        <div>Rank</div>
        <div>Option</div>
        <div>Round Win Ratio</div>
        <div>Final Win Ratio</div>
      </div>
      {rows.map((row, idx) => (
        <div
          key={row.id}
          style={{
            display: "grid",
            gridTemplateColumns: "54px minmax(120px,1fr) minmax(120px,1fr) minmax(120px,1fr)",
            gap: 10,
            alignItems: "center",
            padding: "10px 12px",
            borderBottom: idx === rows.length - 1 ? "none" : "1px solid var(--border)",
          }}
        >
          <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-2)", fontWeight: 800 }}>#{idx + 1}</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{row.name}</div>
          <RatioBar value={row.oneVsOneRatio} color="#22c55e" />
          <RatioBar value={row.finalWinRatio} color="#3b82f6" />
        </div>
      ))}
    </div>
  );
}

function RatioBar({ value, color }: { value: number; color: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div style={{ height: 8, borderRadius: 999, background: "rgba(148,163,184,0.22)", overflow: "hidden" }}>
        <div style={{ width: `${clamped}%`, height: "100%", background: color }} />
      </div>
      <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-2)" }}>{clamped.toFixed(1)}%</div>
    </div>
  );
}

function ReportLink({ gameId, slug, gameType, label }: { gameId: string; slug: string; gameType: "brackets" | "balance"; label: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("inappropriate content");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const submitReport = async () => {
    setStatus("Sending...");
    const response = await fetch("/api/ugc/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, slug, gameType, reason, details }),
    });
    if (!response.ok) {
      setStatus("Failed to submit. Try again.");
      return;
    }
    setStatus("Report submitted.");
  };

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen((v) => !v)} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "9px 12px", background: "var(--bg-card)", color: "var(--text-1)", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
        {label}
      </button>
      {open && (
        <div style={{ marginTop: 8, border: "1px solid var(--border)", borderRadius: 10, background: "var(--bg-card)", padding: 10, width: 260, textAlign: "left", position: "absolute", zIndex: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Report</div>
          <select value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 8px", background: "#111827", color: "#e5e7eb" }}>
            <option value="inappropriate content">Inappropriate content</option>
            <option value="copyright issue">Copyright issue</option>
            <option value="spam or misleading">Spam or misleading</option>
            <option value="other">Other</option>
          </select>
          <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} placeholder="Optional details" style={{ marginTop: 6, width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 8px", background: "#111827", color: "#e5e7eb" }} />
          <button onClick={submitReport} style={{ marginTop: 8, border: "none", borderRadius: 8, padding: "8px 10px", background: MUSTARD, color: "#231600", fontWeight: 800, cursor: "pointer" }}>
            Submit report
          </button>
          {status && <div style={{ marginTop: 6, fontSize: 11, color: "var(--text-2)" }}>{status}</div>}
        </div>
      )}
    </div>
  );
}
