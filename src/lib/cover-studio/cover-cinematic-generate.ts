export const CINEMATIC_GENERATE_STEPS = [
  { id: "analyze", durationMs: 700, it: "Analizzo bestseller del genere…", en: "Analyzing genre bestsellers…" },
  { id: "thumbnail", durationMs: 650, it: "Bilancio leggibilità thumbnail Amazon…", en: "Balancing Amazon thumbnail readability…" },
  { id: "hierarchy", durationMs: 700, it: "Costruisco gerarchia visiva…", en: "Building visual hierarchy…" },
  { id: "atmosphere", durationMs: 750, it: "Creo atmosfera editoriale…", en: "Crafting editorial atmosphere…" },
  { id: "reveal", durationMs: 400, it: "Reveal cover…", en: "Revealing cover…" },
] as const;

export function getCinematicStepLabel(stepId: string, italian = true): string {
  const step = CINEMATIC_GENERATE_STEPS.find((s) => s.id === stepId);
  if (!step) return italian ? "Generazione…" : "Generating…";
  return italian ? step.it : step.en;
}

export async function runCinematicGenerateSequence(
  onStep: (stepId: string, progress: number) => void,
  runGenerate: () => void | Promise<void>,
): Promise<void> {
  let elapsed = 0;
  const total = CINEMATIC_GENERATE_STEPS.reduce((s, st) => s + st.durationMs, 0);

  for (const step of CINEMATIC_GENERATE_STEPS) {
    if (step.id === "reveal") {
      await runGenerate();
    }
    onStep(step.id, Math.min(100, Math.round((elapsed / total) * 100)));
    await sleep(step.durationMs);
    elapsed += step.durationMs;
    onStep(step.id, Math.min(100, Math.round((elapsed / total) * 100)));
  }
  onStep("done", 100);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
