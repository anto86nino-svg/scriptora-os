import type { HumanNarrativeRealismV3Context } from "./types";
import { resolveRealismFamily } from "./types";
import { buildHumanDialogueV4Block } from "@/lib/premium-writing/human-dialogue-v4";
import { collectPriorBeatClusters } from "@/lib/premium-writing/narrative-beat-engine";

function familyAddendum(family: ReturnType<typeof resolveRealismFamily>, chapterIndex: number, total: number): string {
  const progress = total > 0 ? chapterIndex / total : 0;
  switch (family) {
    case "narrative":
      return `NARRATIVE MODE:
- More human imperfection: contradiction, hesitation, omission, awkward beats.
- Thriller/gothic: escalate danger or suspicion every scene — never static dread.
- Romance/dark romance: slow burn — emotional availability must COST something before chapter ${Math.ceil(total * 0.55)}.
- Fantasy: reveal world through action and friction — no lore lecture paragraphs.`;
    case "nonfiction":
      return `SELF-HELP / NONFICTION MODE:
- Concrete steps, examples, and decisions — no motivational fog.
- One idea per paragraph; cut poetic metaphors unless they clarify.
- Authority through specificity, not therapy-speak.`;
    case "educational":
      return `STUDY MODE:
- Clarity over eloquence; short sentences; defined terms.
- Worked example → recap → check question per section.
- Cut verbosity and decorative language.`;
    case "manual":
      return `MANUAL MODE:
- Executable steps, warnings, prerequisites — zero lyrical padding.`;
    case "poetry":
      return `POETRY MODE:
- Image specificity over abstract emotion labels; vary rhythm; one concrete anchor per piece.`;
    default:
      return "";
  }
}

function priorBeatWarning(ctx: HumanNarrativeRealismV3Context): string {
  const prior = collectPriorBeatClusters((ctx.previousChapters || []) as import("@/types/book").Chapter[]);
  if (!prior.length) return "Track emotional beats used so far — do not repeat the same beat with new words.";
  return `EMOTIONAL BEAT MEMORY (already used — EVOLVE, do not repeat): ${prior.join(", ")}.`;
}

/** Universal generation prompt block — all book types. */
export function buildHumanNarrativeRealismV3Block(ctx: HumanNarrativeRealismV3Context = {}): string {
  const family = resolveRealismFamily(ctx.config);
  const lang = ctx.config?.language || "Italian";
  const chapterIndex = ctx.chapterIndex ?? 0;
  const total = ctx.config?.numberOfChapters || 12;
  const dialogueBlock = family === "narrative" ? buildHumanDialogueV4Block(lang) : "";

  return `
HUMAN NARRATIVE REALISM ENGINE V3 (UNIVERSAL — MANDATORY):

1) HUMAN IMPERFECTION
- Reduce perfect dialogue, mature answers, clear confessions, instant emotional availability.
- Favor: contradiction, hesitation, omission, tension, wrong timing, body before words.
- BAD: "Ho paura di perderti perché il mio passato mi ha insegnato ad avere paura dell'abbandono."
- BETTER: "Non è questo." / guardò altrove. / "O forse sì." / Silenzio. / "Lascia stare."

2) THERAPY SPEECH BLOCKER (SHOW > TELL)
BLOCK in dialogue and narration:
- "devi guarire", "sei abbastanza", "ho capito il mio trauma", "devo essere vulnerabile", "ho paura di amare"
- "we need to communicate openly", "you must heal", "I understand my trauma"
REPLACE with: gesture, avoidance, sarcasm, silence, conflict, physical detail.

3) BEAUTIFUL SENTENCE DENSITY CONTROL
- MAX 2 lyrical/poetic sentences in a row — then force a plain sentence (concrete, short, physical).
- When everything is poetic, nothing weighs. Contrast creates rhythm.
- Example shift: "La cattedrale sembrava respirare il dolore del tempo." → sometimes "La cattedrale cadeva a pezzi."

4) NARRATIVE ESCALATION V2
Every scene must do at least ONE: (A) reveal (B) worsen (C) change relationship (D) move conflict (E) increase risk.
FORBIDDEN AI LOOP — same beat in new words:
  Cap 3: "ho paura" → Cap 5: "ho ancora paura" → Cap 7: "ho paura ma diversa" = ONE beat, not three.
If beat already expressed → EVOLVE through action, consequence, or new information.
${priorBeatWarning(ctx)}

5) CHARACTER RESISTANCE (romance/thriller especially)
- Block instant trauma + total openness (especially early chapters).
- Increase: friction, discomfort, flight, denial, ambivalence.
- Chapter ${chapterIndex + 1}/${total} — emotional surrender must still cost something unless late-book.

6) SCENE PURPOSE VALIDATION
Each scene needs at least ONE: plot progression | character shift | revelation | escalation | emotional reversal.
If scene = same emotion repeated → compress or replace with action.

7) COMMERCIAL READABILITY
- Micro-tension every page; mini payoff; delayed reveals; scene-ending hooks.
- Reduce static scenes where mood spins without consequence.
- Reader must feel "one more page" compulsion.

${dialogueBlock}

${familyAddendum(family, chapterIndex, total)}
`.trim();
}
