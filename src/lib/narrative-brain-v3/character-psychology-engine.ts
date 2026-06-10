import type { BookConfig, Chapter } from "@/types/book";
import type { CharacterPsychologyProfile } from "@/lib/narrative-intelligence-v2/types";
import { buildCharacterPsychologyProfiles, buildCharacterPsychologyPromptBlock } from "@/lib/narrative-intelligence-v2";
import type { CharacterDialogueDirective } from "./types";

function profileToDirective(profile: CharacterPsychologyProfile): CharacterDialogueDirective {
  return {
    name: profile.name,
    dominantFear: profile.fear || profile.woundLabel,
    dominantDesire: profile.desire || "unspoken longing",
    dominantWound: profile.woundLabel || profile.coreWound,
    defenseMechanism: profile.copingLabel || profile.copingMechanism,
    selfDeception: profile.contradiction || `I am fine if I stay ${profile.copingLabel || "guarded"}.`,
    emotionalTriggers: profile.behavioralDirectives?.slice(0, 3) || [],
    dialogueStyle: `${profile.copingLabel || "guarded"} speech — never therapist-clean`,
    forbiddenDialogue: profile.forbiddenPatterns || [],
  };
}

export function buildCharacterPsychologyEngine(input: {
  config: BookConfig;
  blueprint: import("@/types/book").BookBlueprint | null;
  chapters: Chapter[];
  existing?: CharacterPsychologyProfile[];
}): CharacterPsychologyProfile[] {
  return buildCharacterPsychologyProfiles(input);
}

export function buildCharacterPsychologyPrompt(profiles: CharacterPsychologyProfile[]): string {
  if (!profiles.length) return "";
  return buildCharacterPsychologyPromptBlock(profiles);
}

export function buildCharacterDialogueDirectives(profiles: CharacterPsychologyProfile[]): string {
  if (!profiles.length) return "";

  const directives = profiles.map((p) => profileToDirective(p));
  return [
    "CHARACTER PSYCHOLOGY ENGINE — DIALOGUE LAW:",
    ...directives.map((d) => [
      `${d.name}:`,
      `  Fear: ${d.dominantFear}`,
      `  Desire: ${d.dominantDesire}`,
      `  Wound: ${d.dominantWound}`,
      `  Defense: ${d.defenseMechanism}`,
      `  Self-lie: ${d.selfDeception}`,
      `  Dialogue style: ${d.dialogueStyle}`,
      d.emotionalTriggers.length ? `  Triggers: ${d.emotionalTriggers.join(", ")}` : "",
      d.forbiddenDialogue.length ? `  Never say: ${d.forbiddenDialogue.slice(0, 3).join("; ")}` : "",
    ].filter(Boolean).join("\n")),
    "RULE: Each named character must sound recognizably different. No shared therapist voice.",
  ].join("\n");
}

/** Deterministic dialogue guard — flags generic therapist lines per character */
export function generateCharacterResponseGuard(
  speakerName: string,
  line: string,
  profile?: CharacterPsychologyProfile,
): { ok: boolean; reason?: string } {
  const clean = String(line || "").trim();
  if (!clean) return { ok: true };

  const therapistRe = /\b(i understand (?:now|you)|capisco (?:tutto|perfettamente)|it's okay to feel|va tutto bene|ti amo|i love you|forgive me|mi perdoni)\b/i;
  if (therapistRe.test(clean) && profile?.forbiddenPatterns?.length) {
    return { ok: false, reason: `${speakerName}: premature emotional resolution — rewrite with hesitation or deflection` };
  }

  if (profile?.copingMechanism === "avoidance" && clean.length > 180 && /\b(feel|sentire|emotion|emozion)\b/i.test(clean)) {
    return { ok: false, reason: `${speakerName}: avoidant voice — shorten, deflect, or change subject` };
  }

  return { ok: true };
}
