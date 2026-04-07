export const dict = {
  en: {
    site: {
      name: "NeuroBench",
      tagline: "Benchmark Your Mind",
      description: "Free online mini-games that test your reaction time, memory, focus, and cognitive performance. No signup. Instant results.",
    },
    nav: { home: "Home", privacy: "Privacy Policy", terms: "Terms of Service" },
    home: {
      badge: "Free · No Signup · Instant Results",
      hero: "How Fast Is Your Brain?",
      heroSub: "Free cognitive benchmark tests. No signup. No BS.",
      comingSoon: "Coming Soon",
      underDev: "Under development",
    },
    game: {
      retry: "Try Again",
      share: "Share Result",
      scienceTitle: "The Science Behind This Test",
      tipsTitle: "Tips for a Better Score",
      howToPlayTitle: "How to Play",
      adNotice: "Short ad — then back to the game",
      personalBest: "Personal Best",
      worldwide: "worldwide",
      top: "Top",
      roundOf: (r: number, total: number) => `Round ${r} of ${total}`,
    },
    reaction: {
      startPrompt: "Click anywhere to start",
      startSub: (n: number) => `${n} rounds · measures your average`,
      wait: "Wait for green...",
      clickNow: "CLICK!",
      tooSoon: "Too soon!",
      tooSoonSub: "Click to try that round again",
      result: (r: number, total: number) => `Round ${r} of ${total} · click to continue`,
      complete: "Test Complete",
    },
    share: {
      text: (ms: number, rank: string, url: string) =>
        `I scored ${ms}ms (Rank ${rank}) on the Reaction Time Test. Can you beat me? → ${url}`,
    },
    footer: { rights: "All rights reserved." },
    legal: { lastUpdated: "Last updated" },
  },
};

export type Locale = keyof typeof dict;
export type T = typeof dict.en;
