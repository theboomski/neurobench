"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { appendTriathlonModeQuery, getDailyGames, TRIATHLON_FALLBACK_PLAY_PATH } from "@/lib/triathlonDailyGames";
import { TRIATHLON_STORAGE_KEY, clearTriathlonCompletePageMemory, createInitialTriathlonSession } from "@/lib/triathlonSession";

export default function TriathlonStartPage() {
  const router = useRouter();

  useEffect(() => {
    clearTriathlonCompletePageMemory();
    const picks = getDailyGames();
    const first = picks[0];
    const playPath =
      first != null && typeof first.path === "string" && first.path.length > 0 ? first.path : TRIATHLON_FALLBACK_PLAY_PATH;
    const sessionIds =
      picks.length === 3 && picks.every((p) => typeof p?.id === "string" && p.id.length > 0)
        ? picks.map((p) => p.id)
        : (["color-conflict", "sequence-memory", "instant-comparison"] as const);
    try {
      sessionStorage.setItem(
        TRIATHLON_STORAGE_KEY,
        JSON.stringify(createInitialTriathlonSession([...sessionIds])),
      );
    } catch {
      /* ignore quota / private mode */
    }
    router.replace(appendTriathlonModeQuery(playPath));
  }, [router]);

  return (
    <div
      style={{
        maxWidth: 1280,
        margin: "0 auto",
        padding: "48px 24px",
        textAlign: "center",
        color: "var(--text-2)",
        fontFamily: "var(--font-mono)",
        fontSize: 13,
      }}
    >
      Starting triathlon…
    </div>
  );
}
