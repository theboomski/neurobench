import type { Metadata } from "next";

export const metadata: Metadata = { title: "Guidelines | ZAZAZA" };

const S = ({ n, title, children }: { n: string; title: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 32 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <span style={{ fontSize: 10, color: "#1B4D3E", fontFamily: "monospace", letterSpacing: "0.1em" }}>{n} /</span>
      <h2 style={{ fontSize: 17, fontWeight: 700 }}>{title}</h2>
    </div>
    <div style={{ color: "rgba(160,160,160,1)", lineHeight: 1.85, fontSize: 14 }}>{children}</div>
  </div>
);

export default function Page() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
      <div style={{ fontSize: 10, color: "#1B4D3E", fontFamily: "monospace", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
        Legal Documentation
      </div>
      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 6, letterSpacing: "-0.03em" }}>Guidelines</h1>
      <p style={{ color: "rgba(120,120,120,1)", fontSize: 12, marginBottom: 48, fontFamily: "monospace" }}>Last updated: April 2026 · zazaza.app</p>

      <S n="01" title="Overview">
        ZAZAZA allows users to create and share games with the community. To keep ZAZAZA safe and enjoyable for everyone, all user-generated content must follow these guidelines.
      </S>

      <S n="02" title="Prohibited Content">
        <div>The following content is not allowed:</div>
        <ul style={{ paddingLeft: 20, lineHeight: 2, marginTop: 8 }}>
          <li>Hate speech or discrimination based on race, ethnicity, religion, gender, sexual orientation, or other protected characteristics</li>
          <li>Explicit sexual content or pornography</li>
          <li>Content that exploits or harms minors in any way</li>
          <li>Graphic violence or gore</li>
          <li>Promotion of illegal activities or substances</li>
          <li>Harassment, threats, or targeted abuse of individuals</li>
          <li>Spam or misleading content</li>
        </ul>
      </S>

      <S n="03" title="NSFW Content">
        Mildly mature content may be published with the NSFW flag enabled. NSFW content is hidden by default and only shown to users who explicitly opt in. Explicitly sexual content is prohibited regardless of NSFW flag.
      </S>

      <S n="04" title="Reporting Violations">
        If you encounter content that violates these guidelines, please contact us at theboomski@gmail.com and we will review and act promptly.
      </S>

      <S n="05" title="Enforcement">
        We reserve the right to remove any content and suspend or permanently ban accounts that violate these guidelines, without prior notice.
      </S>

      <S n="06" title="Contact">Questions? Email us at theboomski@gmail.com</S>
    </div>
  );
}
