import type { Metadata } from "next";
import type { SupabaseClient } from "@supabase/supabase-js";

export const UGC_CATEGORY_PAGE_SIZE = 20;

export const UGC_DEFAULT_OG_IMAGE = "https://zazaza.app/og-image.png";
export const UGC_SITE_BASE = "https://zazaza.app";

export type UgcGameSeoRow = {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  type: "brackets" | "balance";
  visibility: "public" | "private" | "closed";
  is_approved: boolean;
  is_nsfw: boolean;
  play_count: number;
  cover_image_url: string | null;
  category: { name: string; slug: string } | null;
};

export function nsfwLabel(title: string, isNsfw: boolean) {
  return isNsfw ? `[NSFW] ${title}` : title;
}

export function bracketsPlayDescription(title: string, playCount: number, itemCount: number): string {
  return `Vote in the ${title} bracket. ${playCount} players have voted — ${itemCount} contenders battle it out. Who wins? Play free on ZAZAZA — no signup needed.`;
}

export function bracketsPlayMetadata(row: UgcGameSeoRow, itemCount: number): Metadata {
  const title = nsfwLabel(row.title, row.is_nsfw);
  const descBase = bracketsPlayDescription(row.title, Number(row.play_count ?? 0), itemCount);
  const description = row.is_nsfw ? `[NSFW] ${descBase}` : descBase;
  const pageTitle = `${title} – Who Wins? | ZAZAZA Brackets`;
  const url = `${UGC_SITE_BASE}/ugc/brackets/${row.slug}`;
  const ogImage = row.cover_image_url || UGC_DEFAULT_OG_IMAGE;
  return {
    title: pageTitle,
    description,
    alternates: { canonical: url },
    robots: row.visibility === "public" && row.is_approved ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      type: "website",
      url,
      title: pageTitle,
      description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      siteName: "ZAZAZA",
    },
    twitter: { card: "summary_large_image", title: pageTitle, description, images: [ogImage] },
  };
}

export function balancePlayMetadata(row: UgcGameSeoRow, optionCount: number): Metadata {
  const title = nsfwLabel(row.title, row.is_nsfw);
  const descBase = `The hardest ${row.title} choices. ${optionCount} dilemmas. What would you pick? Play free on ZAZAZA — no signup needed.`;
  const description = row.is_nsfw ? `[NSFW] ${descBase}` : descBase;
  const pageTitle = `${title} – Would You Rather? | ZAZAZA`;
  const url = `${UGC_SITE_BASE}/ugc/balance/${row.slug}`;
  const ogImage = row.cover_image_url || UGC_DEFAULT_OG_IMAGE;
  return {
    title: pageTitle,
    description,
    alternates: { canonical: url },
    robots: row.visibility === "public" && row.is_approved ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      type: "website",
      url,
      title: pageTitle,
      description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      siteName: "ZAZAZA",
    },
    twitter: { card: "summary_large_image", title: pageTitle, description, images: [ogImage] },
  };
}

export function bracketsTierMetadata(
  row: Pick<UgcGameSeoRow, "title" | "slug" | "is_nsfw" | "visibility" | "is_approved" | "cover_image_url">,
): Metadata {
  const title = nsfwLabel(row.title, row.is_nsfw);
  const descBase = `See the tier ranking for ${row.title}. Tiers are based on current votes and update in real time.`;
  const description = row.is_nsfw ? `[NSFW] ${descBase}` : descBase;
  const pageTitle = `${title} Tier List | ZAZAZA Brackets`;
  const url = `${UGC_SITE_BASE}/ugc/brackets/${row.slug}/tier`;
  const ogImage = row.cover_image_url || UGC_DEFAULT_OG_IMAGE;
  return {
    title: pageTitle,
    description,
    alternates: { canonical: url },
    robots: row.visibility === "public" && row.is_approved ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      type: "website",
      url,
      title: pageTitle,
      description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      siteName: "ZAZAZA",
    },
    twitter: { card: "summary_large_image", title: pageTitle, description, images: [ogImage] },
  };
}

export function balanceResultsMetadata(row: Pick<UgcGameSeoRow, "title" | "slug" | "is_nsfw" | "visibility" | "is_approved">): Metadata {
  const title = nsfwLabel(row.title, row.is_nsfw);
  const descBase = `See how people voted in ${row.title}. Which option won? Full results updated in real time.`;
  const description = row.is_nsfw ? `[NSFW] ${descBase}` : descBase;
  const pageTitle = `${title} Results | ZAZAZA Balance`;
  const url = `${UGC_SITE_BASE}/ugc/balance/${row.slug}/results`;
  return {
    title: pageTitle,
    description,
    alternates: { canonical: url },
    robots: row.visibility === "public" && row.is_approved ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      type: "website",
      url,
      title: pageTitle,
      description,
      images: [{ url: UGC_DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
      siteName: "ZAZAZA",
    },
    twitter: { card: "summary_large_image", title: pageTitle, description, images: [UGC_DEFAULT_OG_IMAGE] },
  };
}

export function ugcBracketsCategoryMetadata(categoryName: string, categorySlug: string, page: number): Metadata {
  const baseTitle = `Best ${categoryName} Brackets – Play & Vote | ZAZAZA`;
  const title = page > 1 ? `${baseTitle} (page ${page})` : baseTitle;
  const description = `Browse the best ${categoryName.toLowerCase()} bracket tournaments on ZAZAZA. Vote for your favorites and see who wins.`;
  const basePath = `/ugc/brackets/category/${categorySlug}`;
  const url = page > 1 ? `${UGC_SITE_BASE}${basePath}?page=${page}` : `${UGC_SITE_BASE}${basePath}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      images: [{ url: UGC_DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
      siteName: "ZAZAZA",
    },
    twitter: { card: "summary_large_image", title, description, images: [UGC_DEFAULT_OG_IMAGE] },
  };
}

export function ugcBalanceCategoryMetadata(categoryName: string, categorySlug: string, page: number): Metadata {
  const baseTitle = `Best ${categoryName} Balance – Play & Vote | ZAZAZA`;
  const title = page > 1 ? `${baseTitle} (page ${page})` : baseTitle;
  const description = `Browse the best ${categoryName.toLowerCase()} balance games on ZAZAZA. Vote for your favorites and see who wins.`;
  const basePath = `/ugc/balance/category/${categorySlug}`;
  const url = page > 1 ? `${UGC_SITE_BASE}${basePath}?page=${page}` : `${UGC_SITE_BASE}${basePath}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      images: [{ url: UGC_DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
      siteName: "ZAZAZA",
    },
    twitter: { card: "summary_large_image", title, description, images: [UGC_DEFAULT_OG_IMAGE] },
  };
}

export async function fetchUgcGameForSeo(
  supabase: SupabaseClient,
  slug: string,
  type: "brackets" | "balance",
): Promise<UgcGameSeoRow | null> {
  const { data, error } = await supabase
    .from("ugc_games")
    .select("id,title,description,slug,type,visibility,is_approved,is_nsfw,play_count,cover_image_url,category:ugc_categories(name,slug)")
    .eq("slug", slug)
    .eq("type", type)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as unknown as {
    id: string;
    title: string;
    description: string | null;
    slug: string;
    type: "brackets" | "balance";
    visibility: "public" | "private" | "closed";
    is_approved: boolean;
    is_nsfw: boolean;
    play_count: number;
    cover_image_url: string | null;
    category: { name: string; slug: string } | null | { name: string; slug: string }[];
  };
  const cat = Array.isArray(row.category) ? row.category[0] ?? null : row.category;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    slug: row.slug,
    type: row.type,
    visibility: row.visibility,
    is_approved: row.is_approved,
    is_nsfw: row.is_nsfw,
    play_count: Number(row.play_count ?? 0),
    cover_image_url: row.cover_image_url,
    category: cat ?? null,
  };
}

/** Schema.org `Game` + `BreadcrumbList` as separate JSON-LD payloads (two script tags). */
export function ugcGameJsonLdParts(args: {
  name: string;
  description: string;
  url: string;
  breadcrumbs: { name: string; url: string }[];
}) {
  const gameJson = {
    "@context": "https://schema.org",
    "@type": "Game",
    name: args.name,
    description: args.description,
    url: args.url,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD", availability: "https://schema.org/InStock" },
  };
  const breadcrumbJson = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: args.breadcrumbs.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.name,
      item: b.url,
    })),
  };
  return { gameJsonLd: JSON.stringify(gameJson), breadcrumbJsonLd: JSON.stringify(breadcrumbJson) };
}

export async function countUgcBracketItems(supabase: SupabaseClient, gameId: string): Promise<number> {
  const { count, error } = await supabase.from("ugc_brackets_items").select("*", { count: "exact", head: true }).eq("game_id", gameId);
  if (error) return 0;
  return count ?? 0;
}

export async function countUgcBalanceOptions(supabase: SupabaseClient, gameId: string): Promise<number> {
  const { count, error } = await supabase.from("ugc_balance_options").select("*", { count: "exact", head: true }).eq("game_id", gameId);
  if (error) return 0;
  return count ?? 0;
}

export async function fetchUgcCategoryHub(
  supabase: SupabaseClient,
  categorySlug: string,
  type: "brackets" | "balance",
  page: number,
): Promise<{ category: { id: number; name: string; slug: string }; games: { id: string; title: string; slug: string; play_count: number }[]; total: number } | null> {
  const { data: cat, error: catErr } = await supabase.from("ugc_categories").select("id,name,slug").eq("slug", categorySlug).eq("is_active", true).maybeSingle();
  if (catErr || !cat) return null;
  const safePage = Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
  const from = (safePage - 1) * UGC_CATEGORY_PAGE_SIZE;
  const to = from + UGC_CATEGORY_PAGE_SIZE - 1;
  const { data: games, count, error } = await supabase
    .from("ugc_games")
    .select("id,title,slug,play_count", { count: "exact" })
    .eq("category_id", cat.id)
    .eq("type", type)
    .eq("visibility", "public")
    .eq("is_approved", true)
    .order("play_count", { ascending: false })
    .range(from, to);
  if (error) return null;
  return { category: cat, games: games ?? [], total: count ?? 0 };
}
