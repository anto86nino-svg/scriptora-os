import { describe, expect, it } from "vitest";
import { finalizeForgeForBlueprint } from "./forge-evolution-engine";
import { buildCanonFromState } from "./canon-genesis-engine";
import {
  buildBlueprintCanonBrief,
  buildCharacterTruthBlock,
  buildForgeInterviewSeed,
  mapForgeCharactersToBookCharacters,
  resolveForgeCommercialHook,
  resolveForgeCommercialPromise,
  resolveForgeSubtitle,
  resolveForgeTitle,
  validateForgeHandoffForBlueprint,
} from "./forge-blueprint-handoff";
import { evolutionReadyGothicState, evolutionReadySelfHelpState } from "./evolution-test-fixture";

describe("forge blueprint handoff", () => {
  it("maps ForgeCharacter to BookCharacter with full psychology", () => {
    const seed = buildForgeInterviewSeed(
      finalizeForgeForBlueprint({
        ...evolutionReadyGothicState(),
        characters: [
          {
            id: "p1",
            role: "protagonist",
            name: "Lucia",
            wound: "Abbandono",
            fear: "Perdere tutto",
            desire: "Libertà",
            contradiction: "Vuole fuggire ma resta",
            obsession: "Lui",
            secret: "Un figlio nascosto",
            arc: "Da vittima a donna libera",
          },
        ],
      }),
    );

    const mapped = mapForgeCharactersToBookCharacters(seed.characters);
    expect(mapped[0]?.name).toBe("Lucia");
    expect(mapped[0]?.wound).toContain("Abbandono");
    expect(mapped[0]?.strictRules).toContain("Lucia");
  });

  it("resolves title intelligence before legacy extracted fields", () => {
    const finalized = finalizeForgeForBlueprint(evolutionReadyGothicState());
    const seed = buildForgeInterviewSeed(finalized);

    expect(resolveForgeTitle(seed)).toBe("La Villa dei Silenzi");
    expect(resolveForgeSubtitle(seed)).toContain("verità sepolta");
    expect(resolveForgeCommercialHook(seed)).toContain("case non dimenticano");
    expect(resolveForgeCommercialPromise(seed)).toContain("discesa lenta");
  });

  it("never uses readerTransformation as title", () => {
    const seed = buildForgeInterviewSeed({
      ...evolutionReadyGothicState(),
      extracted: {
        ...evolutionReadyGothicState().extracted,
        readerTransformation: "Seed che non deve diventare titolo",
        promise: "Seed promessa che non deve diventare titolo",
      },
      titleIntelligence: {
        definitiveTitle: "Titolo Canonico",
        subtitle: "Sottotitolo Canonico",
        commercialHook: "Hook commerciale definitivo",
        commercialPromise: "Promessa commerciale definitiva",
      },
    } as ReturnType<typeof evolutionReadyGothicState>);

    expect(resolveForgeTitle(seed)).toBe("Titolo Canonico");
    expect(resolveForgeTitle(seed)).not.toContain("Seed");
  });

  it("builds canon brief with all six layers", () => {
    const state = finalizeForgeForBlueprint(evolutionReadyGothicState());
    const brief = buildBlueprintCanonBrief(buildForgeInterviewSeed(state));
    expect(brief).toContain("BLUEPRINT CANON BRIEF");
    expect(brief).toContain("WORLD CANON");
    expect(brief).toContain("CHARACTER CANON");
    expect(brief).toContain("RELATIONSHIP CANON");
    expect(brief).toContain("STORY CANON");
    expect(brief).toContain("ENDING CANON");
    expect(brief).toContain("BOOK CANON");
    expect(brief).toContain("Elena");
  });

  it("builds character truth block when canon locked", () => {
    const block = buildCharacterTruthBlock(
      evolutionReadyGothicState().characters,
      true,
    );
    expect(block).toContain("PROTAGONISTA");
    expect(block).toContain("Elena");
    expect(block).toContain("CANON LOCKED");
  });

  it("validates complete handoff for fiction and nonfiction fixtures", () => {
    const gothic = validateForgeHandoffForBlueprint(
      buildForgeInterviewSeed(finalizeForgeForBlueprint(evolutionReadyGothicState())),
    );
    const selfhelp = validateForgeHandoffForBlueprint(
      buildForgeInterviewSeed(finalizeForgeForBlueprint(evolutionReadySelfHelpState())),
    );

    expect(gothic.ready, gothic.missing.join("; ")).toBe(true);
    expect(selfhelp.ready, selfhelp.missing.join("; ")).toBe(true);
  });

  it("builds canon on finalize if missing from raw state", () => {
    const raw = evolutionReadyGothicState();
    expect(raw.canon).toBeUndefined();
    const finalized = finalizeForgeForBlueprint(raw);
    expect(finalized.canonLocked).toBe(true);
    expect(buildCanonFromState(finalized).characters.facts.some((f) => f.includes("Elena"))).toBe(
      true,
    );
  });
});
