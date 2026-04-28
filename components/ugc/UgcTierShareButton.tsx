"use client";
import type { CSSProperties } from "react";

export default function UgcTierShareButton({ title, slug, playCount, style }: { title: string; slug: string; playCount: number; style?: CSSProperties }) {
  const tierUrl = `https://zazaza.app/ugc/brackets/${slug}/tier`;
  const text = `"${title}" tier list — ${playCount} votes in\nDo you agree? → ${tierUrl}`;

  return (
    <button
      type="button"
      onClick={async () => {
        if (typeof navigator !== "undefined" && navigator.share) {
          await navigator.share({ title: `${title} Tier`, text, url: tierUrl });
          return;
        }
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(text);
        }
      }}
      style={{ borderRadius: 10, border: "1px solid var(--border)", padding: "10px 12px", cursor: "pointer", background: "var(--bg-card)", color: "var(--text-1)", fontWeight: 700, ...style }}
    >
      Share
    </button>
  );
}
