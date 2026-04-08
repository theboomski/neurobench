import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { dict } from "@/lib/i18n";

const t = dict.en;

export const metadata: Metadata = {
  title: { default: `ZAZAZA – Free Brain Tests. No Signup. Instant Results.`, template: `%s | ZAZAZA` },
  description: t.site.description,
  metadataBase: new URL("https://zazaza.app"),
  openGraph: {
    siteName: "ZAZAZA",
    type: "website",
    url: "https://zazaza.app",
    images: [{ url: "https://zazaza.app/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@zazazaapp",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* NAV */}
        <nav style={{
          position: "sticky", top: 0, zIndex: 100,
          background: "rgba(10,10,15,0.96)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.04em", color: "var(--text-1)" }}>
                ZA<span style={{ color: "#00FF94" }}>ZA</span>ZA
              </div>
              <div style={{ fontSize: 9, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", borderLeft: "1px solid var(--border)", paddingLeft: 10 }}>
                Test Hub
              </div>
            </Link>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, background: "#00FF9410", border: "1px solid #00FF9425", borderRadius: 999, padding: "4px 12px" }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00FF94", display: "inline-block", boxShadow: "0 0 6px #00FF94" }} />
                <span style={{ fontSize: 10, color: "#00FF94", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>FREE · NO SIGNUP</span>
              </div>
            </div>
          </div>
        </nav>

        <main style={{ minHeight: "calc(100dvh - 52px - 52px)" }}>{children}</main>

        <footer style={{ borderTop: "1px solid var(--border)", padding: "16px 24px" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)", fontWeight: 700 }}>ZAZAZA</span>
            <span style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>© {new Date().getFullYear()}</span>
            <Link href="/privacy-policy" style={{ fontSize: 12, color: "var(--text-3)", textDecoration: "none" }}>Privacy</Link>
            <Link href="/terms-of-service" style={{ fontSize: 12, color: "var(--text-3)", textDecoration: "none" }}>Terms</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
