import type { Metadata } from "next";
export const metadata: Metadata = { title: "Privacy Policy | NeuroBench" };
function S({ title, children }: { title: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 32 }}><h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{title}</h2><div style={{ color: "var(--text-2)", lineHeight: 1.85, fontSize: 15 }}>{children}</div></div>;
}
export default function Page() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
      <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 6, letterSpacing: "-0.02em" }}>Privacy Policy</h1>
      <p style={{ color: "var(--text-3)", fontSize: 13, marginBottom: 48, fontFamily: "monospace" }}>Last updated: January 1, 2025</p>
      <S title="1. Overview">NeuroBench provides free browser-based cognitive tests. We are committed to protecting your privacy. This policy explains what data we collect and how we use it.</S>
      <S title="2. Data We Collect"><ul style={{ paddingLeft: 20, lineHeight: 2 }}><li><strong>Local Storage:</strong> High scores stored in your browser only — never sent to our servers.</li><li><strong>Analytics:</strong> Anonymous, aggregated traffic data via Google Analytics.</li><li><strong>Advertising:</strong> Google AdSense may use cookies to serve relevant ads.</li></ul></S>
      <S title="3. Cookies">Used for advertising and analytics only. You may opt out via your browser settings or the IAB opt-out tools.</S>
      <S title="4. Children">Our service is not directed at children under 13. We do not knowingly collect data from minors.</S>
      <S title="5. Your Rights">We store no personal data server-side. Clear your browser localStorage to remove all local game data.</S>
      <S title="6. Contact">privacy@neurobench.io</S>
    </div>
  );
}
