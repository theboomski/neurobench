import Link from "next/link";
import ArenaRefreshButton from "./ArenaRefreshButton";
import { countryCodeToFlag, countryCodeToRegionName } from "@/lib/countryFlag";
import { ALL_GAMES } from "@/lib/games";
import { leaderboardUsesAscendingScore } from "@/lib/leaderboardConfig";
import { fetchGamePlayCountsFromDb } from "@/lib/serverGamePlayCounts";
import { getSupabaseServer } from "@/lib/supabase";

type LeaderboardRow = {
  game_id: string;
  nickname: string;
  score: number;
  country_code: string;
  created_at: string;
};

type CountryRankRow = {
  countryCode: string;
  points: number;
};

type HallOfFameRow = {
  gameId: string;
  gameTitle: string;
  gamePath: string;
  nickname: string;
  score: number;
  countryCode: string;
  playCount: number;
};

const RANK_POINTS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

export const dynamic = "force-dynamic";

function compareRowsByGameRules(a: LeaderboardRow, b: LeaderboardRow): number {
  const asc = leaderboardUsesAscendingScore(a.game_id);
  if (a.score !== b.score) return asc ? a.score - b.score : b.score - a.score;
  return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
}

function buildCountryRankings(rows: LeaderboardRow[]): CountryRankRow[] {
  const grouped = new Map<string, LeaderboardRow[]>();
  for (const row of rows) {
    const key = row.game_id;
    const existing = grouped.get(key);
    if (existing) existing.push(row);
    else grouped.set(key, [row]);
  }

  const countryPoints = new Map<string, number>();
  for (const gameRows of grouped.values()) {
    const top = [...gameRows].sort(compareRowsByGameRules).slice(0, 10);
    top.forEach((entry, idx) => {
      const code = (entry.country_code || "US").toUpperCase();
      countryPoints.set(code, (countryPoints.get(code) ?? 0) + (RANK_POINTS[idx] ?? 0));
    });
  }

  return [...countryPoints.entries()]
    .map(([countryCode, points]) => ({
      countryCode,
      points,
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return a.countryCode.localeCompare(b.countryCode);
    })
    .slice(0, 10);
}

function buildHallOfFame(rows: LeaderboardRow[], playCounts: Record<string, number>): HallOfFameRow[] {
  const leaderboardGames = ALL_GAMES.filter((game) => game.hasLeaderboard);
  const nameById = new Map(leaderboardGames.map((game) => [game.id, game.title]));
  const grouped = new Map<string, LeaderboardRow[]>();

  for (const row of rows) {
    if (!nameById.has(row.game_id)) continue;
    const existing = grouped.get(row.game_id);
    if (existing) existing.push(row);
    else grouped.set(row.game_id, [row]);
  }

  const hallRows: HallOfFameRow[] = [];
  for (const game of leaderboardGames) {
    const entries = grouped.get(game.id) ?? [];
    if (entries.length === 0) continue;
    const best = [...entries].sort(compareRowsByGameRules)[0];
    hallRows.push({
      gameId: game.id,
      gameTitle: game.title,
      gamePath: `/${game.category}/${game.id}`,
      nickname: best.nickname,
      score: best.score,
      countryCode: (best.country_code || "US").toUpperCase(),
      playCount: playCounts[game.id] ?? 0,
    });
  }

  return hallRows.sort((a, b) => {
    if (b.playCount !== a.playCount) return b.playCount - a.playCount;
    return a.gameTitle.localeCompare(b.gameTitle);
  });
}

async function fetchAllLeaderboardRows(): Promise<LeaderboardRow[]> {
  const sb = getSupabaseServer();
  if (!sb) return [];

  const rows: LeaderboardRow[] = [];
  const batch = 1000;
  let from = 0;
  while (true) {
    const to = from + batch - 1;
    const { data, error } = await sb
      .from("leaderboard")
      .select("game_id,nickname,score,country_code,created_at")
      .order("created_at", { ascending: true })
      .range(from, to);
    if (error) break;
    const list = (data ?? []) as LeaderboardRow[];
    rows.push(...list);
    if (list.length < batch) break;
    from += batch;
  }
  return rows;
}

export default async function ArenaPage() {
  const [allRows, playCountsResult] = await Promise.all([fetchAllLeaderboardRows(), fetchGamePlayCountsFromDb()]);
  const playCounts = playCountsResult.ok ? playCountsResult.counts : {};
  const countryRankings = buildCountryRankings(allRows);
  const hallOfFame = buildHallOfFame(allRows, playCounts);

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 16px 56px" }}>
      <div style={{ marginBottom: 14 }}>
        <div className="ad-slot ad-banner">Advertisement</div>
      </div>

      <section style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 10, color: "#00FF94", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Arena</div>
            <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.03em" }}>Global Arena</h1>
          </div>
          <ArenaRefreshButton />
        </div>
      </section>

      <section style={{ marginBottom: 28 }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "3px solid #00FF94", borderRadius: "var(--radius-lg)", padding: "16px 14px" }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>ZAZAZA Global Country Rankings</h2>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 78px", gap: 8, fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
              <span>Rank</span>
              <span>Country</span>
              <span style={{ textAlign: "right" }}>Points</span>
            </div>
            {countryRankings.map((row, index) => (
              <div key={row.countryCode} style={{ display: "grid", gridTemplateColumns: "44px 1fr 78px", gap: 8, alignItems: "center", padding: "7px 0", borderTop: "1px solid var(--border)" }}>
                <span style={{ fontSize: 12, color: "var(--text-2)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>#{index + 1}</span>
                <span style={{ fontSize: 13, color: "var(--text-1)", fontWeight: 700 }}>{countryCodeToFlag(row.countryCode)} {countryCodeToRegionName(row.countryCode)}</span>
                <span style={{ fontSize: 12, color: "#00FF94", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                  {row.points}
                </span>
              </div>
            ))}
            {countryRankings.length === 0 && <p style={{ fontSize: 12, color: "var(--text-3)" }}>No leaderboard data yet.</p>}
          </div>
          <p style={{ marginTop: 10, fontSize: 11, color: "var(--text-3)", lineHeight: 1.6 }}>
            Rankings are based on leaderboard positions across all ZAZAZA games. Each game&apos;s top 10 players earn points (1st = 10pts ... 10th = 1pt). Country totals are updated each time you load or refresh this page.
          </p>
        </div>
      </section>

      <section style={{ marginBottom: 48 }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "3px solid #38bdf8", borderRadius: "var(--radius-lg)", padding: "16px 14px" }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>ZAZAZA Hall of Fame</h2>
          <div style={{ display: "grid", gap: 6 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(96px,1.2fr) minmax(72px,1fr) 44px 72px",
                gap: 6,
                fontSize: 10,
                color: "var(--text-3)",
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
              }}
            >
              <span>Game</span>
              <span>Player</span>
              <span>Country</span>
              <span style={{ textAlign: "right" }}>Score</span>
            </div>
            {hallOfFame.map((row) => (
              <div
                key={row.gameId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(96px,1.2fr) minmax(72px,1fr) 44px 72px",
                  gap: 6,
                  alignItems: "center",
                  padding: "7px 0",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <span style={{ fontSize: 12, color: "var(--text-1)", fontWeight: 700, lineHeight: 1.2 }}>{row.gameTitle}</span>
                <span style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.2 }}>{row.nickname}</span>
                <span style={{ fontSize: 18 }}>{countryCodeToFlag(row.countryCode)}</span>
                <details style={{ justifySelf: "end" }}>
                  <summary
                    style={{
                      listStyle: "none",
                      cursor: "pointer",
                      fontSize: 13,
                      color: "#38bdf8",
                      textAlign: "right",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 800,
                      whiteSpace: "nowrap",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      border: "1px solid rgba(56,189,248,0.35)",
                      borderRadius: 8,
                      padding: "3px 6px",
                      background: "rgba(56,189,248,0.08)",
                    }}
                  >
                    {row.score}
                    <span aria-hidden style={{ fontSize: 10, lineHeight: 1 }}>
                      ▾
                    </span>
                  </summary>
                  <div style={{ marginTop: 6, display: "flex", justifyContent: "flex-end" }}>
                    <Link
                      href={row.gamePath}
                      className="pressable"
                      style={{
                        textDecoration: "none",
                        border: "1px solid #38bdf8",
                        borderRadius: 8,
                        padding: "4px 8px",
                        fontSize: 11,
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        color: "#38bdf8",
                      }}
                    >
                      Play
                    </Link>
                  </div>
                </details>
              </div>
            ))}
            {hallOfFame.length === 0 && <p style={{ fontSize: 12, color: "var(--text-3)" }}>No leaderboard data yet.</p>}
          </div>
          <p style={{ marginTop: 10, fontSize: 11, color: "var(--text-3)", lineHeight: 1.6 }}>
            Hall of Fame shows the current all-time #1 score for each game. Rankings update in real time - anyone can claim the top spot.
          </p>
        </div>
      </section>
    </div>
  );
}
