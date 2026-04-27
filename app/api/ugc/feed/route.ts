import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServer();
  if (!supabase) return NextResponse.json({ games: [] });
  let viewerId: string | null = null;
  const authHeader = req.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const { data } = await supabase.auth.getUser(token);
      viewerId = data.user?.id ?? null;
    }
  }

  const qp = req.nextUrl.searchParams;
  const type = qp.get("type");
  const sort = qp.get("sort") === "popular" ? "popular" : "latest";
  const category = qp.get("category");
  const language = qp.get("language");
  const includeNsfw = qp.get("includeNsfw") === "1";
  const limit = Math.min(Number(qp.get("limit") ?? "60"), 120);
  const offset = Math.max(Number(qp.get("offset") ?? "0"), 0);
  const fetchSize = limit + 1;

  let query = supabase
    .from("ugc_games")
    .select("id,user_id,type,title,description,cover_image_url,category_id,language,visibility,is_nsfw,is_approved,play_count,slug,created_at")
    .eq("visibility", "public")
    .range(offset, offset + fetchSize - 1);
  query = viewerId ? query.or(`is_approved.eq.true,user_id.eq.${viewerId}`) : query.eq("is_approved", true);

  if (type === "brackets" || type === "balance") query = query.eq("type", type);
  if (category && category !== "all") query = query.eq("category_id", Number(category));
  if (language && language !== "all") query = query.eq("language", language);
  if (!includeNsfw) query = query.eq("is_nsfw", false);
  query = sort === "popular" ? query.order("play_count", { ascending: false }) : query.order("created_at", { ascending: false });

  const { data: games, error } = await query;
  if (error || !games?.length) return NextResponse.json({ games: [], hasMore: false, nextOffset: offset });

  const hasMore = games.length > limit;
  const pageGames = hasMore ? games.slice(0, limit) : games;

  const userIds = [...new Set(pageGames.map((g) => g.user_id))];
  const categoryIds = [...new Set(pageGames.map((g) => g.category_id).filter(Boolean))];

  const [{ data: profiles }, { data: categories }] = await Promise.all([
    supabase.from("profiles").select("id,display_name,avatar_url").in("id", userIds),
    categoryIds.length
      ? supabase.from("ugc_categories").select("id,name,slug").in("id", categoryIds as number[])
      : Promise.resolve({ data: [] as { id: number; name: string; slug: string }[] }),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const categoryMap = new Map((categories ?? []).map((c) => [c.id, c]));

  return NextResponse.json({
    games: pageGames.map((g) => ({
      ...g,
      creator: profileMap.get(g.user_id) ?? null,
      category: g.category_id ? categoryMap.get(g.category_id) ?? null : null,
    })),
    hasMore,
    nextOffset: offset + pageGames.length,
  });
}
