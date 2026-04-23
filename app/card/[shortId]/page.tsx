import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase";

type Props = {
  params: Promise<{ shortId: string }>;
  searchParams: Promise<{ from?: string }>;
};

async function getSharedCard(shortId: string): Promise<{ id: string; image_url: string } | null> {
  const sb = getSupabaseServer();
  if (!sb) return null;

  const { data, error } = await sb.from("shared_cards").select("id,image_url").eq("id", shortId).maybeSingle();
  if (error || !data?.image_url) return null;
  return { id: data.id as string, image_url: data.image_url as string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shortId } = await params;
  const card = await getSharedCard(shortId);
  if (!card) {
    return {
      title: "Card not found | ZAZAZA",
      description: "This shared card does not exist.",
    };
  }

  const pageUrl = `https://zazaza.app/card/${shortId}`;
  return {
    title: "Fun Send Card | ZAZAZA",
    description: "I made this for you 😂",
    alternates: { canonical: pageUrl },
    openGraph: {
      title: "Fun Send Card | ZAZAZA",
      description: "I made this for you 😂",
      url: pageUrl,
      images: [{ url: card.image_url, width: 1080, height: 1080 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Fun Send Card | ZAZAZA",
      description: "I made this for you 😂",
      images: [card.image_url],
    },
  };
}

export default async function SharedCardPage({ params, searchParams }: Props) {
  const { shortId } = await params;
  const { from } = await searchParams;
  const isSenderView = from === "send";
  const card = await getSharedCard(shortId);
  if (!card) notFound();

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
      <div style={{ padding: "16px 0 0" }}>
        <div className="ad-slot ad-banner">Advertisement</div>
      </div>
      <section style={{ padding: "32px 0 56px", display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>
        <div style={{ display: "inline-flex", background: "rgba(244,114,182,0.14)", border: "1px solid rgba(244,114,182,0.22)", borderRadius: 999, padding: "4px 14px" }}>
          <span style={{ fontSize: 10, color: "#f472b6", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>FUN SENDS</span>
        </div>
        <img
          src={card.image_url}
          alt="Shared fun send card"
          style={{
            width: "min(92vw, 720px)",
            aspectRatio: "1 / 1",
            objectFit: "cover",
            borderRadius: 18,
            border: "1px solid var(--border-md)",
            background: "#141414",
          }}
        />
        {isSenderView ? (
          <Link
            href="/send"
            className="pressable"
            style={{
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 999,
              border: "1px solid #f472b6",
              color: "#1a0510",
              background: "#f472b6",
              fontWeight: 900,
              padding: "12px 20px",
              fontSize: 14,
              fontFamily: "var(--font-mono)",
            }}
          >
            Go Back
          </Link>
        ) : (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <a
              href={card.image_url}
              download={`zazaza-fun-send-${shortId}.png`}
              className="pressable"
              style={{
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                border: "1px solid #f472b6",
                color: "#1a0510",
                background: "#f472b6",
                fontWeight: 900,
                padding: "12px 20px",
                fontSize: 14,
                fontFamily: "var(--font-mono)",
              }}
            >
              Download
            </a>
            <Link
              href="/send"
              className="pressable"
              style={{
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                border: "1px solid var(--border-md)",
                color: "var(--text-1)",
                background: "var(--bg-elevated)",
                fontWeight: 900,
                padding: "12px 20px",
                fontSize: 14,
                fontFamily: "var(--font-mono)",
              }}
            >
              Make one for a friend
            </Link>
          </div>
        )}
      </section>
      <div style={{ paddingBottom: 32 }}>
        <div className="ad-slot ad-banner">Advertisement</div>
      </div>
    </div>
  );
}
