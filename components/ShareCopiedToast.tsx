"use client";

export default function ShareCopiedToast({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      role="status"
      style={{
        position: "fixed",
        bottom: 88,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        background: "rgba(0,255,148,0.95)",
        color: "#000",
        fontWeight: 900,
        fontSize: 13,
        padding: "10px 20px",
        borderRadius: 999,
        boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
        fontFamily: "var(--font-mono), monospace",
      }}
    >
      Copied!
    </div>
  );
}
