import type { BookConfig } from "@/types/book";
import { isItalianLanguage, type WritingEngineContext } from "./types";
import { normalizeManuscriptSpacing } from "./shared-utils";

const ITALIAN_PERFECT_DIALOGUE: RegExp[] = [
  /«([^»]{8,120})»\s*\n\s*«([^»]{8,120})»/g,
  /«?\s*Capisco perfettamente come ti senti[^».\n]*»?/gi,
  /«?\s*È normale avere paura[^».\n]*»?/gi,
  /«?\s*Dobbiamo comunicare in modo sano[^».\n]*»?/gi,
  /«?\s*Ti prometto che non ti farò mai male[^».\n]*»?/gi,
];

const ENGLISH_PERFECT_DIALOGUE: RegExp[] = [
  /"([^"]{8,120})"\s*\n\s*"([^"]{8,120})"/g,
  /"?\s*I understand exactly how you feel[^".\n]*"?/gi,
  /"?\s*It's normal to be afraid[^".\n]*"?/gi,
  /"?\s*We need to communicate healthily[^".\n]*"?/gi,
  /"?\s*I promise I'll never hurt you[^".\n]*"?/gi,
];

const MAX_DIALOGUE_FIXES = 3;

export function buildDialogueHumanizerBlock(config: BookConfig, _opts: WritingEngineContext = {}): string {
  return `
DIALOGUE HUMANIZER (V12):
People do NOT: answer every question, speak therapeutically, confess cleanly, understand each other instantly.
People DO: dodge, change topic, misunderstand, protect ego, interrupt, lie by omission, say almost-right things.

RULES:
- At least one exchange per scene must misfire (interruption, silence, wrong answer, deflection)
- Subtext > explicit emotion naming
- Broken sentences, hesitation, false starts allowed
- Never mutual therapeutic clarity in the same beat

Language: ${config.language}`;
}

export function applyDialogueHumanizerPostprocess(
  text: string,
  opts: WritingEngineContext = {},
): string {
  if (!text?.trim()) return text || "";

  const language = opts.language || opts.config?.language || "Italian";
  const italian = isItalianLanguage(language);
  let next = text;
  let fixes = 0;

  const patterns = italian ? ITALIAN_PERFECT_DIALOGUE : ENGLISH_PERFECT_DIALOGUE;
  for (const pattern of patterns) {
    if (fixes >= MAX_DIALOGUE_FIXES) break;
    const before = next;
    next = next.replace(pattern, (match) => {
      if (fixes >= MAX_DIALOGUE_FIXES) return match;
      fixes += 1;
      if (italian) {
        return match.replace(/Capisco perfettamente|È normale avere paura|Dobbiamo comunicare|Ti prometto che non ti farò mai male/i, "Non adesso");
      }
      return match.replace(/I understand exactly|It's normal to be afraid|We need to communicate|I promise I'll never hurt you/i, "Not now");
    });
    if (before !== next && !pattern.global) fixes += 0;
  }

  return normalizeManuscriptSpacing(next);
}
