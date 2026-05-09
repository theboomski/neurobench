// blog post page v3
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import postsData from "@/content/blog/posts.json";

type Post = typeof postsData[0];
type Props = { params: Promise<{ slug: string }> };

const MD_IMAGE_RE = /^!\[(.*?)\]\((https?:\/\/[^\s)]+)\)$/;

function renderBodyBlocks(body: string) {
  return body.split("\n\n").map((block, idx) => {
    const line = block.trim();
    const m = line.match(MD_IMAGE_RE);
    if (m) {
      const alt = m[1] || "Blog image";
      const src = m[2];
      return (
        <img
          key={`img-${idx}-${src}`}
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          style={{
            width: "100%",
            height: "auto",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border)",
            margin: "14px 0 18px",
          }}
        />
      );
    }
    return (
      <p key={`p-${idx}`} style={{ fontSize: 15, lineHeight: 1.9, color: "var(--text-2)", marginBottom: 14 }}>
        {line}
      </p>
    );
  });
}

export async function generateStaticParams() {
  return postsData.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = postsData.find(p => p.slug === slug) as Post | undefined;
  if (!post) return {};
  return {
    title: `${post.title} | ZAZAZA Blog`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `https://zazaza.app/blog/${post.slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = postsData.find(p => p.slug === slug) as Post | undefined;
  if (!post) notFound();
  const p = post!;

  const otherPosts = postsData.filter(x => x.slug !== p.slug).slice(0, 3) as Post[];

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px" }}>
      {/* Breadcrumb */}
      <div style={{ padding: "20px 0 0", fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)", display: "flex", alignItems: "center", gap: 6 }}>
        <Link href="/" style={{ color: "var(--text-3)", textDecoration: "none" }}>ZAZAZA</Link>
        <span>›</span>
        <Link href="/blog" style={{ color: "var(--text-3)", textDecoration: "none" }}>BLOG</Link>
        <span>›</span>
        <span style={{ color: p.accent }}>{p.category.toUpperCase()}</span>
      </div>

      {/* Post header */}
      <header style={{ padding: "28px 0 36px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 28 }}>{p.emoji}</span>
          <span style={{ fontSize: 10, color: p.accent, fontFamily: "var(--font-mono)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", background: `${p.accent}12`, border: `1px solid ${p.accent}25`, borderRadius: 999, padding: "3px 10px" }}>{p.category}</span>
        </div>
        <h1 style={{ fontSize: "clamp(22px,4vw,36px)", fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.15, marginBottom: 16 }}>
          {p.title}
        </h1>
        <p style={{ fontSize: 16, color: "var(--text-2)", lineHeight: 1.7, marginBottom: 20 }}>
          {p.excerpt}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 11, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>
          <span>{new Date(p.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
          <span>·</span>
          <span>{p.readTime} min read</span>
        </div>
      </header>

      {/* Article body */}
      <article style={{ paddingBottom: 48 }}>
        <div style={{ borderLeft: `3px solid ${p.accent}`, paddingLeft: 16, marginBottom: 32, fontStyle: "italic" }}>
          {renderBodyBlocks(p.content.intro)}
        </div>

        {p.content.sections.map((section, i) => (
          <section key={i} style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, color: p.accent, fontFamily: "var(--font-mono)", letterSpacing: "0.1em" }}>0{i + 1} /</span>
              {section.heading}
            </h2>
            {renderBodyBlocks(section.body)}
          </section>
        ))}

        <div style={{ background: `${p.accent}10`, border: `1px solid ${p.accent}30`, borderRadius: "var(--radius-lg)", padding: "24px 20px", marginTop: 48, textAlign: "center" }}>
          <p style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 12 }}>Ready to test yourself?</p>
          <Link href={`/${p.categorySlug}/${p.relatedGame}`}>
            <button style={{ background: p.accent, color: "#000", border: "none", borderRadius: "var(--radius-md)", padding: "13px 28px", fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "var(--font-mono)" }}>
              ▶ {p.relatedGameTitle}
            </button>
          </Link>
        </div>
      </article>

      {otherPosts.length > 0 && (
        <section style={{ borderTop: "1px solid var(--border)", paddingTop: 40, paddingBottom: 80 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800 }}>More Articles</h3>
            <Link href="/blog" style={{ fontSize: 11, color: "#D4823A", fontFamily: "var(--font-mono)", textDecoration: "none", fontWeight: 700 }}>SEE ALL →</Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {otherPosts.map(op => (
              <Link key={op.slug} href={`/blog/${op.slug}`} style={{ textDecoration: "none" }}>
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderLeft: `3px solid ${op.accent}`, borderRadius: "var(--radius-md)", padding: "16px 14px" }}>
                  <div style={{ fontSize: 20, marginBottom: 8 }}>{op.emoji}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", lineHeight: 1.4, marginBottom: 6 }}>{op.title}</div>
                  <div style={{ fontSize: 11, color: op.accent, fontFamily: "var(--font-mono)", fontWeight: 700 }}>READ →</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
