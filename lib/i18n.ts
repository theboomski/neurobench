export const dict = {
  en: {
    site: {
      name: "NeuroBench",
      tagline: "The Cognitive Performance Lab",
      description: "Clinical-grade cognitive benchmarks meets office-life humor. Test your neural latency, stress-relief velocity, and more. Free, instant, no signup.",
      url: "neurobench.vercel.app",
    },
    nav: {
      home: "Home",
      protocol: "Protocols",
      privacy: "Privacy Policy",
      terms: "Terms of Service",
    },
    home: {
      badge: "Cognitive Assessment Platform",
      hero: "Know Your Neural Profile.",
      heroSub: "Clinical-grade benchmarks. Zero fluff. Instant results.",
      categoryLabels: {
        clinical: "Professional Benchmarks",
        office: "Office Survival Tests",
      },
      comingSoon: "Protocol Pending",
      stats: [
        { val: "250ms", label: "Avg. Neural Latency" },
        { val: "2 Protocols", label: "Live Now" },
        { val: "Free", label: "Always" },
      ],
    },
    game: {
      beginProtocol: "Begin Protocol",
      retry: "Run Again",
      share: "Export Report",
      howToPlay: "Protocol Instructions",
      scienceTitle: "Clinical Background",
      tipsTitle: "Optimization Parameters",
      personalBest: "Personal Best",
      newBest: "New Personal Record",
      adNotice: "Initiating next protocol...",
    },
    reaction: {
      idle: "Initiate Protocol",
      idleSub: "Click when the stimulus turns green",
      wait: "Standby...",
      waitSub: "Do not interact — awaiting stimulus",
      go: "RESPOND",
      tooSoon: "Pre-emptive Response Detected",
      tooSoonSub: "Tap to re-initiate",
    },
    boss: {
      idle: "Begin Stress-Relief Protocol",
      idleSub: "Tap the stressor 10 times, maximum velocity",
      active: "NEUTRALIZE",
      activeSub: (n: number) => `${n} remaining`,
      complete: "Stressor Neutralized",
    },
    share: {
      reportTitle: "NeuroBench Assessment Report",
      text: (title: string, rank: string, subtitle: string, url: string) =>
        `My NeuroBench report: ${title} — Rank ${rank} "${subtitle}" — Can you beat it? ${url}`,
    },
    legal: { lastUpdated: "Last updated" },
    footer: { rights: "All rights reserved." },
  },
};

export type T = typeof dict.en;
export type Locale = keyof typeof dict;
