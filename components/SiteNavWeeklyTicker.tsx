import type { WeeklyLeaderRow } from "@/lib/arenaLeaderboardData";
import { getCachedArenaLeaderboardData } from "@/lib/arenaLeaderboardData";

const TICKER_CYAN = "#22d3ee";
const TOP_N = 5;

function segmentForRow(row: WeeklyLeaderRow): string {
  const game = row.gameTitle.toUpperCase();
  if (!row.hasWeeklyScore || row.nickname == null || row.score == null) {
    return `${game} · OPEN`;
  }
  return `${game} · ${row.nickname} · ${row.score}`;
}

export default async function SiteNavWeeklyTicker() {
  const { weeklyLeaders } = await getCachedArenaLeaderboardData();
  const top = weeklyLeaders.slice(0, TOP_N);
  const segments = top.map(segmentForRow);
  const items: string[] =
    segments.length > 0 ? ["WEEKLY LEADERS", ...segments] : ["WEEKLY LEADERS · PLAY TO RANK · THIS WEEK"];
  const loop = [...items, ...items];

  return (
    <div
      style={{
        borderBottom: "1px solid var(--border)",
        height: 22,
        overflow: "hidden",
        position: "relative",
        background: "var(--bg-base)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          height: "100%",
          animation: "ticker 40s linear infinite",
          whiteSpace: "nowrap",
          gap: 48,
          paddingLeft: "100%",
        }}
      >
        {loop.map((s, i) => (
          <span
            key={`${s}-${i}`}
            style={{
              fontSize: 8,
              color: TICKER_CYAN,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.12em",
              fontWeight: 700,
            }}
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
