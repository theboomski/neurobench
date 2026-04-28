import { MetadataRoute } from "next";
import postsData from "@/content/blog/posts.json";
import { ALL_GAMES } from "@/lib/games";
import { getSupabaseServer } from "@/lib/supabase";

const base = "https://zazaza.app";
export const revalidate = 300;

type BlogPost = { slug: string };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const games = ALL_GAMES;

  const categoryPages = ["brain-age", "office-iq", "focus-test", "dark-personality", "word-iq", "relationship", "money", "korean-tv"].map((cat) => ({
    url: `${base}/${cat}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  const gamePages = games.map((g) => ({
    url: `${base}/${g.category}/${g.id}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const blogPosts = postsData as BlogPost[];

  const staticEntries: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${base}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/arena`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/bracket`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/ugc`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/ugc/create`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/ugc/cockpit`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/ugc/history`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/ugc/my-games`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/ugc/profile`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/blog`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    ...blogPosts.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: `${base}/privacy-policy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms-of-service`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/guidelines`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    ...categoryPages,
    ...gamePages,
  ];

  const supabase = getSupabaseServer();
  const ugcEntries: MetadataRoute.Sitemap = [];
  if (supabase) {
    const { data: ugcGames, error } = await supabase
      .from("ugc_games")
      .select("slug,type,created_at,category:ugc_categories(slug)")
      .eq("visibility", "public")
      .eq("is_approved", true)
      .order("created_at", { ascending: false });

    if (error) {
      return staticEntries;
    }

    for (const g of ugcGames ?? []) {
      const lastModified = g.created_at ? new Date(g.created_at as string) : new Date();
      if (g.type === "brackets") {
        ugcEntries.push({
          url: `${base}/ugc/brackets/${g.slug}`,
          lastModified,
          changeFrequency: "weekly",
          priority: 0.8,
        });
        ugcEntries.push({
          url: `${base}/ugc/brackets/${g.slug}/results`,
          lastModified,
          changeFrequency: "daily",
          priority: 0.8,
        });
      } else if (g.type === "balance") {
        ugcEntries.push({
          url: `${base}/ugc/balance/${g.slug}`,
          lastModified,
          changeFrequency: "weekly",
          priority: 0.8,
        });
        ugcEntries.push({
          url: `${base}/ugc/balance/${g.slug}/results`,
          lastModified,
          changeFrequency: "daily",
          priority: 0.8,
        });
      }
    }

    const seenCategory = new Set<string>();
    for (const g of ugcGames ?? []) {
      const cat = Array.isArray(g.category) ? g.category[0] : g.category;
      const catSlug = (cat as { slug?: string } | null)?.slug;
      if (!catSlug || !g.type) continue;
      const key = `${g.type}:${catSlug}`;
      if (seenCategory.has(key)) continue;
      seenCategory.add(key);
      if (g.type === "brackets") {
        ugcEntries.push({
          url: `${base}/ugc/brackets/category/${catSlug}`,
          lastModified: new Date(),
          changeFrequency: "weekly",
          priority: 0.9,
        });
      } else {
        ugcEntries.push({
          url: `${base}/ugc/balance/category/${catSlug}`,
          lastModified: new Date(),
          changeFrequency: "weekly",
          priority: 0.9,
        });
      }
    }
  }

  return [...staticEntries, ...ugcEntries];
}
