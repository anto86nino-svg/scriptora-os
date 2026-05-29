import {
  applyDialogueRougheningAction,
  applyEmotionalTrimmingAction,
  applyEndingCompressionAction,
  applyPacingCompressionAction,
  applySlowBurnProtectionAction,
  computeModificationRatio,
  enforceVoiceProtection,
  runSurgicalEditEngineV1,
  validateSurgicalPatchOutput,
  SURGICAL_MAX_MODIFICATION_RATIO,
} from "@/lib/surgical-edit-engine";

export interface SurgicalHardeningAssertion {
  id: string;
  passed: boolean;
  message: string;
}

export interface SurgicalHardeningResult {
  id: string;
  label: string;
  passed: boolean;
  assertions: SurgicalHardeningAssertion[];
}

function assert(id: string, condition: boolean, message: string): SurgicalHardeningAssertion {
  return { id, passed: condition, message };
}

const FIXTURE_ROMANCE = `
"I understand your pain completely," he said. She felt devastated. She felt heartbroken again.
"I need you. I can't live without you," she whispered. Everything will be okay, he promised.
She thought about everything that had happened. Maybe nothing would ever be the same.
`;

const FIXTURE_THRILLER = `
He felt scared and overwhelmed. The silence stretched between them for a long moment.
Detective Kane understood exactly how the witness felt. "You are not alone," he said calmly.
Time seemed to slow down. Time seemed to slow down.
`;

const FIXTURE_SELF_HELP = `
You deserve better than this mindset. Everything will be okay once you commit to change.
She felt angry when she read the chapter again. She felt angry when she read it once more.
`;

export function runSurgicalVoiceProtectionTests(): SurgicalHardeningResult {
  const original = FIXTURE_ROMANCE.repeat(3);
  const result = runSurgicalEditEngineV1(original, { genre: "dark-romance" });
  const ratio = computeModificationRatio(original, result.editedText);

  const assertions = [
    assert("ratio-cap", ratio <= SURGICAL_MAX_MODIFICATION_RATIO + 0.02, `Modification ratio ${ratio.toFixed(2)} within cap`),
    assert("voice-preserved", result.voicePreserved, "Voice guard accepted or safely rejected edits"),
    assert("not-empty", result.editedText.length > 0, "Edited text non-empty"),
    assert("has-explanation", result.actionsApplied.length === 0 || result.explanations.length > 0, "Human explanations when actions apply"),
    assert("reject-overfit", enforceVoiceProtection("short.", original) === "short.", "Over-large edits rejected"),
  ];

  return { id: "voice-protection", label: "Voice Protection", passed: assertions.every((a) => a.passed), assertions };
}

export function runSurgicalActionTests(): SurgicalHardeningResult {
  const dialogue = applyDialogueRougheningAction('He said, "I understand how you feel."');
  const emotional = applyEmotionalTrimmingAction("She felt devastated and she felt heartbroken.");
  const slowBurn = applySlowBurnProtectionAction("I need you. I can't live without you.");
  const pacing = applyPacingCompressionAction("Line one.\n\nLine one.\n\nLine two.");
  const ending = applyEndingCompressionAction("She thought about everything that had happened. Maybe nothing would ever be the same.");

  const assertions = [
    assert("dialogue", dialogue.applied && !/I understand how you feel/i.test(dialogue.text), "Dialogue roughening applied"),
    assert("emotional", emotional.applied && !/felt devastated/i.test(emotional.text), "Emotional trimming applied"),
    assert("slow-burn", slowBurn.applied && /shouldn't|think|maybe/i.test(slowBurn.text), "Slow burn protection applied"),
    assert("pacing", pacing.applied, "Pacing compression applied"),
    assert("ending", ending.applied, "Ending compression applied"),
  ];

  return { id: "v1-actions", label: "V1 Surgical Actions", passed: assertions.every((a) => a.passed), assertions };
}

export function runSurgicalGenreStressTests(): SurgicalHardeningResult {
  const genres = [
    { id: "romance", text: FIXTURE_ROMANCE, genre: "dark-romance" },
    { id: "thriller", text: FIXTURE_THRILLER, genre: "thriller" },
    { id: "self-help", text: FIXTURE_SELF_HELP, genre: "self-help" },
    { id: "fantasy", text: FIXTURE_THRILLER + FIXTURE_ROMANCE, genre: "fantasy" },
  ];

  const assertions: SurgicalHardeningAssertion[] = [];

  for (const sample of genres) {
    const result = runSurgicalEditEngineV1(sample.text.repeat(2), { genre: sample.genre });
    const ratio = computeModificationRatio(sample.text.repeat(2), result.editedText);
    assertions.push(assert(`${sample.id}-cap`, ratio <= 0.26, `${sample.id} stays within modification cap`));
    assertions.push(assert(`${sample.id}-canon`, result.editedText.includes("Detective Kane") || !sample.text.includes("Detective Kane"), `${sample.id} preserves named entities when present`));
  }

  return { id: "genre-stress", label: "Genre Stress Tests", passed: assertions.every((a) => a.passed), assertions };
}

export function runSurgicalPatchValidationTests(): SurgicalHardeningResult {
  const original = FIXTURE_ROMANCE.repeat(4);
  const overPatch = original.replace("I understand your pain completely", "COMPLETELY REWRITTEN PARAGRAPH ".repeat(20));
  const validated = validateSurgicalPatchOutput(original, {
    patches: [{ idx: 0, original: original.split(/\n\s*\n/)[0] || original.slice(0, 80), patched: overPatch.slice(0, 400), type: "rewrite", reason: "test" }],
    patchedText: overPatch,
    originalText: original,
    modificationPercent: 80,
  });

  const assertions = [
    assert("patch-capped", validated.modificationPercent <= 25, `Patch output capped (${validated.modificationPercent}%)`),
    assert("patch-trimmed", validated.patches.length <= 1, "Excess patches trimmed when over cap"),
  ];

  return { id: "patch-validation", label: "Patch Output Validation", passed: assertions.every((a) => a.passed), assertions };
}

export function runSurgicalEditHardeningSuite(): SurgicalHardeningResult[] {
  return [
    runSurgicalActionTests(),
    runSurgicalVoiceProtectionTests(),
    runSurgicalGenreStressTests(),
    runSurgicalPatchValidationTests(),
  ];
}

export function summarizeSurgicalHardening(results: SurgicalHardeningResult[]) {
  const totalAssertions = results.reduce((sum, r) => sum + r.assertions.length, 0);
  const failedAssertions = results.reduce((sum, r) => sum + r.assertions.filter((a) => !a.passed).length, 0);
  return { passed: results.every((r) => r.passed), totalAssertions, failedAssertions };
}
