import type { Metadata } from "next";
export const metadata: Metadata = { title: "Privacy Policy | ZAZAZA" };
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
      <p style={{ color: "rgba(120,120,120,1)", fontSize: 12, marginBottom: 48, fontFamily: "monospace" }}>Last updated: April 2026 · zazaza.app</p>
      <S n="01" title="Overview">ZAZAZA (zazaza.app) provides free browser-based cognitive tests, assessments, and user-generated content games. We are committed to protecting your privacy.</S>
      <S n="02" title="Data We Collect">
        <ul style={{ paddingLeft: 20, lineHeight: 2 }}>
          <li><strong>Local Storage:</strong> Your high scores and test results are stored in your browser only - never transmitted to our servers.</li>
          <li><strong>Account Data:</strong> If you create an account, we collect your email address, display name, and profile photo (if provided via Google OAuth). This data is stored securely via Supabase.</li>
          <li><strong>User-Generated Content:</strong> Games, images, and text you create and publish on ZAZAZA are stored on our servers and may be visible to other users.</li>
          <li><strong>Analytics:</strong> Anonymous, aggregated traffic data via Google Analytics (page views, device type, country).</li>
          <li><strong>Advertising:</strong> Google AdSense may use cookies to serve relevant ads. See Google&apos;s Privacy Policy for details.</li>
        </ul>
      </S>
      <S n="03" title="Cookies">We use cookies for advertising and analytics only. You may opt out via your browser settings or Google&apos;s ad settings at adssettings.google.com.</S>
      <S n="04" title="Third-Party Services">We use Google Analytics, Google AdSense, Google OAuth, and Supabase. These services have their own privacy policies. We do not sell your data to any third parties.</S>
      <S n="05" title="Your Rights">You have the right to access, correct, or request deletion of your personal data. Contact us at theboomski@gmail.com to exercise these rights.</S>
      <S n="06" title="Children">ZAZAZA is not directed at children under 13. We do not knowingly collect data from children under 13.</S>
      <S n="07" title="Contact">Questions? Email us at theboomski@gmail.com</S>
    </div>
  );
}
