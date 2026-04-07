import type { Metadata } from "next";
export const metadata: Metadata = { title: "Terms of Service | NeuroBench" };
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
      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 6, letterSpacing: "-0.03em" }}>Terms of Service</h1>
      <p style={{ color: "rgba(80,80,80,1)", fontSize: 12, marginBottom: 48, fontFamily: "monospace" }}>Last updated: January 1, 2025</p>
      <S n="01" title="Acceptance">By using NeuroBench you agree to these terms.</S>
      <S n="02" title="Service Description">NeuroBench provides free cognitive benchmark tests for entertainment and educational purposes. Results are not medical or psychological assessments.</S>
      <S n="03" title="Permitted Use"><ul style={{ paddingLeft: 20, lineHeight: 2 }}><li>Personal, non-commercial use only.</li><li>Do not use automated tools to manipulate results.</li><li>Do not attempt to reverse-engineer or scrape the service.</li></ul></S>
      <S n="04" title="Disclaimer">The service is provided &quot;as is.&quot; We do not guarantee accuracy, uptime, or fitness for a particular purpose.</S>
      <S n="05" title="Advertising">The service is ad-supported. By using it you acknowledge that ads may be displayed.</S>
      <S n="06" title="Contact">legal@neurobench.io</S>
    </div>
  );
}
