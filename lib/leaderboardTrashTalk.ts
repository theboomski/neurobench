/** Preset messages for leaderboard submission (optional). Server only accepts these exact strings. */
export const TRASH_TALK_PRESETS = [
  "Beat this losers 🏆",
  "I'm unbeatable 😤",
  "Too easy 😎",
  "I did this half asleep 😴",
  "My grandma scores higher 👵",
] as const;

export type TrashTalkPreset = (typeof TRASH_TALK_PRESETS)[number];

export const TRASH_TALK_ALLOWLIST = new Set<string>(TRASH_TALK_PRESETS);
