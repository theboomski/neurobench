"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import type { GameData } from "@/lib/types";

export default function MobileGameWrapper({
  game,
  children,
}: {
  game: GameData;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [fullscreen, setFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const isResultRoute = pathname.endsWith("/result");
  const isSharedResultRoute = pathname.startsWith("/s/");

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
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    } else {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    };
  }, [fullscreen]);

  // Desktop: render normally
  if (!isMobile) return <>{children}</>;

  // Shared/result links should open directly without "Tap to Play" gate.
  if (isSharedResultRoute || isResultRoute) return <>{children}</>;

  // Mobile idle: show tap-to-play button
  if (!fullscreen) {
    return (
      <div
        onClick={() => { window.scrollTo({ top: 0, behavior: "instant" }); setFullscreen(true); }}
        style={{
          background: "var(--bg-card)",
          border: `1.5px solid ${game.accent}40`,
          borderRadius: "var(--radius-xl)",
          padding: "36px 24px",
          textAlign: "center",
          cursor: "pointer",
          WebkitTapHighlightColor: "transparent",
          touchAction: "manipulation",
        }}
      >
        <div style={{ fontSize: 52, marginBottom: 16 }}>{game.emoji}</div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: game.accent,
            color: "#000",
            fontWeight: 800,
            fontSize: 16,
            fontFamily: "var(--font-mono)",
            padding: "15px 36px",
            borderRadius: "var(--radius-md)",
            marginBottom: 14,
            letterSpacing: "0.04em",
          }}
        >
          ▶ TAP TO PLAY
        </div>
        <p style={{ fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>
          OPENS IN FULLSCREEN
        </p>
      </div>
    );
  }

  // Mobile fullscreen — fully covers everything
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "var(--bg)",         // solid background — no bleed-through
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Sticky header */}
      <div
        style={{
          flexShrink: 0,
          background: "rgba(10,10,15,1)",
          borderBottom: "1px solid var(--border)",
          height: 48,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 10,
        }}
      >
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: game.accent, boxShadow: `0 0 8px ${game.accent}`, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 800, fontFamily: "var(--font-mono)", letterSpacing: "0.06em", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-1)" }}>
          {game.title.toUpperCase()}
        </span>
        <button
          onClick={() => { setFullscreen(false); setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 100); }}
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--text-2)",
            fontSize: 13,
            fontWeight: 700,
            padding: "5px 14px",
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
            WebkitTapHighlightColor: "transparent",
            flexShrink: 0,
          }}
        >
          ✕ EXIT
        </button>
      </div>

      {/* Scrollable game content */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          display: "flex",
          flexDirection: "column",
          justifyContent: isResultRoute ? "flex-start" : "center",
          padding: isResultRoute ? "12px 16px max(24px, env(safe-area-inset-bottom))" : "16px 16px 24px",
          minHeight: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}
