"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function ArenaRefreshButton() {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();

  return (
    <button
      type="button"
      className="pressable"
      onClick={() => startRefresh(() => router.refresh())}
      style={{
        border: "1px solid #00FF94",
        background: "rgba(0,255,148,0.12)",
        color: "#00FF94",
        borderRadius: 999,
        padding: "8px 12px",
        fontSize: 11,
        fontFamily: "var(--font-mono)",
        fontWeight: 700,
        cursor: "pointer",
      }}
      disabled={isRefreshing}
    >
      {isRefreshing ? "REFRESHING..." : "REFRESH"}
    </button>
  );
}
