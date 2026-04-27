"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase";

type BalanceGame = { id: string; title: string; slug: string; description?: string | null };
type BalanceOption = { id: string; option_a: string; option_b: string; round: number; order: number };
type BalanceSummary = { aFinalWins: number; bFinalWins: number; totalPlays: number; aRoundWins: number; bRoundWins: number };
const MUSTARD = "#b8860b";

export default function UgcBalanceClient({ game, options, summary }: { game: BalanceGame; options: BalanceOption[]; summary: BalanceSummary }) {
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<{ id: string; pick: "a" | "b" }[]>([]);
  const [winner, setWinner] = useState<"a" | "b" | null>(null);
  const [hovered, setHovered] = useState<"a" | "b" | null>(null);
  const [winFlash, setWinFlash] = useState<"a" | "b" | null>(null);
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  const current = options[index];
  const optionALabel = options[0]?.option_a?.trim() || "Option A";
  const optionBLabel = options[0]?.option_b?.trim() || "Option B";

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
    const shareText = `${game.title}\nMy winner: ${winner === "a" ? "Option A bias" : "Option B bias"} (${aCount}:${bCount}).\nCan you beat me?`;
    const totalAfterPlay = summary.totalPlays + 1;
    const totalRoundAfterPlay = summary.aRoundWins + summary.bRoundWins + aCount + bCount;
    const aRoundAfter = summary.aRoundWins + aCount;
    const bRoundAfter = summary.bRoundWins + bCount;
    const aFinalWinsAfter = summary.aFinalWins + (winner === "a" ? 1 : 0);
    const bFinalWinsAfter = summary.bFinalWins + (winner === "b" ? 1 : 0);
    const aRoundRatioAfter = totalRoundAfterPlay > 0 ? Math.round((aRoundAfter / totalRoundAfterPlay) * 1000) / 10 : 0;
    const bRoundRatioAfter = totalRoundAfterPlay > 0 ? Math.round((bRoundAfter / totalRoundAfterPlay) * 1000) / 10 : 0;
    const aFinalRatioAfter = totalAfterPlay > 0 ? Math.round((aFinalWinsAfter / totalAfterPlay) * 1000) / 10 : 0;
    const bFinalRatioAfter = totalAfterPlay > 0 ? Math.round((bFinalWinsAfter / totalAfterPlay) * 1000) / 10 : 0;
    const rows = [
      { id: "a", name: optionALabel, roundRatio: aRoundRatioAfter, finalRatio: aFinalRatioAfter },
      { id: "b", name: optionBLabel, roundRatio: bRoundRatioAfter, finalRatio: bFinalRatioAfter },
    ].sort((x, y) => (y.finalRatio !== x.finalRatio ? y.finalRatio - x.finalRatio : y.roundRatio - x.roundRatio));
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "22px 16px 56px", textAlign: "center" }}>
        <h1 style={{ fontSize: 36, fontWeight: 900 }}>{game.title}</h1>
        {game.description && <p style={{ marginTop: 6, color: "var(--text-1)", fontSize: 14, fontWeight: 600 }}>{game.description}</p>}
        <p style={{ marginTop: 6, color: "var(--text-2)", fontSize: 13 }}>Run complete. Updated-style results view.</p>
        <ResultsTable rows={rows} />
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14 }}>
          <button
            onClick={async () => {
              if (typeof navigator !== "undefined" && navigator.share) {
                await navigator.share({ title: game.title, text: shareText });
              } else if (typeof navigator !== "undefined" && navigator.clipboard) {
                await navigator.clipboard.writeText(shareText);
              }
            }}
            style={{ borderRadius: 10, border: "1px solid var(--border)", padding: "10px 12px", cursor: "pointer" }}
          >
            Share
          </button>
          <button onClick={() => window.location.reload()} style={{ border: "none", borderRadius: 10, padding: "10px 12px", background: MUSTARD, color: "#231600", fontWeight: 900, cursor: "pointer" }}>
            Play Again
          </button>
        </div>
      </div>
    );
  }

  if (!started) {
    const totalRound = summary.aRoundWins + summary.bRoundWins;
    const aRoundRatio = totalRound > 0 ? Math.round((summary.aRoundWins / totalRound) * 1000) / 10 : 0;
    const bRoundRatio = totalRound > 0 ? Math.round((summary.bRoundWins / totalRound) * 1000) / 10 : 0;
    const aFinalRatio = summary.totalPlays > 0 ? Math.round((summary.aFinalWins / summary.totalPlays) * 1000) / 10 : 0;
    const bFinalRatio = summary.totalPlays > 0 ? Math.round((summary.bFinalWins / summary.totalPlays) * 1000) / 10 : 0;
    const rows = [
      { id: "a", name: optionALabel, roundRatio: aRoundRatio, finalRatio: aFinalRatio },
      { id: "b", name: optionBLabel, roundRatio: bRoundRatio, finalRatio: bFinalRatio },
    ].sort((x, y) => (y.finalRatio !== x.finalRatio ? y.finalRatio - x.finalRatio : y.roundRatio - x.roundRatio));
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "22px 16px 56px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 36, fontWeight: 900 }}>{game.title}</h1>
            {game.description && <p style={{ marginTop: 6, color: "var(--text-1)", fontSize: 14, fontWeight: 600 }}>{game.description}</p>}
            <p style={{ marginTop: 6, color: "var(--text-2)", fontSize: 13 }}>Current Standings</p>
          </div>
          <div style={{ display: "grid", justifyItems: "end", gap: 8 }}>
            <button onClick={() => setStarted(true)} style={{ border: "none", borderRadius: 10, padding: "11px 14px", background: MUSTARD, color: "#231600", fontWeight: 900, cursor: "pointer" }}>
              ▶ PLAY
            </button>
            <ReportLink gameId={game.id} slug={game.slug} gameType="balance" label="Report This" />
          </div>
        </div>
        <ResultsTable rows={rows} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "22px 16px 56px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 900 }}>{game.title}</h1>
      <p style={{ marginTop: 4, color: "var(--text-2)", fontSize: 12 }}>
        Round {index + 1} / {options.length}
      </p>
      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center" }}>
        <button
          onClick={() => onPick("a")}
          onMouseEnter={() => setHovered("a")}
          onMouseLeave={() => setHovered(null)}
          style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "20px 14px", background: "var(--bg-card)", textAlign: "center", minHeight: 180, cursor: "pointer", transition: "transform 140ms ease", transform: winFlash === "a" ? "scale(1.04)" : hovered === "a" ? "scale(1.02)" : "scale(1)", position: "relative" }}
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
          style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "20px 14px", background: "var(--bg-card)", textAlign: "center", minHeight: 180, cursor: "pointer", transition: "transform 140ms ease", transform: winFlash === "b" ? "scale(1.04)" : hovered === "b" ? "scale(1.02)" : "scale(1)", position: "relative" }}
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

function ResultsTable({ rows }: { rows: Array<{ id: string; name: string; roundRatio: number; finalRatio: number }> }) {
  return (
    <div style={{ marginTop: 12, border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--bg-card)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "64px minmax(120px,1fr) minmax(120px,1fr) minmax(120px,1fr)", gap: 10, alignItems: "center", padding: "10px 12px", borderBottom: "1px solid var(--border)", fontSize: 12, color: "var(--text-1)", fontFamily: "var(--font-mono)", fontWeight: 900, letterSpacing: "0.02em", background: "rgba(255,255,255,0.03)" }}>
        <div>Rank</div>
        <div>Name</div>
        <div>Round Win Ratio</div>
        <div>Final Win Ratio</div>
      </div>
      {rows.map((row, idx) => (
        <div key={row.id} style={{ display: "grid", gridTemplateColumns: "64px minmax(120px,1fr) minmax(120px,1fr) minmax(120px,1fr)", gap: 10, alignItems: "center", padding: "10px 12px", borderBottom: idx === rows.length - 1 ? "none" : "1px solid var(--border)" }}>
          <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-2)", fontWeight: 800 }}>#{idx + 1}</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{row.name}</div>
          <RatioBar value={row.roundRatio} color="#22c55e" />
          <RatioBar value={row.finalRatio} color="#3b82f6" />
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
    <div style={{ textAlign: "right" }}>
      <button onClick={() => setOpen((v) => !v)} style={{ border: "none", background: "transparent", color: "var(--text-3)", fontSize: 12, textDecoration: "underline", cursor: "pointer", padding: 0 }}>
        {label}
      </button>
      {open && (
        <div style={{ marginTop: 8, border: "1px solid var(--border)", borderRadius: 10, background: "var(--bg-card)", padding: 10, width: 260, marginLeft: "auto", textAlign: "left" }}>
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
