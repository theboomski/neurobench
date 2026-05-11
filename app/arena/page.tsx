import type { Metadata } from "next";
import ArenaLeaderboardsClient from "./ArenaLeaderboardsClient";
import ArenaRefreshButton from "./ArenaRefreshButton";
import { getCachedArenaLeaderboardData } from "@/lib/arenaLeaderboardData";

export const metadata: Metadata = {
  title: "ZAZAZA Arena – Global Brain Rankings & Weekly Leaderboards",
  description:
    "See how your country ranks against the world. Weekly leaderboards, Hall of Fame, and live global rankings across all ZAZAZA games.",
  openGraph: {
    title: "ZAZAZA Arena – Global Brain Rankings & Weekly Leaderboards",
    description:
      "See how your country ranks against the world. Weekly leaderboards, Hall of Fame, and live global rankings across all ZAZAZA games.",
    url: "https://zazaza.app/arena",
  },
};

export default async function ArenaPage() {
  const { countryRankings, weeklyLeaders, hallOfFame } = await getCachedArenaLeaderboardData();

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 16px 56px" }}>
      <div style={{ marginBottom: 14 }}>
        <div className="ad-slot ad-banner">Advertisement</div>
      </div>

      <section style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 10, color: "var(--accent)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>Arena</div>
            <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.03em" }}>Global Arena</h1>
            <p style={{ marginTop: 6, fontSize: 12, color: "var(--text-2)", lineHeight: 1.6 }}>
              Country Rankings and Weekly Leaders reset every Monday. Hall of Fame updates only when an all-time record is broken.
            </p>
          </div>
          <ArenaRefreshButton />
        </div>
      </section>

      <ArenaLeaderboardsClient countryRankings={countryRankings} weeklyLeaders={weeklyLeaders} hallOfFame={hallOfFame} />

      <div style={{ paddingBottom: 32 }}>
        <div className="ad-slot ad-banner">Advertisement</div>
      </div>
    </div>
  );
}
