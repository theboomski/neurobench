"use client";

import { useState, useEffect } from "react";
import type { GameData } from "@/lib/types";

export default function MobileGameWrapper({
  game,
  children,
}: {
  game: GameData;
  children: React.ReactNode;
}) {
  const [fullscreen, setFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Lock body scroll when fullscreen
  useEffect(() => {
    if (fullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [fullscreen]);

  // Desktop: render normally
  if (!isMobile) return <>{children}</>;

  // Mobile: show "tap to play" button that opens fullscreen
  if (!fullscreen) {
    return (
      <div
        onClick={() => setFullscreen(true)}
        style={{
          background: "var(--bg-card)",
          border: `1.5px solid ${game.accent}40`,
          borderRadius: "var(--radius-xl)",
          padding: "32px 24px",
          textAlign: "center",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>{game.emoji}</div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: game.accent,
            color: "#000",
            fontWeight: 800,
            fontSize: 15,
            fontFamily: "var(--font-mono)",
            padding: "14px 32px",
            borderRadius: "var(--radius-md)",
            marginBottom: 12,
          }}
        >
          ▶ TAP TO PLAY
        </div>
        <p style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
          Opens in fullscreen
        </p>
      </div>
    );
  }

  // Mobile fullscreen overlay
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "var(--bg)",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {/* Header bar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(10,10,15,0.97)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid var(--border)",
          height: 48,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: game.accent,
            boxShadow: `0 0 8px ${game.accent}`,
          }}
        />
        <span
          style={{
            fontSize: 12,
            fontWeight: 800,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.06em",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {game.title.toUpperCase()}
        </span>
        <button
          onClick={() => setFullscreen(false)}
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--text-2)",
            fontSize: 13,
            fontWeight: 700,
            padding: "4px 12px",
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          ✕ EXIT
        </button>
      </div>

      {/* Game content */}
      <div style={{ padding: "16px 16px 80px" }}>{children}</div>
    </div>
  );
}
