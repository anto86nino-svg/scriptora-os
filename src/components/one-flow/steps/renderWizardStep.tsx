import type { ReactNode } from "react";

export function renderWizardStep(
  step: number,
  renderers: Record<number, ReactNode>,
) {
  return renderers[step] ?? null;
}
