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
        border: "1px solid #1B4D3E",
        background: "rgba(27,77,62,0.1)",
        color: "#1B4D3E",
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
