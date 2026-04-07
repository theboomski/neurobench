import type { Metadata } from "next";
import gamesData from "@/content/games.json";
import type { GameData } from "@/lib/types";
import { SortedGameGrid, ComingSoonCard } from "@/components/GameCard";

const games = gamesData as GameData[];
const COMING_SOON = [
  { title:"Typing Speed Test", emoji:"⌨️", accent:"#F59E0B", category:"Speed" },
  { title:"Memory Test",       emoji:"🧠", accent:"#3B82F6", category:"Memory" },
  { title:"Color Blind Test",  emoji:"🎨", accent:"#EC4899", category:"Vision" },
  { title:"Focus Test",        emoji:"🎯", accent:"#8B5CF6", category:"Focus" },
  { title:"Number Memory",     emoji:"🔢", accent:"#06B6D4", category:"Memory" },
  { title:"Aim Trainer",       emoji:"🖱️", accent:"#EF4444", category:"Reflexes" },
];

export const metadata: Metadata = {
  title: "NeuroBench – Free Online Brain & Reflex Tests",
  description: "Free cognitive benchmark tests. Reaction time, memory, focus, and more. No signup. Instant results.",
};

export default function HomePage() {
  return (
    <div style={{ maxWidth:1280, margin:"0 auto", padding:"0 24px" }}>
      <div style={{ padding:"16px 0 0" }}>
        <div className="ad-slot ad-slot-banner">Advertisement</div>
      </div>

      <section style={{ padding:"72px 0 56px", textAlign:"center" }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(29,185,84,0.1)", border:"1px solid rgba(29,185,84,0.25)", borderRadius:999, padding:"4px 14px", marginBottom:28 }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:"#1DB954", display:"inline-block" }} />
          <span style={{ fontSize:12, color:"#1DB954", fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase" }}>Free · No Signup · Instant Results</span>
        </div>
        <h1 style={{ fontSize:"clamp(40px, 7vw, 80px)", fontWeight:900, letterSpacing:"-0.04em", lineHeight:1.05, marginBottom:20 }}>
          How Fast Is{" "}
          <span style={{ background:"linear-gradient(135deg, #1DB954 0%, #5BE08A 100%)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Your Brain?</span>
        </h1>
        <p style={{ fontSize:"clamp(16px, 2.2vw, 20px)", color:"var(--text-2)", maxWidth:520, margin:"0 auto 48px", lineHeight:1.65 }}>
          Cognitive benchmark tests built on real science. Measure, track, and share your results.
        </p>
        <div style={{ display:"flex", gap:48, justifyContent:"center", flexWrap:"wrap" }}>
          {[{val:"250ms",label:"Human Average"},{val:"5 tests",label:"Available Soon"},{val:"100%",label:"Free Forever"}].map(s => (
            <div key={s.label} style={{ textAlign:"center" }}>
              <div style={{ fontSize:30, fontWeight:800, color:"#1DB954", letterSpacing:"-0.03em" }}>{s.val}</div>
              <div style={{ fontSize:12, color:"var(--text-3)", textTransform:"uppercase", letterSpacing:"0.1em", marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ paddingBottom:56 }}>
        <h2 style={{ fontSize:22, fontWeight:700, marginBottom:20, letterSpacing:"-0.02em" }}>Available Now</h2>
        <SortedGameGrid games={games} />
      </section>

      <section style={{ paddingBottom:64 }}>
        <h2 style={{ fontSize:22, fontWeight:700, marginBottom:20, letterSpacing:"-0.02em", color:"var(--text-2)" }}>Coming Soon</h2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))", gap:16 }}>
          {COMING_SOON.map(g => <ComingSoonCard key={g.title} {...g} />)}
        </div>
      </section>

      <section style={{ paddingBottom:72 }}>
        <div style={{ background:"var(--bg-card)", border:"1px solid var(--border)", borderRadius:"var(--radius-lg)", padding:"40px" }}>
          <h2 style={{ fontSize:20, fontWeight:700, marginBottom:14 }}>What Is NeuroBench?</h2>
          <p style={{ color:"var(--text-2)", lineHeight:1.85, marginBottom:16, fontSize:15 }}>
            NeuroBench is a collection of free, browser-based cognitive performance tests grounded in neuroscience research. Unlike generic &quot;brain games,&quot; each test is designed around a single, measurable metric — so your result actually means something.
          </p>
          <p style={{ color:"var(--text-2)", lineHeight:1.85, fontSize:15 }}>
            All tests run entirely in your browser. No account needed. Your high scores are saved locally. Results are benchmarked against a global statistical distribution so you can see exactly where you stand.
          </p>
        </div>
      </section>

      <div style={{ paddingBottom:24 }}>
        <div className="ad-slot ad-slot-banner">Advertisement</div>
      </div>
    </div>
  );
}
