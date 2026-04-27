export interface GameRank {
  label: string;
  maxMs: number;
  color: string;
  title: string;
  subtitle: string;
  percentileLabel: string;
}

export interface GameData {
  id: string;
  /** ISO date (YYYY-MM-DD). Used for Latest sort; add this for new games. */
  releasedAt?: string;
  title: string;
  clinicalTitle: string;
  shortDescription: string;
  description: string;
  emoji: string;
  accent: string;
  accentDim: string;
  category: "brain-age" | "office-iq" | "focus-test" | "dark-personality" | "word-iq" | "relationship" | "money" | "korean-tv";
  /** Global numeric leaderboard (see content/games.json). */
  hasLeaderboard: boolean;
  categoryLabel: string;
  tags: string[];
  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
  };
  content: {
    howToPlay: string[];
    science: string;
    tips: string[];
  };
  stats: {
    percentiles: { ms: number; percentile: number }[];
    ranks: GameRank[];
  };
}
