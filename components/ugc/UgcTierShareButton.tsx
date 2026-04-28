"use client";

export default function UgcTierShareButton({ title, slug }: { title: string; slug: string }) {
  const tierUrl = `https://zazaza.app/ugc/brackets/${slug}/tier`;
  const text = `Here are the tiers for ${title}. Do you agree?`;

  return (
    <button
      type="button"
      onClick={async () => {
        if (typeof navigator !== "undefined" && navigator.share) {
          await navigator.share({ title: `${title} Tier`, text, url: tierUrl });
          return;
        }
        if (typeof navigator !== "undefined" && navigator.clipboard) {
          await navigator.clipboard.writeText(`${text}\n${tierUrl}`);
        }
      }}
      style={{ borderRadius: 10, border: "1px solid var(--border)", padding: "10px 12px", cursor: "pointer", background: "var(--bg-card)", color: "var(--text-1)", fontWeight: 700 }}
    >
      Share
    </button>
  );
}
