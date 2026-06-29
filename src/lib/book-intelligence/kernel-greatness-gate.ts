import type { BookConfig } from "@/types/book";
import { isDevMode } from "@/lib/dev-mode";
import {
  enrichBookKernelWithQuality,
  evaluateKernelGreatness,
  isGenericCommercialText,
  refineConceptWithBookKernel,
  resolveBookKernel,
  type BookIntelligenceKernelSnapshot,
  type KernelGreatnessReport,
} from "./book-intelligence-kernel";
import { isHorrorGothicIdentity } from "@/lib/genre/horror-gothic-identity";

export type KernelGreatnessGateStatus = "allowed" | "refined" | "blocked" | "bypassed";

export interface KernelGreatnessGateResult {
  status: KernelGreatnessGateStatus;
  allowed: boolean;
  refined: boolean;
  message: string;
  kernel: BookIntelligenceKernelSnapshot;
  conceptText: string;
  greatness: KernelGreatnessReport;
  improvements: string[];
}

function compactConceptText(config: Partial<BookConfig>, fallback = ""): string {
  return [
    config.idea,
    config.subtitle,
    (config as { promise?: string }).promise,
    (config as { plot?: string }).plot,
    fallback,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join("\n\n");
}

export function isKernelGreatnessGateBypassed(): boolean {
  try {
    if (import.meta.env.VITE_SCRIPTORA_GREATNESS_GATE === "off") return true;
    if (import.meta.env.VITE_SCRIPTORA_DEV_MODE === "true") return true;
    if (typeof window !== "undefined" && isDevMode()) return true;
  } catch {
    /* noop */
  }
  return false;
}

function buildBlockedMessage(greatness: KernelGreatnessReport): string {
  const tip = greatness.improvements[0]
    || "Aggiungi un elemento unico: luogo, simbolo, beneficio concreto o tensione emotiva precisa.";
  if (greatness.status === "reject") {
    return `Il concept è ancora troppo generico per passare al Blueprint. ${tip}`;
  }
  return `Il concept ha bisogno di più specificità prima del Blueprint. ${tip}`;
}

function shouldAttemptRefine(
  greatness: KernelGreatnessReport,
  conceptText: string,
  kernel: BookIntelligenceKernelSnapshot,
): boolean {
  if (greatness.status === "show") return false;
  const horrorIdentity = `${kernel.genre} ${kernel.subgenre} ${conceptText}`;
  if (isHorrorGothicIdentity(horrorIdentity) && greatness.scores.genreCoherence < 55) return true;
  return greatness.scores.genericityRisk >= 48
    || isGenericCommercialText(conceptText)
    || greatness.status === "improve"
    || greatness.status === "reject";
}

function isFormatDrivenExpressReady(
  kernel: BookIntelligenceKernelSnapshot,
  greatness: KernelGreatnessReport,
  conceptText: string,
): boolean {
  const readyFormats: BookIntelligenceKernelSnapshot["bookFormat"][] = [
    "memoir",
    "workbook",
    "cookbook",
    "self_help",
    "study_material",
    "poetry_collection",
  ];
  if (!readyFormats.includes(kernel.bookFormat)) return false;
  if (greatness.status === "reject") return false;
  if (conceptText.trim().length < 40) return false;
  return greatness.scores.overall >= greatness.threshold - 14;
}

function evaluateGate(
  kernel: BookIntelligenceKernelSnapshot,
  config: Partial<BookConfig>,
  conceptText: string,
): KernelGreatnessGateResult {
  const greatness = evaluateKernelGreatness({
    kernel,
    config,
    text: conceptText,
    readerPsychology: kernel.readerPsychology,
  });
  const allowed = greatness.status === "show" || isFormatDrivenExpressReady(kernel, greatness, conceptText);
  return {
    status: allowed ? "allowed" : "blocked",
    allowed,
    refined: false,
    message: allowed
      ? "Concept pronto per il Blueprint."
      : buildBlockedMessage(greatness),
    kernel,
    conceptText,
    greatness,
    improvements: greatness.improvements,
  };
}

export function enforceKernelGreatnessBeforeForge(input: {
  config: Partial<BookConfig>;
  conceptText?: string;
  allowRefine?: boolean;
}): KernelGreatnessGateResult {
  const conceptText = compactConceptText(input.config, input.conceptText || "");
  let kernel = resolveBookKernel({
    config: input.config,
    idea: conceptText,
    explicitBookFormat: input.config.bookFormat || input.config.bookTypeId || input.config.bookType,
  });
  kernel = enrichBookKernelWithQuality({ kernel, config: input.config, text: conceptText });

  if (isKernelGreatnessGateBypassed()) {
    return {
      status: "bypassed",
      allowed: true,
      refined: false,
      message: "Controllo concept disattivato in dev.",
      kernel,
      conceptText,
      greatness: kernel.greatnessScore,
      improvements: kernel.greatnessScore.improvements,
    };
  }

  let currentText = conceptText;
  let currentKernel = kernel;
  let refined = false;

  const initial = evaluateGate(currentKernel, input.config, currentText);
  if (initial.allowed) {
    return { ...initial, status: "allowed" };
  }

  if (input.allowRefine !== false && shouldAttemptRefine(initial.greatness, currentText, currentKernel)) {
    const refinedConcept = refineConceptWithBookKernel({
      kernel: currentKernel,
      config: input.config,
      text: currentText || input.config.title || "Concept",
    });
    if (refinedConcept.changed) {
      refined = true;
      currentText = refinedConcept.text;
      currentKernel = refinedConcept.kernel;
      const afterRefine = evaluateGate(currentKernel, { ...input.config, idea: currentText }, currentText);
      if (afterRefine.allowed) {
        return {
          ...afterRefine,
          status: "refined",
          refined: true,
          message: "Ho rafforzato il concept: ora possiamo procedere al Blueprint.",
        };
      }
      return { ...afterRefine, refined: true };
    }
  }

  return { ...initial, refined };
}

export function applyGreatnessGateToConfig(
  config: BookConfig,
  gate: KernelGreatnessGateResult,
): BookConfig {
  if (!gate.refined && gate.status !== "refined") {
    return {
      ...config,
      bookKernel: gate.kernel,
      readerPsychology: gate.kernel.readerPsychology,
      bookDNA: gate.kernel.bookDNA,
      greatnessScore: gate.greatness,
      publishingReadiness: gate.kernel.publishingReadiness,
    };
  }
  return {
    ...config,
    idea: gate.conceptText || config.idea,
    bookKernel: gate.kernel,
    readerPsychology: gate.kernel.readerPsychology,
    bookDNA: gate.kernel.bookDNA,
    greatnessScore: gate.greatness,
    publishingReadiness: gate.kernel.publishingReadiness,
  };
}
