import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ALL_GAMES } from "@/lib/games";
import type { GameData } from "@/lib/types";
import GameLayout from "@/components/GameLayout";
import Sudoku from "@/components/games/Sudoku";

const game = ALL_GAMES.find((g) => g.id === "sudoku" && g.category === "brain-age");

export const metadata: Metadata = game
  ? {
      title: game.seo.metaTitle,
      description: game.seo.metaDescription,
      keywords: game.seo.keywords,
      openGraph: {
        title: game.seo.metaTitle,
        description: game.seo.metaDescription,
        type: "website",
        url: "https://zazaza.app/brain-age/sudoku",
      },
    }
  : {};

export default function SudokuPage() {
  if (!game) notFound();
  const g = game as GameData;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: g.title,
    description: g.description,
    applicationCategory: "Game",
    operatingSystem: "Web",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    keywords: g.tags.join(", "),
    url: "https://zazaza.app/brain-age/sudoku",
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <GameLayout game={g}>
        <Sudoku game={g} />
      </GameLayout>
    </>
  );
}
