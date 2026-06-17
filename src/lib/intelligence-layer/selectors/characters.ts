import type { ForgeCharacter } from "@/lib/guided-interview/forge-evolution-types";
import type { BookConfig } from "@/types/book";
import type { ForgeInterviewSeed } from "@/lib/guided-interview/forge-blueprint-handoff";
import {
  enrichForgeCharactersForWriter,
  mapForgeCharactersToBookCharacters,
} from "@/lib/guided-interview/forge-blueprint-handoff";
import type { GuidedInterviewState } from "@/lib/guided-interview/types";
import type { CharacterProfileSlice } from "../types";

function hasDeepPsychology(characters?: ForgeCharacter[]): boolean {
  return Boolean(
    characters?.some(
      (character) =>
        character.emotionalTriggers ||
        character.dominantFlaw ||
        character.blindSpot ||
        character.vulnerability ||
        character.recurringBehavior ||
        character.personalLanguage,
    ),
  );
}

export function selectCharactersFromForgeState(state: GuidedInterviewState): CharacterProfileSlice {
  const characters = enrichForgeCharactersForWriter(state.characters);
  return {
    characters,
    bibleText: undefined,
    deepPsychologyAvailable: hasDeepPsychology(characters),
  };
}

export function selectCharactersFromSeed(seed: ForgeInterviewSeed): CharacterProfileSlice {
  const characters = enrichForgeCharactersForWriter(seed.characters);
  return {
    characters,
    bibleText: undefined,
    deepPsychologyAvailable: hasDeepPsychology(characters),
  };
}

export function selectCharactersFromConfig(config: BookConfig): CharacterProfileSlice {
  const bookCharacters = config.characters ?? [];
  const characters = bookCharacters.map((character, index) => ({
    id: `config-${index}`,
    role: index === 0 ? ("protagonist" as const) : ("supporting" as const),
    name: character.name,
    wound: character.wound,
    fear: character.internalNeed,
    desire: character.externalDesire,
    secret: character.secret,
    personality: character.personality,
    emotionalTriggers: character.emotionalTriggers,
    dominantFlaw: character.dominantFlaw,
    blindSpot: character.blindSpot,
    vulnerability: character.vulnerability,
    recurringBehavior: character.recurringBehavior,
    personalLanguage: character.personalLanguage,
  }));

  return {
    characters,
    bibleText: config.characterBibleText,
    deepPsychologyAvailable:
      hasDeepPsychology(characters) || Boolean(config.characterBibleText),
  };
}

export function bookCharactersFromSeed(seed: ForgeInterviewSeed) {
  return mapForgeCharactersToBookCharacters(enrichForgeCharactersForWriter(seed.characters));
}
