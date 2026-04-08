export const dict = {
  en: {
    site: {
      name: "ZAZAZA",
      tagline: "The Global Test Hub",
      description: "Free cognitive tests, brain age assessments, and office IQ challenges. No signup. No payment. Instant results. Globally ranked.",
      url: "zazaza.app",
    },
    nav: {
      home: "Home",
      protocol: "Tests",
      privacy: "Privacy Policy",
      terms: "Terms of Service",
    },
    home: {
      badge: "Free · No Signup · Instant Results",
      hero: "How Smart Is Your Brain?",
      heroSub: "Free tests. Zero signup. Instant results. Globally ranked.",
      categoryLabels: {
        clinical: "Brain Age Test",
        office: "Office IQ Test",
      },
      comingSoon: "Coming Soon",
      stats: [
        { val: "Free", label: "Always" },
        { val: "0", label: "Signup Required" },
        { val: "Instant", label: "Results" },
      ],
    },
    game: {
      beginProtocol: "Start Test",
      retry: "Try Again",
      share: "Share",
      howToPlay: "How to Play",
      scienceTitle: "The Science",
      tipsTitle: "Pro Tips",
      personalBest: "Personal Best",
      newBest: "New Personal Record",
      adNotice: "Loading next test...",
    },
    reaction: {
      idle: "Start Test",
      idleSub: "Click when the screen turns green",
      wait: "Get ready...",
      waitSub: "Don't click yet",
      go: "CLICK NOW",
      tooSoon: "Too Early!",
      tooSoonSub: "Tap to try again",
    },
    boss: {
      idle: "Start Test",
      idleSub: "Tap the boss 10 times as fast as possible",
      active: "TAP!",
      activeSub: (n: number) => `${n} left`,
      complete: "Done!",
    },
    share: {
      reportTitle: "ZAZAZA Test Report",
      text: (title: string, rank: string, subtitle: string, url: string) =>
        `I just took the ${title} on ZAZAZA — Rank ${rank} "${subtitle}" 🧠 Can you beat me? ${url}`,
    },
    legal: { lastUpdated: "Last updated" },
    footer: { rights: "All rights reserved." },
  },
};

export type T = typeof dict.en;
export type Locale = keyof typeof dict;
