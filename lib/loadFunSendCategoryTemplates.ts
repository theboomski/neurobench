import fs from "fs";
import path from "path";
import {
  FUN_SEND_CARD_OVERRIDES,
  FUN_SEND_DEFAULT_FACE_RECT,
  type FunSendCategory,
  type FunSendTemplate,
} from "@/lib/funSendTemplates";

const IMAGE_RE = /\.(jpe?g|png|webp|gif)$/i;

function slugifyFilename(file: string): string {
  const base = file.replace(/\.[^.]+$/i, "");
  return (
    base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "card"
  );
}

function titleFromFilename(file: string): string {
  const base = file.replace(/\.[^.]+$/i, "").replace(/[-_]+/g, " ");
  const words = base.split(/\s+/).filter(Boolean);
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ") || "Card";
}

/**
 * All card backgrounds for a Fun Sends category: every image in `public/cards/<category>/`.
 */
export function loadFunSendCategoryTemplatesFromDisk(category: FunSendCategory): FunSendTemplate[] {
  const dir = path.join(process.cwd(), "public", "cards", category);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter((f) => IMAGE_RE.test(f)).sort((a, b) => a.localeCompare(b));

  const usedIds = new Set<string>();
  return files.map((file, index) => {
    let id = slugifyFilename(file);
    if (usedIds.has(id)) id = `${id}-${index + 1}`;
    usedIds.add(id);

    const key = `${category}/${file}`;
    const ov = FUN_SEND_CARD_OVERRIDES[key] ?? {};
    return {
      id,
      title: ov.title ?? titleFromFilename(file),
      imageSrc: `/cards/${category}/${file}`,
      faceDefault: ov.faceDefault ?? FUN_SEND_DEFAULT_FACE_RECT,
    };
  });
}
