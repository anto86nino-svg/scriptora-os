import type { Chapter } from "@/types/book";
import type { CharacterSupremacyProfile } from "@/lib/character-supremacy";
import type { BehavioralConsistencyReport, BehavioralViolation } from "./types";

const VALUE_LOCK_PATTERNS: Array<{ pattern: RegExp; trait: string; violation: RegExp }> = [
  {
    pattern: /\b(?:never|non|mai)\s+(?:lie|lies|lied|mentir|mentito|mentire)\b/gi,
    trait: "honesty",
    violation: /\b(?:lied|lied to|mentì|mentito|mentire|lied about|ha mentito)\b/gi,
  },
  {
    pattern: /\b(?:hate|odio|detest)\s+(?:lying|mentire|liars|bugiardi)\b/gi,
    trait: "anti-lying",
    violation: /\b(?:lied|mentì|mentito|lied to|ha mentito)\b/gi,
  },
  {
    pattern: /\b(?:never|non|mai)\s+(?:trust|fidarsi|fiducia)\b/gi,
    trait: "distrust",
    violation: /\b(?:trusted|fidati|mi fido|I trust you|ti credo)\b/gi,
  },
  {
    pattern: /\b(?:never|non|mai)\s+(?:forgive|perdon)\b/gi,
    trait: "unforgiving",
    violation: /\b(?:forgave|forgive|perdonò|perdono|I forgive)\b/gi,
  },
];

const PREMATURE_RESOLUTION = /\b(i love you|ti amo|everything is fine|tutto va bene|I understand now|capisco tutto|we're okay|siamo a posto)\b/gi;

function chapterText(ch: Chapter): string {
  return `${ch.content}\n${(ch.subchapters || []).map(s => s.content).join("\n")}`;
}

function corpusForCharacter(name: string, chapters: Chapter[]): string {
  const first = name.split(" ")[0].toLowerCase();
  return chapters
    .map(chapterText)
    .filter(t => t.toLowerCase().includes(first))
    .join("\n");
}

export function analyzeBehavioralConsistency(input: {
  content: string;
  chapterIndex: number;
  previousChapters?: Chapter[];
  profiles?: CharacterSupremacyProfile[];
}): BehavioralConsistencyReport {
  const violations: BehavioralViolation[] = [];
  const text = String(input.content || "");
  const previous = input.previousChapters || [];
  const profiles = input.profiles || [];

  for (const profile of profiles) {
    const prior = corpusForCharacter(profile.name, previous);
    const current = text;
    if (!prior.trim() || !current.toLowerCase().includes(profile.name.split(" ")[0].toLowerCase())) continue;

    for (const rule of VALUE_LOCK_PATTERNS) {
      rule.pattern.lastIndex = 0;
      rule.violation.lastIndex = 0;
      if (rule.pattern.test(prior) && rule.violation.test(current)) {
        violations.push({
          character: profile.name,
          type: "value_contradiction",
          severity: "critical",
          message: `${profile.name}: established "${rule.trait}" violated — action/dialogue contradicts prior chapter`,
          priorEvidence: prior.match(rule.pattern)?.[0],
          currentEvidence: current.match(rule.violation)?.[0],
        });
      }
    }

    for (const forbidden of profile.forbiddenBehaviors) {
      const frag = forbidden.replace(/^never say:\s*/i, "").slice(0, 40);
      if (frag.length > 4 && new RegExp(frag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(current)) {
        violations.push({
          character: profile.name,
          type: "trait_reversal",
          severity: "critical",
          message: `${profile.name}: forbidden behavior detected — ${forbidden}`,
        });
      }
    }

    if (!/\b(fear|paura|hesitat|trembl|silence|silenz|avoid|evit)\b/i.test(prior) && PREMATURE_RESOLUTION.test(current)) {
      if (profile.emotionalOpenness === "closed" || profile.emotionalOpenness === "guarded") {
        violations.push({
          character: profile.name,
          type: "emotional_teleport",
          severity: "critical",
          message: `${profile.name}: emotional resolution without buildup — guarded character became articulate too fast`,
        });
      }
    }

    for (const rel of profile.relationships) {
      const other = rel.withCharacter.split(" ")[0];
      if (rel.trust < 45 && /\b(trusted|fidati|I trust|mi fido)\b/i.test(current) && new RegExp(other, "i").test(current)) {
        violations.push({
          character: profile.name,
          type: "relationship_jump",
          severity: "optional",
          message: `${profile.name} → ${rel.withCharacter}: trust jump without earned progression (registry ${rel.trust}%)`,
        });
      }
    }
  }

  const critical = violations.filter(v => v.severity === "critical").length;
  const consistencyScore = Math.max(0, Math.min(100, 100 - critical * 22 - (violations.length - critical) * 8));

  return {
    version: 1,
    chapterIndex: input.chapterIndex,
    evaluatedAt: new Date().toISOString(),
    violations,
    consistencyScore,
    passesGate: critical === 0,
  };
}
