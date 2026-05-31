import type { CharacterIntentSheet, CharacterSupremacyProfile } from "./types";

function relationshipLines(profile: CharacterSupremacyProfile): string[] {
  return profile.relationships.slice(0, 3).map(r => {
    const parts = [
      `Con ${r.withCharacter}: fiducia ${r.trust}%`,
      r.attraction >= 50 ? `attrazione ${r.attraction}%` : undefined,
      r.conflict >= 55 ? `conflitto ${r.conflict}%` : undefined,
    ].filter(Boolean);
    return parts.join(", ");
  });
}

export function buildCharacterIntentSheets(input: {
  profiles: CharacterSupremacyProfile[];
  chapterIndex: number;
  presentOnly?: CharacterSupremacyProfile[];
}): CharacterIntentSheet[] {
  const cast = input.presentOnly?.length ? input.presentOnly : input.profiles;
  return cast.map(character => {
    const sceneDirectives = [
      ...character.behavioralRules.slice(0, 3),
      character.emotionalOpenness === "closed"
        ? "Show feeling through action and avoidance — not confession."
        : character.emotionalOpenness === "open"
          ? "Vulnerability is allowed but must cost something."
          : "Emotion leaks in fragments — never a full therapist monologue.",
      character.secrets.length ? `Nasconde: ${character.secrets[0]}` : undefined,
      character.forbiddenBehaviors[0] ? `MAI: ${character.forbiddenBehaviors[0]}` : undefined,
    ].filter(Boolean) as string[];

    return { version: 1, chapterIndex: input.chapterIndex, character, sceneDirectives };
  });
}

export function buildCharacterIntentPromptBlock(sheets: CharacterIntentSheet[]): string {
  if (!sheets.length) return "";

  const blocks = sheets.map(sheet => {
    const c = sheet.character;
    const lines = [
      `${c.name}${c.role ? ` (${c.role})` : ""}`,
      c.desires.length ? `Vuole: ${c.desires.slice(0, 2).join("; ")}` : undefined,
      c.fears.length ? `Ha paura: ${c.fears.slice(0, 2).join("; ")}` : undefined,
      c.secrets.length ? `Nasconde: ${c.secrets.slice(0, 2).join("; ")}` : undefined,
      c.contradictions.length ? `Contraddizione: ${c.contradictions[0]}` : undefined,
      c.speechPattern.length ? `Modo di parlare: ${c.speechPattern[0]}` : undefined,
      `Apertura emotiva: ${c.emotionalOpenness}`,
      ...relationshipLines(c),
      sheet.sceneDirectives.length ? `In scena:\n${sheet.sceneDirectives.map(d => `  • ${d}`).join("\n")}` : undefined,
    ].filter(Boolean);
    return lines.join("\n");
  });

  return [
    "CHARACTER INTENT SHEET (mandatory — every named character must behave like a human):",
    "",
    ...blocks.map(b => `${b}\n`),
    "RULE: Actions and dialogue must follow wound + fear + desire. No plot-convenient personality shifts.",
  ].join("\n");
}
