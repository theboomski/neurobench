import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { dict } from "@/lib/i18n";
import { Activity } from "lucide-react";

const t = dict.en;

export const metadata: Metadata = {
  title: { default: `${t.site.name} – ${t.site.tagline}`, template: `%s | ${t.site.name}` },
  description: t.site.description,
  metadataBase: new URL("https://neurobench.vercel.app"),
  openGraph: { siteName: t.site.name, type: "website" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* NAV */}
        <nav style={{
          position: "sticky", top: 0, zIndex: 100,
          background: "rgba(18,18,18,0.95)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--border)",
        }}>
          {/* Ticker */}
          <div style={{ background: "#00FF9410", borderBottom: "1px solid #00FF9418", height: 24, overflow: "hidden", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", height: "100%", animation: "ticker 30s linear infinite", whiteSpace: "nowrap", gap: 48, paddingLeft: "100%" }}>
              {["NEURAL LATENCY ASSESSMENT", "OFFICE SURVIVAL PROTOCOL", "SYNAPTIC ACCURACY TEST", "STRESS RELIEF VELOCITY", "COGNITIVE THRESHOLD ANALYSIS"].map(s => (
                <span key={s} style={{ fontSize: 10, color: "#00FF94", fontFamily: "var(--font-mono)", letterSpacing: "0.15em" }}>{s}</span>
              ))}
            </div>
          </div>

          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: "#00FF9420", border: "1px solid #00FF9440", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Activity size={14} color="#00FF94" strokeWidth={2.5} />
              </div>
              <div>
                <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text-1)", letterSpacing: "-0.02em" }}>{t.site.name}</span>
                <span style={{ fontSize: 9, color: "var(--text-3)", display: "block", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", lineHeight: 1, marginTop: 1 }}>Cognitive Lab</span>
              </div>
            </Link>

            {/* Status indicator */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 999, padding: "5px 12px" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00FF94", display: "inline-block", boxShadow: "0 0 6px #00FF94" }} />
              <span style={{ fontSize: 11, color: "var(--text-2)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em" }}>SYSTEMS ONLINE</span>
            </div>
          </div>
        </nav>

        <main style={{ minHeight: "calc(100dvh - 76px - 56px)" }}>{children}</main>

        <footer style={{ borderTop: "1px solid var(--border)", padding: "18px 24px" }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--text-3)", fontFamily: "var(--font-mono)" }}>© {new Date().getFullYear()} {t.site.name}</span>
            <Link href="/privacy-policy" style={{ fontSize: 12, color: "var(--text-3)", textDecoration: "none" }}>Privacy</Link>
            <Link href="/terms-of-service" style={{ fontSize: 12, color: "var(--text-3)", textDecoration: "none" }}>Terms</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
