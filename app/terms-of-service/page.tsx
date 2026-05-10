import type { Metadata } from "next";
export const metadata: Metadata = { title: "Terms of Service | ZAZAZA" };
const S = ({ n, title, children }: { n: string; title: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 32 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <span style={{ fontSize: 10, color: "var(--accent)", fontFamily: "monospace", letterSpacing: "0.1em" }}>{n} /</span>
      <h2 style={{ fontSize: 17, fontWeight: 700 }}>{title}</h2>
    </div>
    <div style={{ color: "rgba(160,160,160,1)", lineHeight: 1.85, fontSize: 14 }}>{children}</div>
  </div>
);
export default function Page() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
      <div style={{ fontSize: 10, color: "var(--accent)", fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>Legal Documentation</div>
      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 6, letterSpacing: "-0.03em" }}>Terms of Service</h1>
      <p style={{ color: "rgba(120,120,120,1)", fontSize: 12, marginBottom: 48, fontFamily: "monospace" }}>Last updated: April 2026 · zazaza.app</p>
      <S n="01" title="Acceptance">By using ZAZAZA (zazaza.app) you agree to these terms.</S>
      <S n="02" title="Service Description">ZAZAZA provides free cognitive benchmark tests, brain age assessments, office IQ challenges, and user-generated content games for entertainment and educational purposes. Results are not medical or psychological assessments and should not be used as such.</S>
      <S n="03" title="Permitted Use">
        <ul style={{ paddingLeft: 20, lineHeight: 2 }}>
          <li>Personal, non-commercial use only.</li>
          <li>Do not use automated tools to manipulate results or rankings.</li>
          <li>Do not attempt to reverse-engineer or scrape the service.</li>
          <li>You are responsible for any content you create and publish on ZAZAZA.</li>
          <li>You may not publish content that violates our Community Guidelines.</li>
        </ul>
      </S>
      <S n="04" title="User-Generated Content">By publishing content on ZAZAZA, you grant us a non-exclusive, royalty-free license to display and distribute that content on the platform. You retain ownership of your content. We reserve the right to remove content that violates our Community Guidelines without notice.</S>
      <S n="05" title="Account Termination">We reserve the right to suspend or ban accounts that violate these terms or our Community Guidelines.</S>
      <S n="06" title="Disclaimer">ZAZAZA tests are for entertainment purposes only. Scores do not constitute medical, psychological, or professional assessments of any kind.</S>
      <S n="07" title="Advertising">ZAZAZA is free to use and supported by Google AdSense advertising. By using the service you agree to the display of ads.</S>
      <S n="08" title="Changes">We may update these terms at any time. Continued use of the service constitutes acceptance of any changes.</S>
      <S n="09" title="Contact">Questions? Email us at theboomski@gmail.com</S>
    </div>
  );
}
