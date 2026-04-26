import Link from "next/link";
import { notFound } from "next/navigation";
import UgcBracketsClient from "@/components/ugc/UgcBracketsClient";
import { getSupabaseServer } from "@/lib/supabase";

export default async function UgcBracketsPlayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = getSupabaseServer();
  if (!supabase) notFound();

  const { data: game } = await supabase
    .from("ugc_games")
    .select("id,type,title,description,slug,visibility,is_approved")
    .eq("slug", slug)
    .eq("type", "brackets")
    .single();
  if (!game || (!game.is_approved && game.visibility !== "private")) notFound();

  if (game.visibility === "closed") {
    return (
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 16px 56px" }}>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>{game.title}</h1>
        <p style={{ color: "var(--text-2)", marginTop: 8 }}>This game is closed and not accepting new plays.</p>
        <Link href="/ugc" style={{ display: "inline-block", marginTop: 14, textDecoration: "none", borderRadius: 10, padding: "10px 12px", background: "#00FF94", color: "#06311d", fontWeight: 800 }}>
          Back to UGC Hub
        </Link>
      </div>
    );
  }

  const { data: items } = await supabase.from("ugc_brackets_items").select("id,name,image_url,order").eq("game_id", game.id).order("order", { ascending: true });
  if (!items?.length) notFound();

  return <UgcBracketsClient game={game} items={items} />;
}
