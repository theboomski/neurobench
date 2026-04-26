"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase";
import { shuffleArray } from "@/lib/ugc";

type BracketGame = { id: string; title: string; slug: string };
type BracketItem = { id: string; name: string; image_url: string; order: number };

type Match = { a: BracketItem; b: BracketItem | null };

export default function UgcBracketsClient({ game, items }: { game: BracketGame; items: BracketItem[] }) {
  const router = useRouter();
  const [round, setRound] = useState(() => 1);
  const [queue, setQueue] = useState<Match[]>(() => makeMatches(shuffleArray(items)));
  const [winners, setWinners] = useState<BracketItem[]>([]);
  const [finalWinner, setFinalWinner] = useState<BracketItem | null>(null);
  const [stats, setStats] = useState<Record<string, { id: string; won: boolean }>>({});

  const current = queue[0];
  const totalRounds = useMemo(() => Math.ceil(Math.log2(items.length)), [items.length]);

  const pick = async (winner: BracketItem) => {
    if (!current) return;
    const loser = current.a.id === winner.id ? current.b : current.a;
    const nextStats = {
      ...stats,
      [winner.id]: { id: winner.id, won: true },
      ...(loser ? { [loser.id]: { id: loser.id, won: false } } : {}),
    };
    setStats((prev) => ({
      ...prev,
      [winner.id]: { id: winner.id, won: true },
      ...(loser ? { [loser.id]: { id: loser.id, won: false } } : {}),
    }));
    const nextWinners = [...winners, winner];
    const nextQueue = queue.slice(1);
    if (nextQueue.length > 0) {
      setWinners(nextWinners);
      setQueue(nextQueue);
      return;
    }
    if (nextWinners.length === 1) {
      setFinalWinner(nextWinners[0]);
      const supabase = getSupabaseBrowser();
      const token = (await supabase?.auth.getSession())?.data.session?.access_token;
      await fetch("/api/ugc/complete-play", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          gameId: game.id,
          winnerItemId: nextWinners[0].id,
          itemMatchStats: Object.values(nextStats),
        }),
      });
      return;
    }
    setRound((r) => r + 1);
    setWinners([]);
    setQueue(makeMatches(shuffleArray(nextWinners)));
  };

  if (finalWinner) {
    const shareText = `${game.title}\nWinner: ${finalWinner.name}\nCan you beat me?`;
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px 56px", textAlign: "center" }}>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>{game.title}</h1>
        <p style={{ color: "var(--text-2)", marginTop: 8 }}>Winner</p>
        <img src={finalWinner.image_url} alt={finalWinner.name} style={{ margin: "14px auto 8px", width: "100%", maxWidth: 360, aspectRatio: "1 / 1", objectFit: "cover", borderRadius: 14 }} />
        <h2 style={{ fontSize: 22, fontWeight: 800 }}>{finalWinner.name}</h2>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 14 }}>
          <button
            onClick={async () => {
              if (typeof navigator !== "undefined" && navigator.share) {
                await navigator.share({ title: game.title, text: shareText });
              } else if (typeof navigator !== "undefined" && navigator.clipboard) {
                await navigator.clipboard.writeText(shareText);
              }
            }}
            style={{ borderRadius: 10, border: "1px solid var(--border)", padding: "10px 12px" }}
          >
            Share
          </button>
          <button onClick={() => window.location.reload()} style={{ borderRadius: 10, border: "1px solid var(--border)", padding: "10px 12px" }}>Play Again</button>
          <button onClick={() => router.push(`/ugc/brackets/${game.slug}/results`)} style={{ borderRadius: 10, border: "none", padding: "10px 12px", background: "#00FF94", color: "#05291a", fontWeight: 800 }}>Results</button>
        </div>
      </div>
    );
  }

  if (!current) return null;
  if (!current.b) {
    void pick(current.a);
    return null;
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px 56px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 900 }}>{game.title}</h1>
      <p style={{ marginTop: 4, color: "var(--text-2)", fontSize: 12 }}>
        Round of {2 ** Math.max(1, totalRounds - round + 1)} · Match {winners.length + 1}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3" style={{ marginTop: 14 }}>
        {[current.a, current.b].map((item) => (
          <button key={item.id} onClick={() => pick(item)} style={{ border: "1px solid var(--border)", borderRadius: 14, padding: 10, background: "var(--bg-card)", textAlign: "left" }}>
            <img src={item.image_url} alt={item.name} style={{ width: "100%", aspectRatio: "1 / 1", borderRadius: 10, objectFit: "cover" }} />
            <h2 style={{ marginTop: 8, fontSize: 18, fontWeight: 800 }}>{item.name}</h2>
          </button>
        ))}
      </div>
    </div>
  );
}

function makeMatches(list: BracketItem[]): Match[] {
  const result: Match[] = [];
  for (let i = 0; i < list.length; i += 2) {
    result.push({ a: list[i], b: list[i + 1] ?? null });
  }
  return result;
}
