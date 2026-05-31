import type { BookBlueprint, BookConfig, Chapter } from "@/types/book";
import type { NarrativeMemoryCoreSnapshot } from "./types";
import type { CanonProtectionReport, CanonViolation } from "./types";

function canonCharacterNames(config: BookConfig, blueprint?: BookBlueprint | null): string[] {
  return [
    ...(config.characters || []).map(c => [c.name, c.surname].filter(Boolean).join(" ").trim()),
    ...(blueprint?.blueprintIntegrity?.characterMemoryEngine || []).map(c => c.canonicalName),
  ].filter(Boolean);
}

function hasCanonContradiction(text: string, rule: string): boolean {
  const lower = text.toLowerCase();
  const ruleFrag = rule.toLowerCase().slice(0, Math.min(36, rule.length));
  const anchor = ruleFrag.slice(0, Math.min(20, ruleFrag.length));
  const idx = lower.indexOf(anchor);
  if (idx < 0) return false;

  const window = lower.slice(Math.max(0, idx - 24), idx + rule.length + 96);
  return (
    /\b(?:not|never|non|mai|impossible|contradict|repealed|broken|violated)\b/.test(window) &&
    /\b(?:forbade|forbidden|pact|canon|must|cannot|impossible)\b/.test(window)
  );
}

export function analyzeCanonProtection(input: {
  content: string;
  config: BookConfig;
  blueprint?: BookBlueprint | null;
  memory?: NarrativeMemoryCoreSnapshot;
  previousChapters?: Chapter[];
}): CanonProtectionReport {
  const violations: CanonViolation[] = [];
  const text = String(input.content || "");
  const lower = text.toLowerCase();

  const integrity = input.blueprint?.blueprintIntegrity;
  for (const rule of integrity?.canonProtectionLayer?.immutableCanonRules || []) {
    if (hasCanonContradiction(text, rule)) {
      if (input.previousChapters?.some(ch => ch.content.toLowerCase().includes(rule.toLowerCase().slice(0, 24)))) {
        violations.push({
          code: "canon_rule_contradiction",
          severity: "critical",
          message: `Possible contradiction of canon rule: ${rule.slice(0, 80)}`,
          source: "blueprint",
        });
      }
    }
  }

  for (const forbidden of integrity?.canonProtectionLayer?.forbiddenMutations || []) {
    if (forbidden.length > 4 && lower.includes(forbidden.toLowerCase().slice(0, 30))) {
      violations.push({
        code: "forbidden_mutation",
        severity: "critical",
        message: `Forbidden mutation detected: ${forbidden.slice(0, 80)}`,
        source: "story-bible",
      });
    }
  }

  for (const char of input.config.characters || []) {
    const name = [char.name, char.surname].filter(Boolean).join(" ");
    if (!name || !lower.includes(name.split(" ")[0].toLowerCase())) continue;
    for (const rule of (char.strictRules || "").split(/[.;]/).filter(Boolean)) {
      const frag = rule.trim().toLowerCase();
      if (frag.length > 8 && /\b(broke|violated|contradict|mentì|lied|betrayed)\b/i.test(lower)) {
        violations.push({
          code: "character_core_violation",
          severity: "critical",
          message: `${name}: may violate character rule — ${rule.slice(0, 60)}`,
          source: "character-core",
        });
      }
    }
    if (char.secret && lower.includes(char.secret.toLowerCase().slice(0, 20)) && input.previousChapters?.length) {
      const revealedBefore = input.previousChapters.some(ch =>
        ch.content.toLowerCase().includes(char.secret!.toLowerCase().slice(0, 20)),
      );
      if (!revealedBefore && /\b(everyone knew|tutti sapevano|obvious|ovvio)\b/i.test(lower)) {
        violations.push({
          code: "secret_premature_reveal",
          severity: "optional",
          message: `${name}: secret may be exposed without setup`,
          source: "memory",
        });
      }
    }
  }

  const brokenMemoryItems =
    input.memory?.items.filter(
      i => i.status === "BROKEN" && ["promise", "setup", "mystery", "conflict", "object"].includes(i.kind),
    ) || [];
  if (brokenMemoryItems.length) {
    for (const item of brokenMemoryItems.slice(0, 3)) {
      violations.push({
        code: "memory_broken",
        severity: "critical",
        message: `Narrative memory broken: ${item.label.slice(0, 80)}`,
        source: "memory",
      });
    }
  }

  const names = canonCharacterNames(input.config, input.blueprint);
  for (const name of names) {
    const parts = name.split(/\s+/);
    if (parts.length >= 2) {
      const reversed = `${parts[1]} ${parts[0]}`.toLowerCase();
      if (lower.includes(reversed) && !lower.includes(name.toLowerCase())) {
        violations.push({
          code: "name_drift",
          severity: "optional",
          message: `Possible name order drift for ${name}`,
          source: "character-core",
        });
      }
    }
  }

  const critical = violations.filter(v => v.severity === "critical").length;
  return {
    version: 1,
    evaluatedAt: new Date().toISOString(),
    violations,
    passesGate: critical === 0,
  };
}
