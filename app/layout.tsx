import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import "./globals.css";
import Link from "next/link";
import Script from "next/script";
import { dict } from "@/lib/i18n";
import HomeHeaderControls from "@/components/HomeHeaderControls";
import UserMenu from "@/components/UserMenu";

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
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Suspense fallback={null}>
                <HomeHeaderControls />
              </Suspense>
              <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
                <a
                  href="https://discord.gg/D3x4VbtNn5"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Join ZAZAZA Discord"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    border: "1px solid var(--border)",
                    background: "var(--bg-card)",
                    color: "var(--text-1)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textDecoration: "none",
                    flexShrink: 0,
                  }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M20.317 4.369A19.791 19.791 0 0 0 15.379 3c-.213.387-.463.907-.634 1.314a18.27 18.27 0 0 0-5.49 0A13.607 13.607 0 0 0 8.62 3a19.736 19.736 0 0 0-4.94 1.37C.553 9.09-.286 13.694.134 18.233a19.922 19.922 0 0 0 6.067 3.066c.49-.665.927-1.37 1.301-2.115a12.965 12.965 0 0 1-2.045-.979c.172-.123.34-.251.503-.384 3.94 1.85 8.214 1.85 12.108 0 .164.133.332.261.503.384-.654.386-1.338.714-2.045.979.374.746.81 1.45 1.301 2.115a19.89 19.89 0 0 0 6.067-3.066c.493-5.263-.842-9.827-3.577-13.864ZM8.02 15.43c-1.181 0-2.154-1.085-2.154-2.419 0-1.333.95-2.418 2.154-2.418 1.214 0 2.173 1.095 2.154 2.418 0 1.334-.95 2.419-2.154 2.419Zm7.96 0c-1.182 0-2.154-1.085-2.154-2.419 0-1.333.95-2.418 2.154-2.418 1.214 0 2.173 1.095 2.154 2.418 0 1.334-.95 2.419-2.154 2.419Z"
                      fill="currentColor"
                    />
                  </svg>
                </a>
                <UserMenu />
              </div>
            </div>
          </div>
        </nav>

        <main style={{ minHeight: "calc(100dvh - 106px)" }}>{children}</main>

        {/* FOOTER */}
        <footer style={{ borderTop: "1px solid var(--border)", padding: "16px 24px 80px" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "center", gap: 10, flexWrap: "nowrap", alignItems: "center", whiteSpace: "nowrap", overflowX: "auto", scrollbarWidth: "none" }}>
            <span style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>ZAZAZA</span>
            <span style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)", marginLeft: -4 }}>© {new Date().getFullYear()}</span>
            <Link href="/about" style={{ fontSize: 12, color: "var(--text-3)", textDecoration: "none" }}>About</Link>
            <Link href="/privacy-policy" style={{ fontSize: 12, color: "var(--text-3)", textDecoration: "none" }}>Privacy</Link>
            <Link href="/terms-of-service" style={{ fontSize: 12, color: "var(--text-3)", textDecoration: "none" }}>Terms</Link>
            <Link href="/guidelines" style={{ fontSize: 12, color: "var(--text-3)", textDecoration: "none" }}>Guidelines</Link>
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
