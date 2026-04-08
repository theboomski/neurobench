import { notFound } from "next/navigation";
import type { Metadata } from "next";
import gamesData from "@/content/games.json";
import type { GameData } from "@/lib/types";
import GameLayout from "@/components/GameLayout";
import BossSlapper from "@/components/games/BossSlapper";
import NumberMemory from "@/components/games/NumberMemory";
import SequenceMemory from "@/components/games/SequenceMemory";
import VerbalMemory from "@/components/games/VerbalMemory";
import VisualMemory from "@/components/games/VisualMemory";
import ChimpTest from "@/components/games/ChimpTest";
import TypingSpeed from "@/components/games/TypingSpeed";
import ColorConflict from "@/components/games/ColorConflict";
import InstantComparison from "@/components/games/InstantComparison";
import AnglePrecision from "@/components/games/AnglePrecision";
import RapidScan from "@/components/games/RapidScan";
import TemporalPulse from "@/components/games/TemporalPulse";
import DontBlink from "@/components/games/DontBlink";
import CountMaster from "@/components/games/CountMaster";
import ReactionGame from "@/components/games/ReactionGame";
import ReportOrFavor from "@/components/games/ReportOrFavor";
import BossDodge from "@/components/games/BossDodge";
import RaiseOrRaise from "@/components/games/RaiseOrRaise";
import CorporateClimber from "@/components/games/CorporateClimber";

const games = gamesData as GameData[];

type Props = { params: Promise<{ category: string; id: string }> };

export function generateStaticParams() {
  return games.map(g => ({ category: g.category, id: g.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const g = games.find(g => g.id === id);
  if (!g) return {};
  return {
    title: g.seo.metaTitle,
    description: g.seo.metaDescription,
    keywords: g.seo.keywords,
    openGraph: {
      title: g.seo.metaTitle,
      description: g.seo.metaDescription,
      type: "website",
      url: `https://zazaza.app/${g.category}/${g.id}`,
    },
  };
}

function GameComponent({ id, game }: { id: string; game: GameData }) {
  switch (id) {
    case "boss-slapper":      return <BossSlapper game={game} />;
    case "number-memory":     return <NumberMemory game={game} />;
    case "sequence-memory":   return <SequenceMemory game={game} />;
    case "verbal-memory":     return <VerbalMemory game={game} />;
    case "visual-memory":     return <VisualMemory game={game} />;
    case "chimp-test":        return <ChimpTest game={game} />;
    case "typing-speed":      return <TypingSpeed game={game} />;
    case "color-conflict":    return <ColorConflict game={game} />;
    case "instant-comparison":return <InstantComparison game={game} />;
    case "angle-precision":   return <AnglePrecision game={game} />;
    case "rapid-scan":        return <RapidScan game={game} />;
    case "temporal-pulse":    return <TemporalPulse game={game} />;
    case "dont-blink":        return <DontBlink game={game} />;
    case "count-master":      return <CountMaster game={game} />;
    case "reaction-time":     return <ReactionGame game={game} />;
    case "report-or-favor":   return <ReportOrFavor game={game} />;
    case "boss-dodge":        return <BossDodge game={game} />;
    case "raise-or-raise":    return <RaiseOrRaise game={game} />;
    case "corporate-climber": return <CorporateClimber game={game} />;
    default: return <p style={{ color: "var(--text-2)", padding: 40, textAlign: "center", fontFamily: "var(--font-mono)" }}>Coming soon.</p>;
  }
}

export default async function GamePage({ params }: Props) {
  const { category, id } = await params;
  const game = games.find(g => g.id === id && g.category === category);
  if (!game) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: game.title,
    description: game.description,
    applicationCategory: "Game",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    keywords: game.tags.join(", "),
    url: `https://zazaza.app/${game.category}/${game.id}`,
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
