import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const FILES = [
  "content/blog/dark/what-dark-personality-traits-actually-mean.md",
  "content/blog/relationship/does-your-boyfriend-or-girlfriend-sound-like-a-red-flag.md",
  "content/blog/brain-age/sleep-and-brain-age-circadian-rhythm-guide.md",
  "content/blog/brain-age/red-light-green-light-game.md",
];

function parseFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) throw new Error("Missing frontmatter");
  const yaml = m[1];
  const body = m[2];
  const meta = {};
  const lines = yaml.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("tags:")) {
      i++;
      const tags = [];
      while (i < lines.length && /^\s*-\s/.test(lines[i])) {
        tags.push(
          lines[i]
            .replace(/^\s*-\s*/, "")
            .replace(/^["']|["']$/g, "")
            .trim()
        );
        i++;
      }
      meta.tags = tags;
      continue;
    }
    const kv = line.match(/^([a-zA-Z]+):\s*(.*)$/);
    if (kv) {
      let v = kv[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      meta[kv[1]] = v;
    }
    i++;
  }
  return { meta, body };
}

function cleanMd(s) {
  return s.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1");
}

function parseBody(body) {
  const raw = body.trim();
  const blocks = raw.split(/^## /m);
  const intro = cleanMd(blocks[0].trim());
  const sections = [];
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const nl = block.indexOf("\n");
    let heading = (nl === -1 ? block : block.slice(0, nl)).trim();
    const rest = (nl === -1 ? "" : block.slice(nl + 1)).trim();
    heading = heading.replace(/^H2:\s*/i, "").replace(/^H3:\s*/i, "");
    sections.push({ heading, body: cleanMd(rest) });
  }
  return { intro, sections };
}

const postsPath = path.join(root, "content/blog/posts.json");
const posts = JSON.parse(fs.readFileSync(postsPath, "utf8"));

for (const rel of FILES) {
  const fp = path.join(root, rel);
  const raw = fs.readFileSync(fp, "utf8");
  const { meta, body } = parseFrontmatter(raw);
  const { intro, sections } = parseBody(body);
  if (posts.some((p) => p.slug === meta.slug)) {
    console.log("skip (exists):", meta.slug);
    continue;
  }
  posts.push({
    slug: meta.slug,
    title: meta.title,
    excerpt: meta.excerpt,
    blogCategory: meta.blogCategory,
    category: meta.category,
    categorySlug: meta.categorySlug,
    emoji: meta.emoji,
    accent: meta.accent,
    date: meta.date,
    readTime: Number(meta.readTime),
    tags: meta.tags,
    relatedGame: meta.relatedGame,
    relatedGameTitle: meta.relatedGameTitle,
    content: { intro, sections },
  });
  console.log("added:", meta.slug);
}

fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2) + "\n");
console.log("total posts:", posts.length);
