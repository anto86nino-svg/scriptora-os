import type { GuidedInterviewState } from "./types";
import type { ForgeFieldProvenance } from "./express-forge-types";
import type { ExpressBookScenario } from "./express-book-package";
import { applyExpressScenarioToState, buildExpressBookScenarios } from "./express-book-package";
import type { ExpressForgeInput } from "./express-forge-types";

/** @deprecated use ExpressBookScenario from express-book-package */
export type BlueprintScenarioVariant = ExpressBookScenario["variant"];

/** @deprecated use ExpressBookScenario */
export type BlueprintScenario = ExpressBookScenario;

export function buildBlueprintScenarios(state: GuidedInterviewState): ExpressBookScenario[] {
  const input = state.expressConfig;
  if (input) {
    return buildExpressBookScenarios({
      ...input,
      ideaSeed: input.ideaSeed || input.protagonistSeed || "",
    });
  }
  if (state.blueprintScenarios?.length) {
    return state.blueprintScenarios as ExpressBookScenario[];
  }
  return buildExpressBookScenarios({
    genre: state.selectedGenre ?? "dark romance",
    language: state.extracted?.language ?? "Italian",
    titleMode: "suggest",
    ideaSeed: state.extracted?.protagonistWound ?? state.extracted?.promise ?? "protagonista",
    tone: state.selectedTone ?? state.extracted?.emotionalTone ?? "oscuro",
    length: "medio",
    controlLevel: "scenarios",
  });
}

export function applyBlueprintScenarioToState(
  state: GuidedInterviewState,
  scenario: ExpressBookScenario,
  provenance?: Record<string, ForgeFieldProvenance>,
): GuidedInterviewState {
  const applied = applyExpressScenarioToState(state, scenario);
  return {
    ...applied,
    slotProvenance: {
      ...applied.slotProvenance,
      ...provenance,
      title: { value: scenario.title, source: "user", confidence: 0.95 },
      promise: { value: scenario.marketPromise, source: "auto", confidence: 0.9 },
    },
  };
}

export {
  applyExpressScenarioToState,
  buildExpressBookScenarios,
  buildCompleteExpressBookPackage,
  ensureExpressBookPackageCompleteness,
  validateExpressPackageReadiness,
} from "./express-book-package";

export type { ExpressBookScenario } from "./express-book-package";
