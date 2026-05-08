import type { Metadata } from "next";
import Link from "next/link";
import postsData from "@/content/blog/posts.json";

export const metadata: Metadata = {
  title: "ZAZAZA Blog – Brain Science, Personality & Cognitive Research",
  description:
    "Explore the science behind brain age, cognitive psychology, dark personality traits, and behavioral finance. Research-backed articles.",
  openGraph: {
    title: "ZAZAZA Blog – Brain Science, Personality & Cognitive Research",
    description:
      "Explore the science behind brain age, cognitive psychology, dark personality traits, and behavioral finance. Research-backed articles.",
    url: "https://zazaza.app/blog",
  },
};

const BLOG_CATEGORIES = [
  {
    key: "brain",
    label: "Brain & Cognition",
    emoji: "🧠",
    accent: "#1B4D3E",
    description: "Reaction time, working memory, brain age, and what actually affects cognitive performance.",
  },
  {
    key: "dark",
    label: "Dark Personality",
    emoji: "🌑",
    accent: "#A855F7",
    description: "The Dark Triad, manipulation, gaslighting, and the psychology of social influence.",
  },
  {
    key: "relationships",
    label: "Relationships",
    emoji: "💔",
    accent: "#EC4899",
    description: "Attachment theory, relationship patterns, and why we keep making the same mistakes.",
  },
  {
    key: "money",
    label: "Money & Decisions",
    emoji: "💰",
    accent: "#F59E0B",
    description: "Behavioral economics, loss aversion, mental accounting, and the psychology of financial decisions.",
  },
];

export default function BlogPage() {
  const posts = postsData as typeof postsData;

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
      <div style={{ padding: "16px 0 0" }}>
        <div className="ad-slot ad-banner">Advertisement</div>
      </div>

      <div style={{ paddingTop: 16 }}>
      {BLOG_CATEGORIES.map(cat => {
        const catPosts = posts.filter((p: typeof posts[0]) => p.blogCategory === cat.key);
        if (catPosts.length === 0) return null;
        return (
          <section key={cat.key} style={{ marginBottom: 64 }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 20, gap: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 22 }}>{cat.emoji}</span>
                  <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.02em", color: cat.accent }}>{cat.label}</h2>
                </div>
                <p style={{ fontSize: 13, color: "var(--text-3)", maxWidth: 480, lineHeight: 1.5 }}>{cat.description}</p>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
              {catPosts.map((post: typeof posts[0]) => (
                <Link key={post.slug} href={`/blog/${post.slug}`} style={{ textDecoration: "none" }}>
                  <article style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderLeft: `3px solid ${cat.accent}`,
                    borderRadius: "var(--radius-lg)",
                    padding: "20px 18px",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}>
                    <h3 style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.4, marginBottom: 10, letterSpacing: "-0.01em", color: "var(--text-1)", flex: 1 }}>
                      {post.title}
                    </h3>
                    <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6, marginBottom: 14 }}>
                      {post.excerpt}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>{post.readTime} min read</span>
                      <span style={{ fontSize: 10, color: cat.accent, fontFamily: "var(--font-mono)", fontWeight: 700 }}>READ →</span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
      </div>

      <div style={{ paddingBottom: 32 }}>
        <div className="ad-slot ad-banner">Advertisement</div>
      </div>
    </div>
  );
}
