"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase";
import { shuffleArray } from "@/lib/ugc";
import UgcImageCard from "@/components/ugc/UgcImageCard";

type BracketGame = { id: string; title: string; slug: string; description?: string | null; play_count?: number };
type BracketItem = { id: string; name: string; image_url: string; order: number; win_count?: number; match_count?: number };
type BracketScoreRow = {
  id: string;
  name: string;
  image_url: string;
  matchCount: number;
  winCount: number;
  finalWinsCount: number;
};

type Match = { a: BracketItem; b: BracketItem | null };
type ItemMatchStat = { id: string; matchInc: number; winInc: number };
const MUSTARD = "#b8860b";

export default function UgcBracketsClient({ game, items, scoreboard }: { game: BracketGame; items: BracketItem[]; scoreboard: BracketScoreRow[] }) {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [started, setStarted] = useState(false);
  const [mobileMode, setMobileMode] = useState<"top" | "all">("top");
  const [round, setRound] = useState(() => 1);
  const [queue, setQueue] = useState<Match[]>(() => makeMatches(shuffleArray(items)));
  const [winners, setWinners] = useState<BracketItem[]>([]);
  const [finalWinner, setFinalWinner] = useState<BracketItem | null>(null);
  const [stats, setStats] = useState<Record<string, ItemMatchStat>>({});
  const [winFlashId, setWinFlashId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const autoAdvanceGuardRef = useRef<string | null>(null);

  const current = queue[0];
  const totalRounds = useMemo(() => Math.ceil(Math.log2(items.length)), [items.length]);
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
  const rankedScoreboard = useMemo(() => rankScoreboard(scoreboard, Number(game.play_count ?? 0)), [scoreboard, game.play_count]);
  const mobileRows = useMemo(() => (mobileMode === "top" ? rankedScoreboard.slice(0, 5) : rankedScoreboard), [mobileMode, rankedScoreboard]);

  const shareBracket = async () => {
    const canonicalUrl = `https://zazaza.app/ugc/brackets/${game.slug}`;
    const shareText = game.title;
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ title: game.title, text: shareText, url: canonicalUrl });
      return;
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(`${shareText}\n${canonicalUrl}`);
    }
  };

  useEffect(() => {
    if (!started || !current || current.b || finalWinner) {
      autoAdvanceGuardRef.current = null;
      return;
    }
    if (autoAdvanceGuardRef.current === current.a.id) return;
    autoAdvanceGuardRef.current = current.a.id;
    void pick(current.a);
  }, [started, current, finalWinner]);

  useEffect(() => {
    if (!started) return;
    const urls = new Set<string>();
    if (current) {
      urls.add(current.a.image_url);
      if (current.b) urls.add(current.b.image_url);
    }
    const next = queue[1];
    if (next) {
      urls.add(next.a.image_url);
      if (next.b) urls.add(next.b.image_url);
    }
    for (const src of urls) {
      const img = new window.Image();
      img.decoding = "async";
      img.loading = "eager";
      img.src = src;
    }
  }, [started, current, queue]);

  const pick = async (winner: BracketItem) => {
    if (!current) return;
    setWinFlashId(winner.id);
    await new Promise((resolve) => window.setTimeout(resolve, 320));
    setWinFlashId(null);
    const loser = current.a.id === winner.id ? current.b : current.a;
    const nextStats = { ...stats };
    if (loser) {
      const wPrev = nextStats[winner.id] ?? { id: winner.id, matchInc: 0, winInc: 0 };
      nextStats[winner.id] = { id: winner.id, matchInc: wPrev.matchInc + 1, winInc: wPrev.winInc + 1 };
      const lPrev = nextStats[loser.id] ?? { id: loser.id, matchInc: 0, winInc: 0 };
      nextStats[loser.id] = { id: loser.id, matchInc: lPrev.matchInc + 1, winInc: lPrev.winInc };
    }
    setStats(nextStats);
    const nextWinners = [...winners, winner];
    const nextQueue = queue.slice(1);
    if (nextQueue.length > 0) {
      setWinners(nextWinners);
      setQueue(nextQueue);
      return;
    }
    if (nextWinners.length === 1) {
      setFinalWinner(nextWinners[0]);
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
          winnerItemId: nextWinners[0].id,
          itemMatchStats: Object.values(nextStats),
        }),
      });
      return;
    }
    setRound((r) => r + 1);
    setWinners([]);
    setQueue(makeMatches(shuffleArray(nextWinners)));
  };

  if (finalWinner) {
    const finalRows = rankScoreboardWithRun(scoreboard, stats, finalWinner.id, Number(game.play_count ?? 0));
    const finalMobileRows = mobileMode === "top" ? finalRows.slice(0, 5) : finalRows;
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px 56px", textAlign: "center" }}>
        <h1 style={{ fontSize: 36, fontWeight: 900 }}>{game.title}</h1>
        {game.description && <p style={{ marginTop: 6, color: "var(--text-2)", fontSize: 14 }}>{game.description}</p>}
        <p style={{ color: "var(--text-2)", marginTop: 8, fontSize: 14 }}>Your #1 choice is {finalWinner.name}!</p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14 }}>
          <button
            onClick={shareBracket}
            style={{ borderRadius: 10, border: "1px solid var(--border)", padding: "10px 12px", cursor: "pointer" }}
          >
            Share
          </button>
          <button onClick={() => window.location.reload()} style={{ borderRadius: 10, border: "1px solid var(--border)", padding: "10px 12px", cursor: "pointer" }}>Play Again</button>
          <button onClick={() => router.push(`/ugc/brackets/${game.slug}/tier`)} style={{ borderRadius: 10, border: "none", padding: "10px 12px", background: MUSTARD, color: "#231600", fontWeight: 800, cursor: "pointer" }}>Tier</button>
        </div>
        {isMobile ? (
          <>
            <div style={{ marginTop: 12, display: "inline-flex", border: "1px solid var(--border)", borderRadius: 999, overflow: "hidden" }}>
              <button onClick={() => setMobileMode("top")} style={{ border: "none", background: mobileMode === "top" ? "rgba(184,134,11,0.24)" : "transparent", color: mobileMode === "top" ? MUSTARD : "var(--text-2)", padding: "8px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
                Top 5
              </button>
              <button onClick={() => setMobileMode("all")} style={{ border: "none", background: mobileMode === "all" ? "rgba(184,134,11,0.24)" : "transparent", color: mobileMode === "all" ? MUSTARD : "var(--text-2)", padding: "8px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
                All
              </button>
            </div>
            <MobileResultsList rows={finalMobileRows} />
          </>
        ) : (
          <ResultsTable rows={finalRows} />
        )}
      </div>
    );
  }

  if (!current) return null;
  if (!current.b) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px 56px", textAlign: "center" }}>
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>{game.title}</h1>
        <p style={{ marginTop: 8, color: "var(--text-2)", fontSize: 13 }}>Auto-advancing bye match...</p>
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
            <button onClick={shareBracket} style={{ borderRadius: 10, border: "1px solid var(--border)", padding: "9px 12px", cursor: "pointer" }}>
              Share
            </button>
          </div>
        </div>
        {isMobile ? (
          <>
            <div style={{ marginTop: 12, display: "inline-flex", border: "1px solid var(--border)", borderRadius: 999, overflow: "hidden" }}>
              <button onClick={() => setMobileMode("top")} style={{ border: "none", background: mobileMode === "top" ? "rgba(184,134,11,0.24)" : "transparent", color: mobileMode === "top" ? MUSTARD : "var(--text-2)", padding: "8px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
                Top 5
              </button>
              <button onClick={() => setMobileMode("all")} style={{ border: "none", background: mobileMode === "all" ? "rgba(184,134,11,0.24)" : "transparent", color: mobileMode === "all" ? MUSTARD : "var(--text-2)", padding: "8px 12px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
                All
              </button>
            </div>
            <MobileResultsList rows={mobileRows} />
          </>
        ) : (
          <ResultsTable rows={rankedScoreboard} />
        )}
        <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-start" }}>
          <ReportLink gameId={game.id} slug={game.slug} gameType="brackets" label="Report This" />
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px 56px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 900 }}>{game.title}</h1>
      <p style={{ marginTop: 4, color: "var(--text-2)", fontSize: 12 }}>
        Round of {2 ** Math.max(1, totalRounds - round + 1)} · Match {winners.length + 1}
      </p>
      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center" }}>
        {[current.a, current.b].map((item, idx) => (
          <button
            key={item.id}
            onClick={() => pick(item)}
            style={{
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: 10,
              background: "var(--bg-card)",
              textAlign: "center",
              cursor: "pointer",
              transition: "transform 140ms ease",
              transform: winFlashId === item.id ? "scale(1.04)" : hoveredId === item.id ? "scale(1.02)" : "scale(1)",
            }}
            onMouseEnter={() => setHoveredId(item.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div style={{ position: "relative" }}>
              <UgcImageCard src={item.image_url} alt={item.name} priority={idx === 0} borderRadius={10} />
              {winFlashId === item.id && (
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: MUSTARD, fontWeight: 900, fontSize: 40, textShadow: "0 0 20px rgba(0,0,0,0.7)" }}>
                  WIN
                </div>
              )}
            </div>
            <h2 style={{ marginTop: 8, fontSize: 18, fontWeight: 800, textAlign: "center" }}>{item.name}</h2>
          </button>
        )).flatMap((node, idx) => (idx === 0 ? [node, <div key="vs" style={{ fontSize: 34, fontWeight: 900, color: "var(--text-2)", textAlign: "center" }}>VS</div>] : [node]))}
      </div>
    </div>
  );
}

function MobileResultsList({ rows }: { rows: Array<BracketScoreRow & { oneVsOneRatio: number; finalWinRatio: number }> }) {
  return (
    <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
      {rows.map((row, idx) => (
        <div key={row.id} style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--bg-card)", padding: 10, display: "grid", gridTemplateColumns: "28px 84px 1fr", gap: 10, alignItems: "center" }}>
          <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-2)", fontWeight: 900 }}>#{idx + 1}</div>
          <UgcImageCard src={row.image_url} alt={row.name} size={84} borderRadius={10} style={{ width: 84 }} />
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

function rankScoreboard(rows: BracketScoreRow[], totalPlays: number) {
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

function rankScoreboardWithRun(rows: BracketScoreRow[], runStats: Record<string, ItemMatchStat>, winnerId: string, currentTotalPlays: number) {
  const nextTotalPlays = currentTotalPlays + 1;
  return rankScoreboard(
    rows.map((row) => {
      const stat = runStats[row.id];
      return {
        ...row,
        matchCount: row.matchCount + (stat?.matchInc ?? 0),
        winCount: row.winCount + (stat?.winInc ?? 0),
        finalWinsCount: row.finalWinsCount + (row.id === winnerId ? 1 : 0),
      };
    }),
    nextTotalPlays,
  );
}

function ResultsTable({ rows }: { rows: Array<BracketScoreRow & { oneVsOneRatio: number; finalWinRatio: number }> }) {
  return (
    <div style={{ marginTop: 12, border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--bg-card)" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "54px 134px minmax(120px,1fr) minmax(120px,1fr) minmax(120px,1fr)",
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
        <div>Thumb</div>
        <div>Name</div>
        <div>Round Win Ratio</div>
        <div>Final Win Ratio</div>
      </div>
      {rows.map((row, idx) => (
        <div
          key={row.id}
          style={{
            display: "grid",
            gridTemplateColumns: "54px 134px minmax(120px,1fr) minmax(120px,1fr) minmax(120px,1fr)",
            gap: 10,
            alignItems: "center",
            padding: "10px 12px",
            borderBottom: idx === rows.length - 1 ? "none" : "1px solid var(--border)",
          }}
        >
          <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-2)", fontWeight: 800 }}>#{idx + 1}</div>
          <UgcImageCard src={row.image_url} alt={row.name} size={126} borderRadius={12} style={{ width: 126 }} />
          <div style={{ fontSize: 14, fontWeight: 700 }}>{row.name}</div>
          <RatioBar value={row.oneVsOneRatio} color="#22c55e" />
          <RatioBar value={row.finalWinRatio} color="#3b82f6" />
        </div>
      ))}
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

function makeMatches(list: BracketItem[]): Match[] {
  const result: Match[] = [];
  for (let i = 0; i < list.length; i += 2) {
    result.push({ a: list[i], b: list[i + 1] ?? null });
  }
  return result;
}
