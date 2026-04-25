import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import Link from "next/link";
import Script from "next/script";
import { dict } from "@/lib/i18n";
import HomeHeaderControls from "@/components/HomeHeaderControls";

const t = dict.en;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: { default: `ZAZAZA – Free Brain Tests. No Signup. Instant Results.`, template: `%s | ZAZAZA` },
  description: "Free cognitive tests, brain age assessments, and IQ challenges. No signup. No payment. Instant results. Globally ranked.",
  verification: { google: "r0k7rf80dAHrGhKKwocnpCajshQfOvssDm2RdWRh2O4" },
  metadataBase: new URL("https://zazaza.app"),
  openGraph: {
    siteName: "ZAZAZA", type: "website", url: "https://zazaza.app",
    images: [{ url: "https://zazaza.app/og-image.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", site: "@zazazaapp" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5822666577768735" crossOrigin="anonymous" />
      </head>
      <body>
        {/* TOP NAV */}
        <nav
          id="zazaza-site-nav"
          style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(10,10,15,0.96)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--border)" }}
        >
          <div style={{ background: "#00FF9410", borderBottom: "1px solid #00FF9418", height: 24, overflow: "hidden", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", height: "100%", animation: "ticker 30s linear infinite", whiteSpace: "nowrap", gap: 48, paddingLeft: "100%" }}>
              {["NO SIGN UP", "FREE BRAIN TESTS", "GAMES", "PERSONALITY TESTS", "INSTANT RESULTS", "GLOBAL LEADERBOARDS", "SHARE YOUR RESULTS"].map(s => (
                <span key={s} style={{ fontSize: 10, color: "#00FF94", fontFamily: "var(--font-mono)", letterSpacing: "0.15em" }}>{s}</span>
              ))}
            </div>
          </div>
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "10px 24px", minHeight: 76, display: "flex", flexDirection: "column", alignItems: "stretch", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
              <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 48, fontWeight: 900, letterSpacing: "-0.045em", color: "var(--text-1)", lineHeight: 1, flexShrink: 0 }}>
                  ZA<span style={{ color: "#00FF94" }}>ZA</span>ZA
                </div>
              </Link>
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <Suspense fallback={null}>
                <HomeHeaderControls />
              </Suspense>
            </div>
          </div>
        </nav>

        <main style={{ minHeight: "calc(100dvh - 106px)" }}>{children}</main>

        {/* FOOTER */}
        <footer style={{ borderTop: "1px solid var(--border)", padding: "16px 24px 80px" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>ZAZAZA</span>
            <span style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>© {new Date().getFullYear()}</span>
            <Link href="/about" style={{ fontSize: 12, color: "var(--text-3)", textDecoration: "none" }}>About</Link>
            <Link href="/privacy-policy" style={{ fontSize: 12, color: "var(--text-3)", textDecoration: "none" }}>Privacy</Link>
            <Link href="/terms-of-service" style={{ fontSize: 12, color: "var(--text-3)", textDecoration: "none" }}>Terms</Link>
          </div>
        </footer>

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
