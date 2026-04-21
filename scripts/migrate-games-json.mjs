import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, "..", "content", "games.json");

const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
if (!Array.isArray(raw)) {
  console.log("games.json already wrapped; skip");
  process.exit(0);
}

const games = raw.filter((g) => g.category !== "eye-age");

const categories = [
  { id: "brain-age", name: "Brain Age Test", emoji: "🧠", description: "Memory, reaction time, attention & processing speed. Find your cognitive brain age." },
  { id: "office-iq", name: "Office IQ Test", emoji: "💼", description: "Workplace survival instincts, negotiation timing & professional boundary recognition." },
  { id: "focus-test", name: "Focus & Attention", emoji: "🎯", description: "Attention span, distraction resistance & cognitive flexibility." },
  { id: "dark-personality", name: "Dark Personality", emoji: "🌑", description: "Dark Triad score, empathy index & manipulation detection." },
  { id: "word-iq", name: "Vocab & Word IQ", emoji: "📚", description: "Vocabulary age, word recognition speed & semantic intelligence." },
  { id: "relationship", name: "Relationship IQ", emoji: "💔", description: "Red flags, attachment styles, love languages." },
  { id: "money", name: "Money IQ", emoji: "💰", description: "Mindset, risk tolerance, financial literacy." },
  {
    id: "korean-tv",
    name: "Korean TV Shows",
    emoji: "🎮",
    description: "Inspired by crazy Korean TV shows. Can you survive?",
  },
];

const newGame = {
  id: "red-light-green-light",
  title: "Red Light, Green Light",
  clinicalTitle: "Stop-Go Inhibition Under Surveillance",
  shortDescription: "Freeze before she turns around.",
  description:
    "From Squid Game. She's watching. Move when her back is turned. Freeze the moment she spins. One wrong move and you're eliminated.",
  emoji: "🦑",
  accent: "#E11D48",
  accentDim: "rgba(225,29,72,0.10)",
  category: "korean-tv",
  categoryLabel: "Korean TV Shows",
  tags: ["squid game", "red light green light", "reaction game", "korean tv"],
  seo: {
    metaTitle: "Red Light, Green Light – Squid Game Style Challenge | ZAZAZA",
    metaDescription:
      "Move on green. Freeze on red. Three rounds. Can you reach the doll? Free instant play, no signup.",
    keywords: ["red light green light game", "squid game online", "freeze game"],
  },
  content: {
    howToPlay: [
      "Three rounds. Tap to move toward the doll at the top when her back is turned (green light).",
      "When she faces you (red light), do not tap — any input eliminates you.",
      "Reach the finish line before the round timer runs out.",
      "Later rounds use shorter lights and fake turns to test your nerves.",
      "Your score is out of 1000: survival, speed, and nerve penalties.",
    ],
    science:
      "Classic stop-go inhibition under time pressure resembles go/no-go and antisaccade paradigms: prefrontal circuits must suppress prepotent motor responses when a salient cue forbids action.",
    tips: [
      "Commit to a rhythm only when her back is truly turned.",
      "Fake turns in later rounds are decoys — do not tap during them.",
      "Use peripheral vision to sense when a red flash hits.",
    ],
  },
  stats: {
    percentiles: [
      { ms: 950, percentile: 99 },
      { ms: 820, percentile: 93 },
      { ms: 700, percentile: 82 },
      { ms: 550, percentile: 60 },
      { ms: 400, percentile: 38 },
      { ms: 250, percentile: 15 },
      { ms: 100, percentile: 3 },
    ],
    ranks: [
      { label: "S", maxMs: 900, color: "#FFD700", title: "Final Survivor", subtitle: "The front man would hire you as HR", percentileLabel: "Top 5%" },
      { label: "A", maxMs: 720, color: "#22C55E", title: "Wirewalker", subtitle: "Nerves of steel in neon light", percentileLabel: "Top 20%" },
      { label: "B", maxMs: 520, color: "#3B82F6", title: "Still Breathing", subtitle: "You hesitated but you lived", percentileLabel: "Top 45%" },
      { label: "C", maxMs: 320, color: "#94A3B8", title: "Panicked Pigeon", subtitle: "The doll saw you flinch", percentileLabel: "Top 75%" },
      { label: "D", maxMs: 9999, color: "#EF4444", title: "Eliminated", subtitle: "Statistically expected. Emotionally devastating.", percentileLabel: "Bottom 25%" },
    ],
  },
};

games.push(newGame);

fs.writeFileSync(filePath, JSON.stringify({ categories, games }, null, 2));
console.log("Wrote games.json with", games.length, "games,", categories.length, "categories");
