import type { BookConfig } from "@/types/book";
import { resolveBookTypeContext } from "@/lib/book-type-engine";
import type { WritingEngineContext } from "./types";

function genreBundle(config: BookConfig): string {
  return [config.genre, config.subgenre, config.subcategory, config.category, config.bookTypeId]
    .map((v) => String(v || "").toLowerCase())
    .filter(Boolean)
    .join(" ");
}

function genreRhythmRules(config: BookConfig): string {
  const g = genreBundle(config);
  const rules: string[] = [];

  if (/romance/.test(g)) {
    rules.push(`ROMANCE RHYTHM:
- tension → micro reward → distance → craving → obstacle → almost payoff → frustration → earned payoff
- after intimacy/vulnerability add cost: silence, avoidance, jealousy, danger, bad timing`);
  }
  if (/thriller|crime|horror|mystery|noir/.test(g)) {
    rules.push(`SUSPENSE RHYTHM:
- wait → wrong detail → body reaction → delayed reveal → pressure at scene end`);
  }
  if (/fantasy|sci|science|dystop|speculative/.test(g)) {
    rules.push(`SPECULATIVE RHYTHM:
- world through cost, desire, danger, limitation — never pause to lecture`);
  }
  return rules.join("\n\n");
}

export function buildBestsellerRhythmEngineBlock(config: BookConfig, _opts: WritingEngineContext = {}): string {
  const family = resolveBookTypeContext(config).definition.family;

  if (family !== "narrative") {
    return `
BESTSELLER RHYTHM ENGINE (PRACTICAL):
- problem → insight → example → action → next reason to continue
- cut impressive sentences that do not increase clarity or momentum`;
  }

  return `
BESTSELLER RHYTHM ENGINE (V12):
Balance: tension → dialogue → gesture → silence → micro mystery → release → new friction.
Avoid: continuous introspection, infinite dialogue, uniform emotion, poetic fog.

SCENE ENERGY RULE:
If 3 similar beats in a row (talk-talk-talk or feel-feel-feel) → interrupt with object, body, decision or external pressure.
Alternate compression and release: short pressure beats, one breath, sharper turn.

CONCRETE SPECIFICITY:
Replace abstract emotion with object, body, setting pressure, gesture, silence or physical choice.
If a paragraph explains a feeling, ground it with visible behavior before it ends.

${genreRhythmRules(config)}
Language: ${config.language}`;
}

export function scoreNarrativeRhythmVariety(text: string): number {
  const paragraphs = text.split(/\n{2,}/).filter(Boolean);
  if (paragraphs.length < 4) return 75;

  let dialogueRuns = 0;
  let introspectionRuns = 0;
  let maxDialogueRun = 0;
  let maxIntroRun = 0;

  for (const p of paragraphs) {
    const isDialogue = /[«""]|^-\s/.test(p) || (p.match(/[«""]/g) || []).length >= 2;
    const isIntro = /\b(pens(?:ò|ava)|sent(?:ì|iva)|cap(?:ì|iva)|realizz|wondered|felt|realized)\b/i.test(p);

    if (isDialogue) {
      dialogueRuns += 1;
      maxDialogueRun = Math.max(maxDialogueRun, dialogueRuns);
    } else dialogueRuns = 0;

    if (isIntro) {
      introspectionRuns += 1;
      maxIntroRun = Math.max(maxIntroRun, introspectionRuns);
    } else introspectionRuns = 0;
  }

  const penalty = Math.max(0, maxDialogueRun - 2) * 8 + Math.max(0, maxIntroRun - 2) * 10;
  return Math.max(35, 92 - penalty);
}
