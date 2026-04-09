import { MetadataRoute } from "next";
import gamesData from "@/content/games.json";
import type { GameData } from "@/lib/types";

const games = gamesData as GameData[];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://zazaza.app";

  const categoryPages = [
    "brain-age", "office-iq", "eye-age", "focus-test", "dark-personality", "word-iq", "relationship", "money"
  ].map(cat => ({
    url: `${base}/${cat}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  const gamePages = games.map(g => ({
    url: `${base}/${g.category}/${g.id}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/privacy-policy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms-of-service`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    ...categoryPages,
    ...gamePages,
  ];
}
