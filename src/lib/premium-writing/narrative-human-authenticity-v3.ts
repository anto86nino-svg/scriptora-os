import type { BookConfig } from "@/types/book";

/** Surgical post-pass — preserves author voice, removes obvious AI-humanity gaps */

const THERAPY_DIALOGUE: RegExp[] = [
  /\b(capisco perfettamente come ti senti|I understand exactly how you feel)\b/gi,
  /\b(va tutto bene, respira|it's okay, just breathe)\b/gi,
  /\b(dobbiamo parlarne con calma|we need to talk calmly about this)\b/gi,
  /\b(ti prometto che non ti farò mai male|I promise I'll never hurt you)\b/gi,
];

const INSTANT_EMOTION_DUMP: RegExp[] = [
  /\b(ti amo da sempre|I've always loved you)\b/gi,
  /\b(confesso tutto|I confess everything)\b/gi,
  /\b(non posso più nascondere i miei sentimenti|I can't hide my feelings anymore)\b/gi,
];

const GENERIC_BEAUTY: RegExp[] = [
  /\b(un silenzio carico di significato|a silence heavy with meaning)\b/gi,
  /\b(il cuore le batte all'impazzata|her heart raced wildly)\b/gi,
  /\b(in quel momento capì che nulla sarebbe stato più come prima)\b/gi,
];

const EMOTION_TELL_LINE =
  /^(Era|Erano|Si sentiva|Mi sentivo|I felt|She felt|He felt)\s+[^.\n]{3,40}\s+(trist[ei]|felic[ei]|confus[oa]|devastat[oa]|terrorizzat[oa]|innamorat[oa])[.!?…]?\s*$/gim;

function isEarlyRomanceChapter(chapterIndex: number, config?: BookConfig): boolean {
  const total = config?.numberOfChapters || 20;
  return /romance|dark-romance/i.test(String(config?.genre || "")) && chapterIndex / total < 0.55;
}

function softenTherapyLines(text: string): string {
  let result = text;
  for (const p of THERAPY_DIALOGUE) {
    result = result.replace(p, (m) => {
      const t = m.trim();
      if (t.length < 20) return "—";
      return "—";
    });
  }
  return result;
}

function trimInstantConfessions(text: string, config?: BookConfig, chapterIndex = 0): string {
  if (!isEarlyRomanceChapter(chapterIndex, config)) return text;
  let result = text;
  for (const p of INSTANT_EMOTION_DUMP) {
    result = result.replace(p, "");
  }
  return result;
}

function removeDuplicateParagraphs(text: string): string {
  const paras = text.split(/\n{2,}/);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of paras) {
    const key = p.trim().toLowerCase().slice(0, 120);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out.join("\n\n");
}

export function applyNarrativeHumanAuthenticityV3(
  text: string,
  opts?: { config?: BookConfig; chapterIndex?: number; language?: string },
): string {
  if (!text?.trim()) return text ?? "";

  let result = text;
  result = softenTherapyLines(result);
  result = trimInstantConfessions(result, opts?.config, opts?.chapterIndex ?? 0);
  for (const p of GENERIC_BEAUTY) result = result.replace(p, "");
  result = result.replace(EMOTION_TELL_LINE, "");
  result = removeDuplicateParagraphs(result);
  result = result.replace(/ {2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();

  return result;
}

export function scoreNarrativeAuthenticity(text: string): number {
  let penalty = 0;
  for (const p of [...THERAPY_DIALOGUE, ...INSTANT_EMOTION_DUMP, ...GENERIC_BEAUTY]) {
    penalty += (text.match(p) || []).length * 12;
  }
  const tells = (text.match(EMOTION_TELL_LINE) || []).length;
  penalty += tells * 8;
  return Math.round(Math.max(25, 100 - penalty));
}
