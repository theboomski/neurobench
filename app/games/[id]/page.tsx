import { notFound } from "next/navigation";
import type { Metadata } from "next";
import gamesData from "@/content/games.json";
import type { GameData } from "@/lib/types";
import GameLayout from "@/components/GameLayout";
import ReactionGame from "@/components/games/ReactionGame";
import BossSlapper from "@/components/games/BossSlapper";
import NumberMemory from "@/components/games/NumberMemory";

const games = gamesData as GameData[];
type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return games.map(g => ({ id: g.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const g = games.find(g => g.id === id);
  if (!g) return {};
  return {
    title: g.seo.metaTitle,
    description: g.seo.metaDescription,
    keywords: g.seo.keywords,
    openGraph: { title: g.seo.metaTitle, description: g.seo.metaDescription, type: "website" },
  };
}

function GameComponent({ id, game }: { id: string; game: GameData }) {
  switch (id) {
    case "reaction-time": return <ReactionGame game={game} />;
    case "boss-slapper":  return <BossSlapper game={game} />;
    case "number-memory": return <NumberMemory game={game} />;
    default: return <p style={{ color: "var(--text-2)", padding: 40, textAlign: "center", fontFamily: "var(--font-mono)" }}>Protocol pending.</p>;
  }
}

export default async function GamePage({ params }: Props) {
  const { id } = await params;
  const game = games.find(g => g.id === id);
  if (!game) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: game.title,
    description: game.description,
    applicationCategory: "Game",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    keywords: game.tags.join(", "),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <GameLayout game={game}>
        <GameComponent id={id} game={game} />
      </GameLayout>
    </>
  );
}
