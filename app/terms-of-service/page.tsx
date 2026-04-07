import type { Metadata } from "next";
export const metadata: Metadata = { title: "Terms of Service | NeuroBench" };
function S({ title, children }: { title: string; children: React.ReactNode }) {
  return <div style={{ marginBottom: 32 }}><h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{title}</h2><div style={{ color: "var(--text-2)", lineHeight: 1.85, fontSize: 15 }}>{children}</div></div>;
}
export default function Page() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
      <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 6, letterSpacing: "-0.02em" }}>Terms of Service</h1>
      <p style={{ color: "var(--text-3)", fontSize: 13, marginBottom: 48, fontFamily: "monospace" }}>Last updated: January 1, 2025</p>
      <S title="1. Acceptance">By using NeuroBench you agree to these terms. If you do not agree, please discontinue use.</S>
      <S title="2. Service">NeuroBench provides free cognitive benchmark tests for entertainment and educational purposes only. Results are not medical or psychological assessments.</S>
      <S title="3. Permitted Use"><ul style={{ paddingLeft: 20, lineHeight: 2 }}><li>Personal, non-commercial use only.</li><li>Do not use automated tools to manipulate results.</li><li>Do not attempt to reverse-engineer or scrape the service.</li></ul></S>
      <S title="4. Disclaimer">The service is provided &quot;as is.&quot; We do not guarantee accuracy, uptime, or fitness for a particular purpose.</S>
      <S title="5. Advertising">The service is ad-supported. By using it you acknowledge that ads may be displayed.</S>
      <S title="6. Changes">We may update these terms at any time. Continued use constitutes acceptance.</S>
      <S title="7. Contact">legal@neurobench.io</S>
    </div>
  );
}
