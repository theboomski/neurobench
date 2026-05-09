"use client";

import Link from "next/link";
import { countryCodeToFlag, countryCodeToRegionName } from "@/lib/countryFlag";
import ArenaCollapsibleList from "./ArenaCollapsibleList";

export type CountryRankRow = {
  countryCode: string;
  points: number;
};

export type WeeklyLeaderRow = {
  gameId: string;
  gameTitle: string;
  gamePath: string;
  nickname: string | null;
  score: number | null;
  countryCode: string | null;
  playCount: number;
  hasWeeklyScore: boolean;
};

export type HallOfFameRow = {
  gameId: string;
  gameTitle: string;
  gamePath: string;
  nickname: string | null;
  score: number | null;
  countryCode: string | null;
  playCount: number;
  hasAllTimeScore: boolean;
  streakDays: number | null;
};

type ArenaLeaderboardsClientProps = {
  countryRankings: CountryRankRow[];
  weeklyLeaders: WeeklyLeaderRow[];
  hallOfFame: HallOfFameRow[];
};

export default function ArenaLeaderboardsClient({ countryRankings, weeklyLeaders, hallOfFame }: ArenaLeaderboardsClientProps) {
  return (
    <>
      <section style={{ marginBottom: 28 }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "3px solid #4A7C59", borderRadius: "var(--radius-lg)", padding: "16px 14px" }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>ZAZAZA Global Weekly Country Rankings</h2>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 78px", gap: 8, fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
              <span>Rank</span>
              <span>Country</span>
              <span style={{ textAlign: "right" }}>Points</span>
            </div>
            {countryRankings.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--text-3)" }}>No leaderboard data yet.</p>
            ) : (
              <ArenaCollapsibleList
                items={countryRankings}
                getKey={(row) => row.countryCode}
                renderRow={(row, index) => (
                  <div style={{ display: "grid", gridTemplateColumns: "44px 1fr 78px", gap: 8, alignItems: "center", padding: "7px 0", borderTop: "1px solid var(--border)" }}>
                    <span style={{ fontSize: 12, color: "var(--text-2)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>#{index + 1}</span>
                    <span style={{ fontSize: 13, color: "var(--text-1)", fontWeight: 700 }}>
                      {countryCodeToFlag(row.countryCode)} {countryCodeToRegionName(row.countryCode)}
                    </span>
                    <span style={{ fontSize: 12, color: "#4A7C59", textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700 }}>{row.points}</span>
                  </div>
                )}
              />
            )}
          </div>
          <p style={{ marginTop: 10, fontSize: 11, color: "var(--text-3)", lineHeight: 1.6 }}>
            Rankings are based on this week&apos;s leaderboard positions across all ZAZAZA games (Monday 00:00 UTC to Sunday 23:59 UTC). Each game&apos;s top 10 players earn points (1st = 10pts ... 10th = 1pt). Country totals are updated each time you load or refresh this page.
          </p>
        </div>
      </section>

      <section style={{ marginBottom: 48 }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: "3px solid #22d3ee", borderRadius: "var(--radius-lg)", padding: "16px 14px", marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10 }}>ZAZAZA Weekly Leaders</h2>
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
            <ArenaCollapsibleList
              items={weeklyLeaders}
              getKey={(row) => row.gameId}
              renderRow={(row) => (
                <div
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
                  <span style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.2 }}>{row.nickname ?? "-"}</span>
                  <span style={{ fontSize: 18 }}>{row.countryCode ? countryCodeToFlag(row.countryCode) : "-"}</span>
                  <details style={{ justifySelf: "end" }}>
                    <summary
                      style={{
                        listStyle: "none",
                        cursor: "pointer",
                        fontSize: 13,
                        color: "#22d3ee",
                        textAlign: "right",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        border: "1px solid rgba(34,211,238,0.35)",
                        borderRadius: 8,
                        padding: "3px 6px",
                        background: "rgba(34,211,238,0.08)",
                      }}
                    >
                      {row.score ?? "-"}
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
                          border: "1px solid #22d3ee",
                          borderRadius: 8,
                          padding: "4px 8px",
                          fontSize: 11,
                          fontFamily: "var(--font-mono)",
                          fontWeight: 700,
                          color: "#22d3ee",
                        }}
                      >
                        Play
                      </Link>
                    </div>
                  </details>
                </div>
              )}
            />
            {!weeklyLeaders.some((row) => row.hasWeeklyScore) && <p style={{ fontSize: 12, color: "var(--text-3)" }}>No scores yet this week</p>}
          </div>
          <p style={{ marginTop: 10, fontSize: 11, color: "var(--text-3)", lineHeight: 1.6 }}>
            Weekly Leaders resets every Monday at 00:00 UTC and tracks this week&apos;s #1 player for each game.
          </p>
        </div>

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
            <ArenaCollapsibleList
              items={hallOfFame}
              getKey={(row) => row.gameId}
              renderRow={(row) => (
                <div
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
                  <span style={{ fontSize: 11, color: "var(--text-2)", lineHeight: 1.3, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <span>{row.nickname ?? "-"}</span>
                    {row.hasAllTimeScore && row.streakDays !== null && (
                      <span
                        style={{
                          fontSize: 10,
                          color: "var(--text-3)",
                          fontFamily: "var(--font-mono)",
                          padding: "2px 8px",
                          borderRadius: 999,
                          border: "1px solid rgba(148,163,184,0.22)",
                          background: "rgba(0,0,0,0.18)",
                          flexShrink: 0,
                        }}
                      >
                        {row.streakDays} days
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: 18 }}>{row.countryCode ? countryCodeToFlag(row.countryCode) : "-"}</span>
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
                      {row.score ?? "-"}
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
              )}
            />
            {!hallOfFame.some((row) => row.hasAllTimeScore) && <p style={{ fontSize: 12, color: "var(--text-3)" }}>No leaderboard data yet.</p>}
          </div>
          <p style={{ marginTop: 10, fontSize: 11, color: "var(--text-3)", lineHeight: 1.6 }}>
            Hall of Fame shows the current all-time #1 score for each game. Rankings update in real time - anyone can claim the top spot.
          </p>
        </div>
      </section>
    </>
  );
}
