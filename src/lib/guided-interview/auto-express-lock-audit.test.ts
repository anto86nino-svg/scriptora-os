import { describe, expect, it } from "vitest";
import { buildExpressForgeConfiguration } from "./express-forge-config";
import { applyExpressScenarioToState } from "./express-book-package";
import { getBlueprintGateStatus } from "./blueprint-ready-gate";
import { getInitialInterviewState } from "./question-engine";
import { pickExpressAutoScenario } from "@/components/guided-interview/studio-express-ui";

describe("auto express foundation lock audit", () => {
  it("CREA TUTTO TU locks foundation and reaches blueprint gate", () => {
    const input = {
      genre: "dark romance",
      language: "Italiano",
      titleMode: "suggest" as const,
      ideaSeed: "una restauratrice torna nella villa dove sua sorella è morta",
      tone: "oscuro",
      length: "medio" as const,
      controlLevel: "auto" as const,
    };
    const result = buildExpressForgeConfiguration(input, getInitialInterviewState({ chatFirst: true }));
    const scenario = pickExpressAutoScenario(result.packages)!;
    const applied = applyExpressScenarioToState(result.state, scenario);
    const gate = getBlueprintGateStatus(applied);

    expect(applied.bookFoundationLocked, `missing: ${applied.bookFoundation?.missingFields?.join(", ")}`).toBe(true);
    expect(gate.isBlueprintReady).toBe(true);
    expect(gate.needsFoundationLock).toBe(false);
  });
});
