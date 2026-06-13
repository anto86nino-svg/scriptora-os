import type { GenreDnaProfile } from "./types";
import { DEFAULT_STYLE_PROFILE } from "@/lib/book-creation-os/objectives";

const POETIC_BLOCKED = [/poetic/i, /filosof/i, /introspect/i, /terapeut/i, /motivaz/i, /mindset/i, /self.?help/i, /healing/i, /trasformaz/i];
const THRILLER_BLOCKED = [/colleen hoover/i, /brianna/i, /self.?help/i, /motivaz/i, /coaching/i];

export const GENRE_DNA_PROFILES: Record<string, GenreDnaProfile> = {
  "gothic-thriller": {
    id: "gothic-thriller",
    label: "Gothic Thriller",
    traits: {
      tension: "HIGH",
      metaphor: "LOW_MEDIUM",
      poeticDensity: "LOW",
      introspection: "LOW",
      mystery: "HIGH",
      atmosphere: "HIGH",
      dialogueHumanity: "HIGH",
      therapeuticSpeech: "BLOCKED",
      motivationalTone: "BLOCKED",
      emotionalConvenience: "BLOCKED",
      slowBurn: "ENABLED",
      commercialReadability: "HIGH",
    },
    defaultTone: "gotico, teso, atmosferico, cinematografico, sospeso",
    defaultAuthorStyle: "Netflix Thriller",
    styleProfile: { poeticLevel: 28, tensionIntensity: 88, psychologicalDepth: 62, emotionalIntensity: 55, narrativePace: 78, slowBurn: 70, dialogueLevel: 65, showDontTell: 72, voiceIntensity: 60, presetId: "netflix-thriller" },
    blockedTonePatterns: POETIC_BLOCKED,
    blockedAuthorStylePatterns: THRILLER_BLOCKED,
  },
  thriller: {
    id: "thriller",
    label: "Thriller",
    traits: { tension: "HIGH", metaphor: "LOW", poeticDensity: "LOW", introspection: "LOW", mystery: "HIGH", therapeuticSpeech: "BLOCKED", motivationalTone: "BLOCKED", commercialReadability: "HIGH" },
    defaultTone: "tensione alta, frasi incalzanti, ritmo serrato",
    defaultAuthorStyle: "Netflix Thriller",
    styleProfile: { poeticLevel: 25, tensionIntensity: 85, narrativePace: 80, emotionalIntensity: 50, presetId: "netflix-thriller" },
    blockedTonePatterns: POETIC_BLOCKED,
    blockedAuthorStylePatterns: THRILLER_BLOCKED,
  },
  romance: {
    id: "romance",
    label: "Romance",
    traits: { chemistry: "HIGH", payoffSpeed: "DELAYED", emotionalAvailability: "CONTROLLED", subtext: "HIGH", therapeuticSpeech: "BLOCKED", motivationalTone: "BLOCKED" },
    defaultTone: "intimo, emotivo, cinematografico, slow burn",
    defaultAuthorStyle: "Colleen Hoover Emotion",
    styleProfile: { emotionalIntensity: 85, slowBurn: 70, dialogueLevel: 72, poeticLevel: 45, presetId: "colleen-hoover" },
    blockedTonePatterns: [/motivaz/i, /mindset/i, /self.?help/i, /coaching/i, /framework/i],
    blockedAuthorStylePatterns: [/self.?help/i, /authority/i, /brianna/i],
  },
  "dark-romance": {
    id: "dark-romance",
    label: "Dark Romance",
    traits: { chemistry: "HIGH", tension: "HIGH", subtext: "HIGH", therapeuticSpeech: "BLOCKED", slowBurn: "ENABLED" },
    defaultTone: "oscurità elegante, desiderio pericoloso, trattenuto",
    defaultAuthorStyle: "Dark Romance Premium",
    styleProfile: { slowBurn: 80, tensionIntensity: 75, emotionalIntensity: 85, poeticLevel: 40, presetId: "dark-romance-premium" },
    blockedTonePatterns: POETIC_BLOCKED,
    blockedAuthorStylePatterns: THRILLER_BLOCKED,
  },
  "self-help": {
    id: "self-help",
    label: "Self Help",
    traits: { clarity: "EXTREME", actionability: "HIGH", authority: "HIGH", emotionalStorytelling: "SUPPORTIVE", metaphor: "LOW", therapeuticSpeech: "ENABLED" },
    defaultTone: "chiaro, autorevole, empatico, pratico",
    defaultAuthorStyle: "Self Help",
    styleProfile: { voiceIntensity: 72, showDontTell: 82, narrativePace: 55, poeticLevel: 30, presetId: "self-help-authority" },
    blockedTonePatterns: [/gotico/i, /noir/i, /murder/i, /thriller/i, /dark romance/i],
    blockedAuthorStylePatterns: [/netflix thriller/i, /stephen king/i, /dark romance/i],
  },
  mindset: {
    id: "mindset",
    label: "Mindset",
    traits: { clarity: "EXTREME", actionability: "HIGH", authority: "HIGH", emotionalStorytelling: "SUPPORTIVE" },
    defaultTone: "diretto, motivante ma concreto, senza retorica vuota",
    defaultAuthorStyle: "Self Help",
    styleProfile: { voiceIntensity: 75, showDontTell: 80, poeticLevel: 25, presetId: "self-help-authority" },
    blockedTonePatterns: [/gotico/i, /noir/i, /thriller/i],
    blockedAuthorStylePatterns: [/netflix thriller/i, /dark romance/i],
  },
  education: {
    id: "education",
    label: "Study Mode",
    traits: { clarity: "EXTREME", memoryRetention: "HIGH", examples: "HIGH", verbosity: "LOW", therapeuticSpeech: "BLOCKED" },
    defaultTone: "chiaro, didattico, progressivo, senza fronzoli",
    defaultAuthorStyle: "Educational",
    styleProfile: { voiceIntensity: 70, showDontTell: 85, dialogueLevel: 35, poeticLevel: 15, narrativePace: 50, presetId: "educational-clear" },
    blockedTonePatterns: [/poetic/i, /romance/i, /gotico/i, /motivaz/i],
    blockedAuthorStylePatterns: [/colleen/i, /dark romance/i, /netflix/i],
  },
  fantasy: {
    id: "fantasy",
    label: "Fantasy",
    traits: { worldbuilding: "HIGH", metaphor: "MEDIUM", introspection: "MEDIUM", therapeuticSpeech: "BLOCKED" },
    defaultTone: "cinematografico, sensoriale, immersivo",
    defaultAuthorStyle: "Fantasy Cinematic",
    styleProfile: { poeticLevel: 60, showDontTell: 80, narrativePace: 65, presetId: "fantasy-cinematic" },
    blockedTonePatterns: [/mindset/i, /coaching/i, /self.?help/i],
    blockedAuthorStylePatterns: [/self.?help/i, /brianna/i],
  },
  "cozy-fantasy": {
    id: "cozy-fantasy",
    label: "Cozy Fantasy",
    traits: { atmosphere: "HIGH", metaphor: "LOW_MEDIUM", introspection: "MEDIUM", therapeuticSpeech: "BLOCKED" },
    defaultTone: "caldo, rassicurante, immersivo, leggero",
    defaultAuthorStyle: "Cozy Fantasy",
    styleProfile: { poeticLevel: 55, emotionalIntensity: 58, narrativePace: 48, presetId: "cozy-fantasy" },
    blockedTonePatterns: [/mindset/i, /motivaz/i],
    blockedAuthorStylePatterns: [/self.?help/i],
  },
};

export function resolveGenreDnaProfile(input: {
  bookTypeId?: string;
  genre?: string;
  subcategory?: string;
  subgenre?: string;
}): GenreDnaProfile {
  const hay = `${input.bookTypeId || ""} ${input.genre || ""} ${input.subcategory || ""} ${input.subgenre || ""}`.toLowerCase();

  if (input.bookTypeId && GENRE_DNA_PROFILES[input.bookTypeId]) {
    return GENRE_DNA_PROFILES[input.bookTypeId];
  }
  if (/gothic.*thrill|thrill.*gothic|gotico/i.test(hay)) return GENRE_DNA_PROFILES["gothic-thriller"];
  if (/dark.?romance/i.test(hay) || input.genre === "dark-romance") return GENRE_DNA_PROFILES["dark-romance"];
  if (/cozy/i.test(hay)) return GENRE_DNA_PROFILES["cozy-fantasy"];
  if (/mindset/i.test(hay)) return GENRE_DNA_PROFILES.mindset;
  if (/educat|scuol|studio|storia scol|matematica/i.test(hay) || input.genre === "education") return GENRE_DNA_PROFILES.education;
  if (/self.?help|crescita|personal growth/i.test(hay) || input.genre === "self-help") return GENRE_DNA_PROFILES["self-help"];
  if (/romance/i.test(hay) && !/dark/i.test(hay)) return GENRE_DNA_PROFILES.romance;
  if (/thrill|crime|mystery|noir/i.test(hay)) return GENRE_DNA_PROFILES.thriller;
  if (/fantasy/i.test(hay)) return GENRE_DNA_PROFILES.fantasy;

  return {
    id: "generic",
    label: "Generic",
    traits: {},
    defaultTone: "editoriale, chiaro, coinvolgente",
    defaultAuthorStyle: "Bestseller Commerciale",
    styleProfile: { ...DEFAULT_STYLE_PROFILE, presetId: "commercial-bestseller" },
    blockedTonePatterns: [],
    blockedAuthorStylePatterns: [],
  };
}

export function buildGenreDnaPromptBlock(profile: GenreDnaProfile): string {
  const traitLines = Object.entries(profile.traits)
    .map(([k, v]) => `- ${k}: ${v}`)
    .join("\n");
  return `GENRE DNA LOCK — ${profile.label} (invisible, mandatory)
${traitLines || "- follow resolved book type conventions"}

DNA ENFORCEMENT:
- therapeuticSpeech=BLOCKED → no therapy-speak, no instant emotional resolution, no coaching dialogue
- motivationalTone=BLOCKED → no pep-talk, no "you can do it" framing inside fiction
- poeticDensity=LOW → limit metaphors; prefer concrete action and sensory detail
- introspection=LOW → show through behavior; avoid essayistic inner monologue
- clarity=EXTREME → short sentences, defined terms, worked examples (nonfiction/study only)`;
}
