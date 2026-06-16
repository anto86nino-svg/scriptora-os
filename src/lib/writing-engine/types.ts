import type { BookConfig, Chapter } from "@/types/book";

export type WritingEngineMode = "generation" | "rewrite" | "final-pass";

export type WritingEngineContext = {
  config?: BookConfig;
  chapterIndex?: number;
  mode?: WritingEngineMode;
  language?: string;
  priorText?: string;
  previousChapters?: Array<Pick<Chapter, "title" | "content">>;
  outlineSummary?: string;
};

export function resolveWritingLanguage(ctx: WritingEngineContext): string {
  return ctx.language || ctx.config?.language || "Italian";
}

export function isItalianLanguage(language?: string): boolean {
  return /ital/i.test(language || "");
}

export type CharacterPsychology = {
  wound: string;
  obsession: string;
  contradiction: string;
  blindSpot: string;
  hiddenNeed: string;
  emotionalFear: string;
  behavioralSignature: string[];
  stressReaction: string[];
  intimacyPattern: string;
};

export function buildCharacterPsychology(character: import("@/types/book").BookCharacter): CharacterPsychology {
  const name = [character.name, character.surname].filter(Boolean).join(" ").trim();
  const personality = character.personality || "";
  const wound = character.wound || "ferita non detta che modella ogni scelta";
  const obsession = character.externalDesire || character.secret || "controllo del danno imminente";
  const hiddenNeed = character.internalNeed || "bisogno che non ammette";

  return {
    wound,
    obsession,
    contradiction: personality || "coerente in superficie, incoerente sotto pressione",
    blindSpot: hiddenNeed,
    hiddenNeed,
    emotionalFear: wound.includes("paura") ? wound : `paura legata a: ${wound}`,
    behavioralSignature: [
      personality ? `personalità=${personality}` : "evita il contatto visivo quando mente",
      character.physicalDescription ? `presenza=${character.physicalDescription}` : "gesti piccoli, controllo del corpo",
    ].filter(Boolean),
    stressReaction: [
      "parla troppo in fretta o troppo poco",
      "cambia argomento",
      "umore difensivo",
    ],
    intimacyPattern: character.relationships || "attrito prima di tenerezza",
  };
}

export function characterDisplayName(character: import("@/types/book").BookCharacter): string {
  return [character.name, character.surname].filter(Boolean).join(" ").trim() || "Character";
}
