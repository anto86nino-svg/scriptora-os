import type { ForgeCharacter } from "./forge-evolution-types";

export type FoundationCharacterRole =
  | "protagonista"
  | "co-protagonista"
  | "love interest"
  | "antagonista"
  | "villain"
  | "mentore"
  | "alleato"
  | "traditore"
  | "familiare"
  | "rivale"
  | "personaggio secondario"
  | "comparsa"
  | "narratore"
  | "figura simbolica"
  | "forza oscura"
  | "minaccia"
  | "vittima/simbolo emotivo";

export type FoundationCharacter = {
  id: string;
  name: string;
  role: FoundationCharacterRole;
  roleIndex: number;
  importance: "principale" | "secondario" | "comparsa";
  ageRange?: string;
  shortDescription?: string;
  narrativeFunction?: string;
  personality?: string;
  externalGoal?: string;
  innerWound?: string;
  desire?: string;
  fear?: string;
  contradiction?: string;
  secret?: string;
  relationshipToProtagonist?: string;
  conflictWithProtagonist?: string;
  voiceStyle?: string;
  visualSignature?: string;
  firstSceneBehavior?: string;
  arcDirection?: string;
  genreSpecificNotes?: string;
  source: "auto" | "user";
  locked: boolean;
};

const ROLE_TO_FORGE: Record<FoundationCharacterRole, ForgeCharacter["role"]> = {
  protagonista: "protagonist",
  "co-protagonista": "protagonist",
  "love interest": "antagonist",
  antagonista: "antagonist",
  villain: "antagonist",
  mentore: "supporting",
  alleato: "supporting",
  traditore: "supporting",
  familiare: "supporting",
  rivale: "supporting",
  "personaggio secondario": "supporting",
  comparsa: "supporting",
  narratore: "supporting",
  "figura simbolica": "supporting",
  "forza oscura": "antagonist",
  minaccia: "antagonist",
  "vittima/simbolo emotivo": "supporting",
};

export const FOUNDATION_CHARACTER_ROLES: FoundationCharacterRole[] = [
  "protagonista",
  "co-protagonista",
  "love interest",
  "antagonista",
  "villain",
  "mentore",
  "alleato",
  "traditore",
  "familiare",
  "rivale",
  "personaggio secondario",
  "comparsa",
  "narratore",
  "figura simbolica",
  "forza oscura",
  "minaccia",
  "vittima/simbolo emotivo",
];

function mapRoleLabel(role: ForgeCharacter["role"], index: number, name: string): FoundationCharacterRole {
  if (role === "protagonist") return index === 0 ? "protagonista" : "co-protagonista";
  if (role === "antagonist") {
    if (/minaccia|forza oscura/i.test(name)) return "minaccia";
    return "antagonista";
  }
  if (/mentor|orin|mentore/i.test(name)) return "mentore";
  if (/vittima/i.test(name)) return "vittima/simbolo emotivo";
  return "personaggio secondario";
}

export function forgeCharacterToFoundation(
  character: ForgeCharacter,
  index: number,
  source: "auto" | "user" = "auto",
): FoundationCharacter {
  const role = mapRoleLabel(character.role, index, String(character.name ?? ""));
  return {
    id: character.id || `fc-${index}`,
    name: String(character.name ?? ""),
    role,
    roleIndex: index + 1,
    importance: role === "protagonista" || role === "antagonista" || role === "love interest"
      ? "principale"
      : "secondario",
    shortDescription: character.arc,
    narrativeFunction: character.obsession || character.arc,
    personality: character.contradiction,
    externalGoal: character.desire,
    innerWound: character.wound,
    desire: character.desire,
    fear: character.fear,
    contradiction: character.contradiction,
    secret: character.secret,
    arcDirection: character.arc,
    voiceStyle: character.personalLanguage,
    visualSignature: character.recurringBehavior,
    firstSceneBehavior: character.emotionalTriggers,
    source,
    locked: false,
  };
}

export function foundationCharacterToForge(character: FoundationCharacter): ForgeCharacter {
  return {
    id: character.id,
    role: ROLE_TO_FORGE[character.role] ?? "supporting",
    name: character.name,
    wound: character.innerWound,
    fear: character.fear,
    desire: character.desire ?? character.externalGoal,
    contradiction: character.contradiction ?? character.personality,
    obsession: character.narrativeFunction,
    secret: character.secret,
    arc: character.arcDirection ?? character.shortDescription,
    vulnerability: character.fear,
    dominantFlaw: character.contradiction,
    emotionalTriggers: character.firstSceneBehavior,
    recurringBehavior: character.visualSignature,
    personalLanguage: character.voiceStyle,
    blindSpot: character.secret,
  };
}

export function foundationCastToForge(characters: FoundationCharacter[]): ForgeCharacter[] {
  return characters.map(foundationCharacterToForge).filter((c) => String(c.name).trim().length >= 1);
}

export function forgeCastToFoundation(
  characters: ForgeCharacter[],
  source: "auto" | "user" = "auto",
): FoundationCharacter[] {
  return characters.map((c, i) => forgeCharacterToFoundation(c, i, source));
}

export function regenerateFoundationCharacter(
  input: import("./book-foundation-lock").FoundationGeneratorInput,
  existing: FoundationCharacter,
  generateCast: (input: import("./book-foundation-lock").FoundationGeneratorInput) => FoundationCharacter[],
): FoundationCharacter {
  const fresh = generateCast(input).find((c) => c.role === existing.role)
    ?? generateCast(input)[0];
  if (!fresh) return existing;
  return {
    ...fresh,
    id: existing.id,
    role: existing.role,
    locked: false,
    source: "auto",
  };
}

export function createEmptyFoundationCharacter(role: FoundationCharacterRole = "personaggio secondario"): FoundationCharacter {
  return {
    id: `fc-user-${Date.now()}`,
    name: "",
    role,
    roleIndex: 1,
    importance: "secondario",
    source: "user",
    locked: false,
  };
}

export function getProtagonistName(characters: FoundationCharacter[]): string {
  return characters.find((c) => c.role === "protagonista")?.name
    ?? characters.find((c) => c.importance === "principale")?.name
    ?? "il protagonista";
}

export function buildCharacterAwareQuestionPrompt(
  question: string,
  characters: FoundationCharacter[],
  genre: string,
): string {
  const lead = getProtagonistName(characters);
  const ally = characters.find((c) => c.role === "mentore" || c.role === "alleato");
  const threat = characters.find((c) => c.role === "antagonista" || c.role === "minaccia" || c.role === "love interest");
  if (!ally?.name && !threat?.name) return question;
  if (/conflitto|conflict/i.test(question) && threat?.name) {
    return `${lead} e ${threat.name} sono già nel cast. Vuoi che ${threat.name} sia ${threat.role === "mentore" ? "mentore ambiguo" : "alleato pericoloso"}, minaccia dichiarata o futura rivelazione?`;
  }
  if (ally?.name && threat?.name && /fantasy|fantasi/i.test(genre)) {
    return `${lead} vuole salvare ciò che ama, ma ${ally.name} conosce il costo del potere e ${threat.name} nasconde un legame con la minaccia. Come vuoi che evolvano?`;
  }
  return question;
}
