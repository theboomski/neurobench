import type { Metadata } from "next";
import Link from "next/link";
import postsData from "@/content/blog/posts.json";

export const metadata: Metadata = {
  title: "Blog – Brain Age, Personality & Cognitive Science | ZAZAZA",
  description: "Science-backed articles on brain age, cognitive performance, personality psychology, relationship science, and financial decision-making. Free, no signup.",
  openGraph: {
    title: "ZAZAZA Blog – The Science Behind the Tests",
    description: "Deep dives into cognitive science, personality psychology, and behavioral economics.",
    url: "https://zazaza.app/blog",
  },
};

const BLOG_CATEGORIES = [
  {
    key: "brain",
    label: "Brain & Cognition",
    emoji: "🧠",
    accent: "#00FF94",
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
      <section style={{ padding: "48px 0 40px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", background: "#00FF9410", border: "1px solid #00FF9425", borderRadius: 999, padding: "4px 14px", marginBottom: 16 }}>
          <span style={{ fontSize: 10, color: "#00FF94", fontFamily: "var(--font-mono)", letterSpacing: "0.08em" }}>THE SCIENCE BLOG</span>
        </div>
        <h1 style={{ fontSize: "clamp(28px,5vw,48px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.1, marginBottom: 14 }}>
          The Science Behind<br />
          <span style={{ background: "linear-gradient(135deg, #00FF94 0%, #00B4DB 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Every Test
          </span>
        </h1>
        <p style={{ fontSize: "clamp(13px,1.8vw,16px)", color: "var(--text-2)", maxWidth: 480, margin: "0 auto", lineHeight: 1.65 }}>
          Deep dives into cognitive science, personality psychology, and behavioral economics. Evidence-based. No fluff.
        </p>
      </section>

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
  );
}
