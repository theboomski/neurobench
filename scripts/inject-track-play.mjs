import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "..", "components", "games");

const files = fs.readdirSync(dir).filter((f) => f.endsWith(".tsx"));

function addImport(s) {
  if (s.includes('from "@/lib/tracking"')) return s;
  return s.replace(
    /^"use client";\r?\n/m,
    `"use client";\n\nimport { trackPlay } from "@/lib/tracking";\n`,
  );
}

function patch(s) {
  let o = s;

  o = o.replace(
    /onClick=\{\(\) => setPhase\("playing"\)\}/g,
    `onClick={() => { trackPlay(game.id); setPhase("playing"); }}`,
  );
  o = o.replace(
    /onClick=\{\(\) => \{ setShuffleKey\(k => k \+ 1\); setPhase\("playing"\); \}\}/g,
    `onClick={() => { trackPlay(game.id); setShuffleKey(k => k + 1); setPhase("playing"); }}`,
  );
  o = o.replace(
    /onClick=\{\(\) => \{ setPhase\("playing"\); setRoundIdx\(0\); setTotalError\(0\); \}\}/g,
    `onClick={() => { trackPlay(game.id); setPhase("playing"); setRoundIdx(0); setTotalError(0); }}`,
  );

  o = o.replace(
    /if \(phase === "idle"\)\s+\{\s+beginWait\(\); return; \}/g,
    `if (phase === "idle")    { trackPlay(game.id); beginWait(); return; }`,
  );

  o = o.replace(
    /if \(phase === "idle"\) \{\n      setPhase\("active"\);/g,
    `if (phase === "idle") {\n      trackPlay(game.id);\n      setPhase("active");`,
  );

  o = o.replace(
    /const handleBegin = \(\) => \{ setLevel\(1\); startLevel\(1\); \};/g,
    `const handleBegin = () => { trackPlay(game.id); setLevel(1); startLevel(1); };`,
  );

  o = o.replace(
    /const beginGame = useCallback\(\(\) => \{\n    clearScheduled\(\);/g,
    `const beginGame = useCallback(() => {\n    trackPlay(game.id);\n    clearScheduled();`,
  );

  o = o.replace(
    /const startGame = useCallback\(\(\) => \{\n(?!    trackPlay)/g,
    `const startGame = useCallback(() => {\n    trackPlay(game.id);\n`,
  );

  o = o.replace(
    /const startGame = \(\) => \{\n(?!    trackPlay)/g,
    `const startGame = () => {\n    trackPlay(game.id);\n`,
  );

  o = o.replace(
    /const handleStart = \(\) => \{\n(?!    trackPlay)/g,
    `const handleStart = () => {\n    trackPlay(game.id);\n`,
  );

  o = o.replace(
    /const startGame = \(\) => \{(?! trackPlay)(?=\S)/g,
    `const startGame = () => { trackPlay(game.id); `,
  );

  return o;
}

for (const f of files) {
  const p = path.join(dir, f);
  let s = fs.readFileSync(p, "utf8");
  const before = s;
  s = addImport(s);
  s = patch(s);
  if (s !== before) fs.writeFileSync(p, s);
}

console.log("Processed", files.length, "game components");
