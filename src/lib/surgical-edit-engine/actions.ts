import type { SurgicalEditActionResult, SurgicalEditV1ActionId } from "./types";

function applyReplacements(text: string, pairs: Array<[RegExp, string]>): { text: string; changed: boolean } {
  let edited = text;
  let changed = false;
  for (const [pattern, replacement] of pairs) {
    const next = edited.replace(pattern, replacement);
    if (next !== edited) {
      edited = next;
      changed = true;
    }
  }
  return { text: edited, changed };
}

/** 1 — Dialogue roughening: less polished, more human speech */
export function applyDialogueRougheningAction(text: string): SurgicalEditActionResult {
  const pairs: Array<[RegExp, string]> = [
    [/I understand how you feel/gi, "I don't know... maybe I get it"],
    [/I understand your pain completely/gi, "I know what this feels like. Or... maybe I don't"],
    [/I will always be here for you/gi, "I'm still here, okay?"],
    [/You deserve better/gi, "Maybe... maybe this wasn't fair to you"],
    [/Everything will be okay/gi, "I don't know if it'll be okay"],
    [/I know exactly how you feel/gi, "I think I get it. Maybe"],
    [/You are not alone/gi, "You're not alone. I don't think"],
    [/I am here for you/gi, "I'm here. For now"],
    [/I care about you deeply/gi, "I care. More than I should, maybe"],
  ];

  const { text: edited, changed } = applyReplacements(text, pairs);
  return { text: edited, actionId: "dialogue-roughening", applied: changed };
}

/** 2 — Emotional trimming: show > tell */
export function applyEmotionalTrimmingAction(text: string): SurgicalEditActionResult {
  const pairs: Array<[RegExp, string]> = [
    [/\b(she|he) felt devastated\b/gi, "$1 went quiet"],
    [/\b(she|he) felt broken\b/gi, "$1 looked away"],
    [/\b(she|he) felt abandoned\b/gi, "$1 checked the phone again"],
    [/\b(she|he) was heartbroken\b/gi, "$1 stopped speaking"],
    [/\b(she|he) felt scared\b/gi, "$1 hesitated"],
    [/\b(she|he) felt angry\b/gi, "$1 clenched their jaw"],
    [/\b(she|he) felt overwhelmed\b/gi, "$1 went still"],
    [/she felt devastated/gi, "her throat tightened"],
    [/he felt broken/gi, "he looked away"],
    [/she was heartbroken/gi, "she stopped speaking"],
  ];

  const { text: edited, changed } = applyReplacements(text, pairs);
  return { text: edited, actionId: "emotional-compression", applied: changed };
}

/** 3 — Slow burn protection: delay early emotional certainty */
export function applySlowBurnProtectionAction(text: string): SurgicalEditActionResult {
  const pairs: Array<[RegExp, string]> = [
    [/I love you\. I always have\./gi, "I love you. I think I do."],
    [/I need you\. I can't live without you\./gi, "I need you. I shouldn't, but I do."],
    [/I know I'm yours\./gi, "Maybe I'm yours. I don't know yet."],
    [/I've never been so sure of anything\./gi, "I've never been this unsure and this certain at once."],
    [/You're mine\. Completely\./gi, "You're mine. Or you could be."],
    [/I trust you completely\./gi, "I want to trust you. I'm trying."],
    [/This is forever\./gi, "This feels like forever. Maybe."],
  ];

  const { text: edited, changed } = applyReplacements(text, pairs);
  return { text: edited, actionId: "slow-burn-tension", applied: changed };
}

/** 4 — Pacing compression: trim drag without cutting emotion */
export function applyPacingCompressionAction(text: string): SurgicalEditActionResult {
  let edited = text;
  let changed = false;

  const fillerPatterns = [
    /\b(she|he) thought about everything that had happened\.?\s*/gi,
    /\bfor a long moment, nobody spoke\.?\s*/gi,
    /\btime seemed to slow down\.?\s*/gi,
    /\bthe silence stretched between them\.?\s*/gi,
  ];

  for (const pattern of fillerPatterns) {
    const next = edited.replace(pattern, "");
    if (next !== edited) {
      edited = next;
      changed = true;
    }
  }

  const paragraphs = edited.split(/\n\s*\n/);
  const deduped: string[] = [];
  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;
    const prev = deduped[deduped.length - 1]?.trim().toLowerCase();
    if (prev === trimmed.toLowerCase()) {
      changed = true;
      continue;
    }
    deduped.push(trimmed);
  }

  if (deduped.length !== paragraphs.filter((p) => p.trim()).length) changed = true;
  edited = deduped.join("\n\n");

  return { text: edited.replace(/\n{3,}/g, "\n\n").trim(), actionId: "pacing-compression", applied: changed };
}

/** 5 — Ending compression: less over-explained closure */
export function applyEndingCompressionAction(text: string): SurgicalEditActionResult {
  const pairs: Array<[RegExp, string]> = [
    [/\b(she|he) thought about everything that had happened\./gi, ""],
    [/\bmaybe nothing would ever be the same\./gi, ""],
    [/\bit felt like the end of something\./gi, ""],
    [/\b(she|he) felt sad and overwhelmed\./gi, "$1 stayed quiet."],
    [/\b(she|he) didn't know what to say\./gi, "$1 said nothing."],
    [/\band she knew, finally, that everything would be okay\./gi, ""],
    [/\band he understood, at last, what it all meant\./gi, ""],
  ];

  const { text: edited, changed } = applyReplacements(text, pairs);
  return {
    text: edited.replace(/\n{3,}/g, "\n\n").trim(),
    actionId: "ending-compression",
    applied: changed,
  };
}

export const SURGICAL_V1_ACTION_RUNNERS: Record<
  SurgicalEditV1ActionId,
  (text: string) => SurgicalEditActionResult
> = {
  "dialogue-roughening": applyDialogueRougheningAction,
  "emotional-compression": applyEmotionalTrimmingAction,
  "slow-burn-tension": applySlowBurnProtectionAction,
  "pacing-compression": applyPacingCompressionAction,
  "ending-compression": applyEndingCompressionAction,
};
