import type { BookConfig, Chapter } from "@/types/book";

const EMOTIONAL_BEAT_PATTERNS: RegExp[] = [
  /\b(ti amo|ti voglio bene|non posso più nasconder|confessione|confesso)\b/gi,
  /\b(ho paura|paura di perder|paura che|non voglio perderti)\b/gi,
  /\b(mi dispiace|scusami|perdonami|non merit[oi])\b/gi,
  /\b(non ti merito|non sono abbastanza|non ce la faccio)\b/gi,
  /\b(I love you|I'm sorry|I can't hide|I'm afraid|confession)\b/gi,
];

const CONFLICT_PHRASE_PATTERNS: RegExp[] = [
  /\b(non capisci|non mi ascolti|non mi vedi|non mi conosci)\b/gi,
  /\b(devi capire|devi sentirmi|ascoltami|guardami)\b/gi,
  /\b(you don't understand|you never listen|hear me out)\b/gi,
];

function normalizeBeat(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 80);
}

export function extractEmotionalBeats(text: string): string[] {
  const beats = new Set<string>();
  for (const pattern of [...EMOTIONAL_BEAT_PATTERNS, ...CONFLICT_PHRASE_PATTERNS]) {
    const matches = text.match(pattern) || [];
    for (const m of matches) beats.add(normalizeBeat(m));
  }
  return Array.from(beats).slice(0, 24);
}

export function collectPriorEmotionalBeats(previousChapters: Chapter[]): string[] {
  const all: string[] = [];
  for (const ch of previousChapters) {
    const content = [ch.content, ...(ch.subchapters || []).map((s) => s.content)].join("\n");
    all.push(...extractEmotionalBeats(content));
  }
  return Array.from(new Set(all)).slice(0, 18);
}

export interface SceneContinuityContext {
  config: BookConfig;
  previousChapters: Chapter[];
  chapterIndex: number;
  outlineSummary?: string;
}

export function buildSceneContinuityBlock(ctx: SceneContinuityContext): string {
  const priorBeats = collectPriorEmotionalBeats(ctx.previousChapters);
  const beatList = priorBeats.length
    ? priorBeats.map((b) => `- "${b}"`).join("\n")
    : "- (none yet — establish fresh emotional territory)";

  return `
SCENE CONTINUITY & ANTI-REPETITION ENGINE V2 (MANDATORY):
Every scene MUST advance the story with ONE of:
(A) new information the reader did not have
(B) new emotional consequence (not the same feeling restated)
(C) new narrative movement (plot, relationship, or stakes shift)

ALREADY USED emotional beats — DO NOT repeat the same confession, fear, or conflict wording:
${beatList}

REJECT internally any draft that:
- repeats a prior confession or fear in similar words
- loops the same emotional déjà vu without consequence
- restates the same conflict argument without escalation

REQUIRE instead:
- a fresh beat, new friction, or a changed power dynamic
- consequences that alter what characters can do next
- at least one line of dialogue that resists perfect emotional clarity
`.trim();
}
