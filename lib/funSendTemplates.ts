/**
 * Fun Sends — active categories use `public/cards/<category>/` (see `loadFunSendCategoryTemplates.ts`).
 * Optional per-file overrides: `FUN_SEND_CARD_OVERRIDES` keys are `category/filename`.
 */
export type FunSendCategory = "i-love-you" | "birthday" | "roast" | "etc";

/** Tab order and labels for `/send` (folder names match `id`). */
export const FUN_SEND_TABS: Array<{ id: FunSendCategory; label: string }> = [
  { id: "i-love-you", label: "I love you" },
  { id: "birthday", label: "Birthday" },
  { id: "roast", label: "Roast" },
  { id: "etc", label: "Etc" },
];

export type FunSendTemplate = {
  id: string;
  title: string;
  imageSrc: string;
  faceDefault?: { x: number; y: number; size: number };
};

export const FUN_SEND_DEFAULT_FACE_RECT = { x: 430, y: 297, size: 210 };

export const FUN_SEND_CARD_OVERRIDES: Record<
  string,
  { title?: string; faceDefault?: { x: number; y: number; size: number } }
> = {
  "birthday/birthday-old.jpg": {
    title: "Officially Old",
    faceDefault: { ...FUN_SEND_DEFAULT_FACE_RECT },
  },
};

export const FUN_SEND_TEMPLATES: Record<FunSendCategory, FunSendTemplate[]> = {
  "i-love-you": [],
  birthday: [],
  roast: [],
  etc: [],
};

export function getFunSendTemplates(category: FunSendCategory): FunSendTemplate[] {
  return FUN_SEND_TEMPLATES[category] ?? [];
}
