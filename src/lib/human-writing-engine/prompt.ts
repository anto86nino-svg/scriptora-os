import type { HumanWritingProfile } from "./types";
import { resolveHumanWritingProfile } from "./profiles";

export function buildHumanWritingPromptBlock(config?: Parameters<typeof resolveHumanWritingProfile>[0]): string {
  const profile = resolveHumanWritingProfile(config);

  if (profile.domain === "nonfiction" && profile.subtextLevel < 0.2) {
    return `HUMAN WRITING ENGINE V2 — ${profile.label.toUpperCase()}
Domain: nonfiction / instructional
Tone directive: precise, authoritative, concrete — NOT motivational fiction.

ALWAYS:
${profile.promptRules.map((rule) => `• ${rule}`).join("\n")}

NEVER:
${profile.avoidPatterns.map((rule) => `• ${rule}`).join("\n")}`;
  }

  if (profile.domain === "nonfiction") {
    return `HUMAN WRITING ENGINE V2 — ${profile.label.toUpperCase()}
Write like a credible human expert — warm when useful, never generic.
Avoid AI-safe phrasing, empty platitudes, and unearned emotional breakthroughs.
${profile.promptRules.map((rule) => `• ${rule}`).join("\n")}`;
  }

  return `HUMAN WRITING ENGINE V2 — ${profile.label.toUpperCase()}
Subtext target: ${Math.round(profile.subtextLevel * 100)}%
Silence / restraint target: ${Math.round(profile.silenceWeight * 100)}%
Dialogue friction target: ${Math.round(profile.dialogueFriction * 100)}%
Metaphor cap: ~${profile.metaphorCap} lyrical lines per scene block
Emotional explanation tolerance: ${Math.round(profile.emotionalExplainTolerance * 100)}% (lower = more show, less tell)

CORE RULES:
${profile.promptRules.map((rule) => `• ${rule}`).join("\n")}

REDUCE (AI tells):
• Perfectly balanced dialogue exchanges
• Characters naming their exact emotional state under stress
• Poetic metaphor stacks and lyrical run-on beauty
• Therapist clarity and instant mutual understanding

INCREASE (human craft):
• Subtext — what is NOT said
• Silence — pause, aborted speech, subject change
• Friction — dodge, interrupt, contradict, fail to answer
• Body-first emotion — hands, breath, distance, objects
• Imperfection — half-truths, pride, fear, late understanding

NEVER:
${profile.avoidPatterns.map((rule) => `• ${rule}`).join("\n")}

SUBTEXT PROTOCOL (silent — do not label in text):
For each important line of dialogue decide OUTWARD LINE vs REAL INTENT.
Write only the outward line + physical behavior. Never explain the hidden intent.`;
}

export function shouldApplyHumanWritingPostProcess(profile: HumanWritingProfile): boolean {
  return profile.domain === "fiction" || profile.subtextLevel > 0.15;
}
