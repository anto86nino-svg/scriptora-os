import { describe, expect, it } from "vitest";
import { generateWizardCharacter } from "./character-generator";

describe("generateWizardCharacter", () => {
  it("creates a narratively deep character profile for Writer Studio", () => {
    const character = generateWizardCharacter("romance|ferita famigliare|cast premium");

    expect(character.name).toBeTruthy();
    expect(character.wound).toBeTruthy();
    expect(character.externalDesire).toBeTruthy();
    expect(character.internalNeed).toBeTruthy();
    expect(character.vulnerability).toBeTruthy();
    expect(character.dominantFlaw).toBeTruthy();
    expect(character.blindSpot).toBeTruthy();
    expect(character.emotionalTriggers).toBeTruthy();
    expect(character.recurringBehavior).toBeTruthy();
    expect(character.personalLanguage).toBeTruthy();
    expect(character.relationships).toBeTruthy();
    expect(character.strictRules).toMatch(/ferita|desiderio|trigger|arco/i);
  });
});
