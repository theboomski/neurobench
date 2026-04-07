import { notFound } from "next/navigation";
import type { Metadata } from "next";
import gamesData from "@/content/games.json";
import type { GameData } from "@/lib/types";
import GameLayout from "@/components/GameLayout";
import ReactionGame from "@/components/games/ReactionGame";
import BossSlapper from "@/components/games/BossSlapper";
import NumberMemory from "@/components/games/NumberMemory";
import SequenceMemory from "@/components/games/SequenceMemory";
import VerbalMemory from "@/components/games/VerbalMemory";
import VisualMemory from "@/components/games/VisualMemory";
import ChimpTest from "@/components/games/ChimpTest";
import AimTrainer from "@/components/games/AimTrainer";
import TypingSpeed from "@/components/games/TypingSpeed";

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
    case "number-memory":   return <NumberMemory game={game} />;
    case "sequence-memory": return <SequenceMemory game={game} />;
    case "verbal-memory":   return <VerbalMemory game={game} />;
    case "visual-memory":   return <VisualMemory game={game} />;
    case "chimp-test":      return <ChimpTest game={game} />;
    case "aim-trainer":     return <AimTrainer game={game} />;
    case "typing-speed":    return <TypingSpeed game={game} />;
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
