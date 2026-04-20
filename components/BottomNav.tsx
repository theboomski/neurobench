"use client";

import Link from "next/link";
import { useState } from "react";

const MAIN_TABS = [
  { href: "/",                emoji: "🏠", label: "Home" },
  { href: "/blog",            emoji: "📝", label: "Blog" },
  { href: "/brain-age",       emoji: "🧠", label: "Brain" },
  { href: "/dark-personality",emoji: "🌑", label: "Dark" },
  { href: "/relationship",    emoji: "💔", label: "Relate" },
];

const MORE_TABS = [
  { href: "/office-iq",       emoji: "💼", label: "Office IQ" },
  { href: "/money",           emoji: "💰", label: "Money IQ" },
  { href: "/eye-age",         emoji: "👁️", label: "Eye Age" },
  { href: "/focus-test",      emoji: "🎯", label: "Focus" },
  { href: "/word-iq",         emoji: "📚", label: "Word IQ" },
  { href: "/about",           emoji: "ℹ️", label: "About" },
];

export default function BottomNav() {
  const [showMore, setShowMore] = useState(false);

  return (
    <>
      {/* More panel */}
      {showMore && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowMore(false)}
            style={{ position: "fixed", inset: 0, zIndex: 190, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          />
          {/* Panel */}
          <div style={{
            position: "fixed", bottom: 64, left: 0, right: 0, zIndex: 195,
            background: "rgba(10,10,15,0.98)",
            borderTop: "1px solid var(--border)",
            padding: "12px 16px 16px",
          }}>
            <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, textAlign: "center" }}>
              More Categories
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
              {MORE_TABS.map(tab => (
                <Link key={tab.href} href={tab.href} onClick={() => setShowMore(false)}
                  style={{ textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "10px 4px", borderRadius: 10, background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 22, lineHeight: 1 }}>{tab.emoji}</span>
                  <span style={{ fontSize: 9, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em", textTransform: "uppercase", textAlign: "center" }}>{tab.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Bottom bar */}
      <nav style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200,
        background: "rgba(10,10,15,0.97)",
        backdropFilter: "blur(20px)",
        borderTop: "1px solid var(--border)",
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        padding: "0 4px",
      }}>
        {MAIN_TABS.map(tab => (
          <Link key={tab.href} href={tab.href} style={{ textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 2, padding: "6px 2px", borderRadius: 8, WebkitTapHighlightColor: "transparent" }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>{tab.emoji}</span>
            <span style={{ fontSize: 9, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em", textTransform: "uppercase" }}>{tab.label}</span>
          </Link>
        ))}
        {/* More button */}
        <button
          onClick={() => setShowMore(v => !v)}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: 2, padding: "6px 2px", borderRadius: 8, background: "none", border: "none", cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>
          <span style={{ fontSize: 20, lineHeight: 1 }}>{showMore ? "✕" : "⋯"}</span>
          <span style={{ fontSize: 9, color: showMore ? "#00FF94" : "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.04em", textTransform: "uppercase" }}>More</span>
        </button>
      </nav>
    </>
  );
}
