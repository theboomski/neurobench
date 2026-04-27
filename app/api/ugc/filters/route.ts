import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";

export async function GET() {
  const supabase = getSupabaseServer();
  if (!supabase) return NextResponse.json({ categories: [], languages: [] });

  const [{ data: categories }, { data: games }] = await Promise.all([
    supabase.from("ugc_categories").select("id,name,slug,order").eq("is_active", true).order("order", { ascending: true }),
    supabase
      .from("ugc_games")
      .select("language")
      .eq("visibility", "public")
      .eq("is_approved", true)
      .limit(5000),
  ]);

  const languageCount = new Map<string, number>();
  for (const row of games ?? []) {
    const lang = String(row.language || "").trim().toLowerCase();
    if (!lang) continue;
    languageCount.set(lang, (languageCount.get(lang) ?? 0) + 1);
  }
  const languages = [...languageCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([code, count]) => ({ code, count }));

  return NextResponse.json({ categories: categories ?? [], languages });
}
