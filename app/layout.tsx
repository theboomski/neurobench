import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { dict } from "@/lib/i18n";

const t = dict.en;

export const metadata: Metadata = {
  title: { default: `${t.site.name} – ${t.site.tagline}`, template: `%s | ${t.site.name}` },
  description: t.site.description,
  metadataBase: new URL("https://neurobench.io"),
  openGraph: { siteName: t.site.name, type: "website" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* NAV */}
        <nav style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "rgba(18,18,18,0.92)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "#1DB954", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
              <span style={{ fontSize: 17, fontWeight: 700, color: "var(--text-1)", letterSpacing: "-0.02em" }}>{t.site.name}</span>
            </Link>
            <div style={{ display: "flex", gap: 4 }}>
              <Link href="/" style={{ fontSize: 14, color: "var(--text-2)", textDecoration: "none", padding: "6px 12px", borderRadius: 8, transition: "color 0.15s" }}>Home</Link>
            </div>
          </div>
        </nav>

        <main style={{ minHeight: "calc(100dvh - 60px - 60px)" }}>{children}</main>

        {/* FOOTER */}
        <footer style={{ borderTop: "1px solid var(--border)", padding: "20px 24px" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "center", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, color: "var(--text-3)" }}>© {new Date().getFullYear()} {t.site.name}. {t.footer.rights}</span>
            <Link href="/privacy-policy" style={{ fontSize: 13, color: "var(--text-3)", textDecoration: "none" }}>Privacy</Link>
            <Link href="/terms-of-service" style={{ fontSize: 13, color: "var(--text-3)", textDecoration: "none" }}>Terms</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
