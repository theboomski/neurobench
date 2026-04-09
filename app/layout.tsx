import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import Script from "next/script";
import { dict } from "@/lib/i18n";

const t = dict.en;

export const metadata: Metadata = {
  title: { default: `ZAZAZA – Free Brain Tests. No Signup. Instant Results.`, template: `%s | ZAZAZA` },
  description: t.site.description,
  verification: { google: "r0k7rf80dAHrGhKKwocnpCajshQfOvssDm2RdWRh2O4" },
  metadataBase: new URL("https://zazaza.app"),
  openGraph: {
    siteName: "ZAZAZA", type: "website", url: "https://zazaza.app",
    images: [{ url: "https://zazaza.app/og-image.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", site: "@zazazaapp" },
  robots: { index: true, follow: true },
};

const NAV_TABS = [
  { href: "/",               emoji: "🏠", label: "Home" },
  { href: "/brain-age",      emoji: "🧠", label: "Brain" },
  { href: "/office-iq",      emoji: "💼", label: "Office" },
  { href: "/dark-personality",emoji: "🌑", label: "Dark" },
  { href: "/relationship",   emoji: "💔", label: "Relate" },
  { href: "/money",          emoji: "💰", label: "Money" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5822666577768735" crossOrigin="anonymous" />
      </head>
      <body style={{ paddingBottom: 64 }}>
        {/* TOP NAV */}
        <nav style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(10,10,15,0.96)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border)" }}>
          <div style={{ background: "#00FF9410", borderBottom: "1px solid #00FF9418", height: 24, overflow: "hidden", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", height: "100%", animation: "ticker 30s linear infinite", whiteSpace: "nowrap", gap: 48, paddingLeft: "100%" }}>
              {["FREE BRAIN AGE TEST", "NO SIGNUP REQUIRED", "INSTANT RESULTS", "GLOBALLY RANKED", "OFFICE IQ TEST", "FREE FOREVER", "SHARE YOUR SCORE"].map(s => (
                <span key={s} style={{ fontSize: 10, color: "#00FF94", fontFamily: "var(--font-mono)", letterSpacing: "0.15em" }}>{s}</span>
              ))}
            </div>
          </div>
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.04em", color: "var(--text-1)" }}>
                ZA<span style={{ color: "#00FF94" }}>ZA</span>ZA
              </div>
              <div style={{ fontSize: 9, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", borderLeft: "1px solid var(--border)", paddingLeft: 10 }}>
                Test Hub
              </div>
            </Link>
            <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#00FF9410", border: "1px solid #00FF9425", borderRadius: 999, padding: "4px 12px" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00FF94", display: "inline-block", boxShadow: "0 0 6px #00FF94" }} />
              <span style={{ fontSize: 10, color: "#00FF94", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>FREE · NO SIGNUP</span>
            </div>
          </div>
        </nav>

        <main style={{ minHeight: "calc(100dvh - 76px - 64px)" }}>{children}</main>

        {/* FOOTER — desktop only */}
        <footer style={{ borderTop: "1px solid var(--border)", padding: "16px 24px", display: "none" }} className="desktop-footer">
          <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>ZAZAZA</span>
            <span style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>© {new Date().getFullYear()}</span>
            <Link href="/about" style={{ fontSize: 12, color: "var(--text-3)", textDecoration: "none" }}>About</Link>
            <Link href="/privacy-policy" style={{ fontSize: 12, color: "var(--text-3)", textDecoration: "none" }}>Privacy</Link>
            <Link href="/terms-of-service" style={{ fontSize: 12, color: "var(--text-3)", textDecoration: "none" }}>Terms</Link>
          </div>
        </footer>

        {/* BOTTOM STICKY NAV — mobile */}
        <nav style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200,
          background: "rgba(10,10,15,0.97)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid var(--border)",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          padding: "0 4px",
        }}>
          {NAV_TABS.map(tab => (
            <Link key={tab.href} href={tab.href} style={{ textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 2, padding: "6px 2px", borderRadius: 8, WebkitTapHighlightColor: "transparent" }}>
              <span style={{ fontSize: 20, lineHeight: 1 }}>{tab.emoji}</span>
              <span style={{ fontSize: 9, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em", textTransform: "uppercase" }}>{tab.label}</span>
            </Link>
          ))}
        </nav>

        <Script src="https://www.googletagmanager.com/gtag/js?id=G-CLBWMF1Y42" strategy="afterInteractive" />
        <Script id="ga4-init" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-CLBWMF1Y42');
        `}</Script>
      </body>
    </html>
  );
}
