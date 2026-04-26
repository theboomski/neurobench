"use client";

import { useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase";

type BalanceGame = { id: string; title: string; slug: string };
type BalanceOption = { id: string; option_a: string; option_b: string; round: number; order: number };

export default function UgcBalanceClient({ game, options }: { game: BalanceGame; options: BalanceOption[] }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<{ id: string; pick: "a" | "b" }[]>([]);
  const [winner, setWinner] = useState<"a" | "b" | null>(null);

  const current = options[index];

  const onPick = async (value: "a" | "b") => {
    const next = [...picked, { id: current.id, pick: value }];
    if (index + 1 >= options.length) {
      const aCount = next.filter((n) => n.pick === "a").length;
      const bCount = next.length - aCount;
      const finalWinner = aCount >= bCount ? "a" : "b";
      setWinner(finalWinner);
      const supabase = getSupabaseBrowser();
      const token = (await supabase?.auth.getSession())?.data.session?.access_token;
      await fetch("/api/ugc/complete-play", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ gameId: game.id, winnerOption: finalWinner }),
      });
      return;
    }
    setPicked(next);
    setIndex(index + 1);
  };

  if (winner) {
    const aCount = picked.filter((n) => n.pick === "a").length;
    const bCount = picked.length - aCount;
    const shareText = `${game.title}\nMy winner: ${winner === "a" ? "Option A bias" : "Option B bias"} (${aCount}:${bCount}).\nCan you beat me?`;
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "22px 16px 56px", textAlign: "center" }}>
        <h1 style={{ fontSize: 28, fontWeight: 900 }}>{game.title}</h1>
        <p style={{ marginTop: 8, color: "var(--text-2)" }}>Final winner: {winner === "a" ? "Option A bias" : "Option B bias"}</p>
        <p style={{ marginTop: 4, color: "var(--text-2)", fontSize: 12 }}>
          Breakdown: A picks {aCount} · B picks {bCount}
        </p>
        <div style={{ marginTop: 12, display: "grid", gap: 6, textAlign: "left" }}>
          {options.map((opt, i) => {
            const vote = picked[i]?.pick;
            return (
              <div key={opt.id} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: "8px 10px", background: "var(--bg-card)" }}>
                <div style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>Round {i + 1}</div>
                <div style={{ fontSize: 12, marginTop: 2 }}>{vote === "a" ? opt.option_a : opt.option_b}</div>
              </div>
            );
          })}
        </div>
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
          <button onClick={() => window.location.reload()} style={{ border: "none", borderRadius: 10, padding: "10px 12px", background: "#00FF94", color: "#05291a", fontWeight: 900 }}>
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "22px 16px 56px" }}>
      <h1 style={{ fontSize: 28, fontWeight: 900 }}>{game.title}</h1>
      <p style={{ marginTop: 4, color: "var(--text-2)", fontSize: 12 }}>
        Round {index + 1} / {options.length}
      </p>
      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        <button onClick={() => onPick("a")} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "16px 14px", background: "var(--bg-card)", textAlign: "left", minHeight: 88 }}>
          {current.option_a}
        </button>
        <button onClick={() => onPick("b")} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "16px 14px", background: "var(--bg-card)", textAlign: "left", minHeight: 88 }}>
          {current.option_b}
        </button>
      </div>
    </div>
  );
}
