import type { Metadata } from "next";
import BracketHubClient from "@/components/ugc/BracketHubClient";

export const metadata: Metadata = {
  title: "Bracket – Community Brackets & Balance Games | ZAZAZA",
  description: "Choose your favorite community bracket and balance games. Create your own game and challenge friends.",
};

export default function BracketHubPage() {
  return <BracketHubClient />;
}
