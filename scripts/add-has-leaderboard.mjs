import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, "..", "content", "games.json");

const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
const isBundle = !Array.isArray(raw);
const games = isBundle ? raw.games : raw;

const TRUE_CAT = new Set(["brain-age", "office-iq", "focus-test", "word-iq", "korean-tv"]);
const FALSE_CAT = new Set(["dark-personality", "relationship", "money"]);

for (const g of games) {
  if (TRUE_CAT.has(g.category)) g.hasLeaderboard = true;
  else if (FALSE_CAT.has(g.category)) g.hasLeaderboard = false;
  else g.hasLeaderboard = false;
}

if (isBundle) raw.games = games;
fs.writeFileSync(filePath, JSON.stringify(raw, null, 2) + "\n");
console.log("Wrote hasLeaderboard for", games.length, "games");
