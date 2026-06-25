export const BOOK_FORGE_STEPS = [
  "welcome",
  "title",
  "market",
  "author",
  "structure",
  "characters",
  "style",
  "blueprint",
] as const;

export type BookForgeStepId = typeof BOOK_FORGE_STEPS[number];
