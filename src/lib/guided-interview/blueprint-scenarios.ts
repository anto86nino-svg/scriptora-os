import type { GuidedInterviewState } from "./types";
import type { ForgeFieldProvenance } from "./express-forge-types";
import { getForgeMemory } from "./interview-memory";
import { buildFinalBookReview } from "./final-book-review";

export type BlueprintScenarioVariant = "safe" | "commercial" | "bold";

export type BlueprintScenario = {
  id: string;
  variant: BlueprintScenarioVariant;
  label: string;
  title: string;
  logline: string;
  promise: string;
  protagonists: string;
  conflict: string;
  structure: string;
  tone: string;
  ending: string;
  editorialRisks: string[];
};

const VARIANT_META: Record<
  BlueprintScenarioVariant,
  { label: string; toneShift: string; risk: string }
> = {
  safe: {
    label: "Scenario A — Safe",
    toneShift: "coerente e accessibile",
    risk: "Meno memorabile ma più stabile commercialmente.",
  },
  commercial: {
    label: "Scenario B — Commercial",
    toneShift: "hook forte e ritmo alto",
    risk: "Più vendibile ma meno letterario.",
  },
  bold: {
    label: "Scenario C — Bold",
    toneShift: "intenso e memorabile",
    risk: "Più rischioso ma più distintivo.",
  },
};

function pickString(...values: Array<string | undefined>): string {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text.length >= 2) return text;
  }
  return "";
}

export function buildBlueprintScenarios(state: GuidedInterviewState): BlueprintScenario[] {
  const memory = getForgeMemory(state);
  const bag = memory.slotValues as Record<string, unknown>;
  const review = buildFinalBookReview(state);

  const baseTitle = pickString(
    String(bag.title ?? ""),
    String(bag.workingTitle ?? ""),
    review.title,
    "Titolo provvisorio",
  );
  const genre = pickString(String(bag.genre ?? ""), String(bag.subgenre ?? ""), review.genre);
  const protagonist = pickString(
    String(bag.protagonist ?? ""),
    String(bag.mainCharacter ?? ""),
    review.characters,
  );
  const promise = pickString(
    String(bag.promise ?? ""),
    String(bag.marketPromise ?? ""),
    String(bag.readerPromise ?? ""),
    review.promise,
  );
  const conflict = pickString(String(bag.centralConflict ?? ""), review.conflict);
  const structure = pickString(String(bag.chapterCount ?? ""), review.chapters, "12 capitoli");
  const tone = pickString(String(bag.tone ?? ""), String(bag.emotionalTone ?? ""), review.genre);
  const ending = pickString(String(bag.endingDirection ?? ""), review.ending);

  return (["safe", "commercial", "bold"] as BlueprintScenarioVariant[]).map((variant) => {
    const meta = VARIANT_META[variant];
    const titleSuffix =
      variant === "bold" ? " — Edizione Intensa" : variant === "commercial" ? "" : " — Edizione Core";
    return {
      id: `scenario-${variant}`,
      variant,
      label: meta.label,
      title: `${baseTitle}${titleSuffix}`.trim(),
      logline: `${protagonist} in un ${genre || "romanzo"} ${meta.toneShift}: ${conflict || promise}`,
      promise: variant === "commercial" ? `${promise} — promessa chiara al lettore.` : promise,
      protagonists: protagonist || "Protagonista da definire",
      conflict: conflict || "Conflitto centrale in escalation",
      structure: variant === "commercial" ? `${structure} · ritmo sostenuto` : structure,
      tone: `${tone} · ${meta.toneShift}`,
      ending: variant === "bold" ? `${ending || "Finale memorabile"} — crepa aperta possibile` : ending || "Finale coerente",
      editorialRisks: [meta.risk],
    };
  });
}

export function applyBlueprintScenarioToState(
  state: GuidedInterviewState,
  scenario: BlueprintScenario,
  provenance?: Record<string, ForgeFieldProvenance>,
): GuidedInterviewState {
  const memory = getForgeMemory(state);
  memory.slotValues.title = scenario.title;
  memory.slotValues.promise = scenario.promise;
  memory.slotValues.centralConflict = scenario.conflict;
  memory.slotValues.endingDirection = scenario.ending;
  memory.answeredSlots.title = true;
  memory.answeredSlots.promise = true;
  memory.answeredSlots.centralConflict = true;
  memory.answeredSlots.endingDirection = true;

  return {
    ...state,
    forgeMemory: memory,
    selectedBlueprintScenarioId: scenario.id,
    blueprintScenarios: state.blueprintScenarios ?? buildBlueprintScenarios(state),
    slotProvenance: {
      ...state.slotProvenance,
      ...provenance,
      title: { value: scenario.title, source: "user", confidence: 0.95 },
      promise: { value: scenario.promise, source: "user", confidence: 0.9 },
    },
    extracted: {
      ...state.extracted,
      bookTitle: scenario.title,
      promise: scenario.promise,
      centralConflict: scenario.conflict,
      narrativeDrive: scenario.ending,
    },
  };
}
