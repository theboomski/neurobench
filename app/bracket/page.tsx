import type { Metadata } from "next";
import BracketHubClient from "@/components/ugc/BracketHubClient";

export const metadata: Metadata = {
  title: "Bracket – Community Brackets & Balance Games | ZAZAZA",
  description: "Choose your favorite community bracket and balance games. Create your own game and challenge friends.",
};

export default function BracketHubPage() {
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 16px 56px" }}>
      <div style={{ marginBottom: 14 }}>
        <div className="ad-slot ad-banner">Advertisement</div>
      </div>

      <BracketHubClient />

      <div style={{ paddingTop: 20 }}>
        <div className="ad-slot ad-banner">Advertisement</div>
      </div>
    </div>
  );
}
