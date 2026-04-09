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
import ColorBlindTest from "@/components/games/ColorBlindTest";
import ContrastSensitivity from "@/components/games/ContrastSensitivity";
import HueOrdering from "@/components/games/HueOrdering";
import AttentionSpan from "@/components/games/AttentionSpan";
import DistractionShield from "@/components/games/DistractionShield";
import TaskSwitching from "@/components/games/TaskSwitching";
import DarkTriad from "@/components/games/DarkTriad";
import EmpathyScore from "@/components/games/EmpathyScore";
import ManipulationDetector from "@/components/games/ManipulationDetector";
import VocabularyAge from "@/components/games/VocabularyAge";
import WordSpeed from "@/components/games/WordSpeed";
import WordAssociation from "@/components/games/WordAssociation";
import RedFlagDetector from "@/components/games/RedFlagDetector";
import AttachmentStyle from "@/components/games/AttachmentStyle";
import LoveLanguage from "@/components/games/LoveLanguage";
import MoneyMindset from "@/components/games/MoneyMindset";
import RiskTolerance from "@/components/games/RiskTolerance";
import FinancialIQ from "@/components/games/FinancialIQ";

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
    case "color-blind-test":    return <ColorBlindTest game={game} />;
    case "contrast-sensitivity": return <ContrastSensitivity game={game} />;
    case "hue-ordering":         return <HueOrdering game={game} />;
    case "attention-span":       return <AttentionSpan game={game} />;
    case "distraction-shield":   return <DistractionShield game={game} />;
    case "task-switching":       return <TaskSwitching game={game} />;
    case "dark-triad":             return <DarkTriad game={game} />;
    case "empathy-score":           return <EmpathyScore game={game} />;
    case "manipulation-detector":   return <ManipulationDetector game={game} />;
    case "vocabulary-age":          return <VocabularyAge game={game} />;
    case "word-speed":              return <WordSpeed game={game} />;
    case "word-association":        return <WordAssociation game={game} />;
    case "red-flag-detector":  return <RedFlagDetector game={game} />;
    case "attachment-style":    return <AttachmentStyle game={game} />;
    case "love-language":       return <LoveLanguage game={game} />;
    case "money-mindset":       return <MoneyMindset game={game} />;
    case "risk-tolerance":      return <RiskTolerance game={game} />;
    case "financial-iq":        return <FinancialIQ game={game} />;
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
