export interface GameRank {
  label: string;
  maxMs: number;
  color: string;
  title: string;
}

export interface GameData {
  id: string;
  title: string;
  shortDescription: string;
  description: string;
  emoji: string;
  iconName: string;
  accent: string;
  accentDim: string;
  category: string;
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
