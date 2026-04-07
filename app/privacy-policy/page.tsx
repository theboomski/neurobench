import type { Metadata } from "next";
export const metadata: Metadata = { title: "Privacy Policy | NeuroBench" };
const S = ({ n, title, children }: { n: string; title: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 32 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <span style={{ fontSize: 10, color: "#00FF94", fontFamily: "monospace", letterSpacing: "0.1em" }}>{n} /</span>
      <h2 style={{ fontSize: 17, fontWeight: 700 }}>{title}</h2>
    </div>
    <div style={{ color: "rgba(160,160,160,1)", lineHeight: 1.85, fontSize: 14 }}>{children}</div>
  </div>
);
export default function Page() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
      <div style={{ fontSize: 10, color: "#00FF94", fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Legal Documentation</div>
      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 6, letterSpacing: "-0.03em" }}>Privacy Policy</h1>
      <p style={{ color: "rgba(80,80,80,1)", fontSize: 12, marginBottom: 48, fontFamily: "monospace" }}>Last updated: January 1, 2025</p>
      <S n="01" title="Overview">NeuroBench provides free browser-based cognitive benchmark tests. We are committed to protecting your privacy. This policy explains what data we collect and how we use it.</S>
      <S n="02" title="Data We Collect"><ul style={{ paddingLeft: 20, lineHeight: 2 }}><li><strong>Local Storage:</strong> High scores stored in your browser only — never transmitted to our servers.</li><li><strong>Analytics:</strong> Anonymous, aggregated traffic data via Google Analytics.</li><li><strong>Advertising:</strong> Google AdSense may use cookies to serve relevant ads. See Google&apos;s Privacy Policy for details.</li></ul></S>
      <S n="03" title="Cookies">Used for advertising and analytics only. You may opt out via your browser settings or IAB opt-out tools.</S>
      <S n="04" title="Children">Our service is not directed at children under 13. We do not knowingly collect data from minors.</S>
      <S n="05" title="Your Rights">We store no personal data server-side. Clear browser localStorage at any time to remove all local game data.</S>
      <S n="06" title="Contact">privacy@neurobench.io</S>
    </div>
  );
}
