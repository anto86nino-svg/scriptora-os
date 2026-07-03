/**
 * Book Forge V2 — per-step completion gates.
 * A step is complete when the author filled fields, Scriptora generated content, or both.
 */

export type BookForgeWizardState = {
  language: string;
  bookTypeId: string;
  genre: string;
  subgenre: string;
  idea: string;
  title: string;
  targetReader: string;
  tone: string;
  subtitle: string;
  authorName: string;
  identityBasicsOk: boolean;
  pov: string;
  chapters: number;
  bookLength: string;
  structureType: string;
  narrativePromise: string;
  coreConflict: string;
  setting: string;
  openingHook: string;
  protagonist: string;
  shouldUseCharacterForge: boolean;
  hasNamedCharacter: boolean;
  canonRules: string;
  forbiddenContent: string;
  validationIssueCount: number;
  commercialGoal: string;
  shortDescription: string;
  blueprintPreview: boolean;
  narrativeAutoApproved?: boolean;
  foundationsConfirmed?: boolean;
  skipFoundationsStep?: boolean;
};

function hasText(value: string | undefined, min = 1): boolean {
  return String(value || "").trim().length >= min;
}

function isNarrativeStructureComplete(state: BookForgeWizardState): boolean {
  if (state.narrativeAutoApproved) return true;

  const hasProtagonist = hasText(state.protagonist, 2) || state.hasNamedCharacter;
  const hasConflict = hasText(state.coreConflict, 8);
  const hasObjective = hasText(state.narrativePromise, 8) || hasText(state.commercialGoal, 8);

  if (!state.shouldUseCharacterForge) {
    return hasConflict && hasObjective;
  }

  return hasProtagonist && hasConflict && hasObjective;
}

export function isNarrativeReadyForBlueprint(state: BookForgeWizardState): boolean {
  if (!hasText(state.genre)) return false;
  if (!state.chapters || state.chapters < 1) return false;
  if (!hasText(state.structureType) && !hasText(state.bookLength)) return false;
  if (!isNarrativeStructureComplete(state)) return false;
  if (state.shouldUseCharacterForge) {
    return hasText(state.protagonist, 2) || state.hasNamedCharacter;
  }
  return true;
}

export const NARRATIVE_BLUEPRINT_BLOCKED_MESSAGE = "Blueprint bloccato: narrativa incompleta.";
export const WRITER_BLOCKED_MESSAGE = "Completa Book Forge prima di iniziare la scrittura.";
export const NARRATIVE_STEP_BLOCKED_MESSAGE = "Completa la struttura narrativa prima di procedere.";

export function canOpenWriter(state: BookForgeWizardState): { ok: boolean; message: string } {
  if (!canAdvanceToStep(8, state)) {
    return { ok: false, message: WRITER_BLOCKED_MESSAGE };
  }
  if (!state.blueprintPreview) {
    return { ok: false, message: WRITER_BLOCKED_MESSAGE };
  }
  return { ok: true, message: "" };
}

export function isStepComplete(step: number, state: BookForgeWizardState): boolean {
  switch (step) {
    case 0:
      return (
        hasText(state.language)
        && (state.skipFoundationsStep || state.foundationsConfirmed)
        && hasText(state.bookTypeId)
        && hasText(state.genre)
        && (hasText(state.idea, 20) || hasText(state.title, 3))
      );
    case 1:
      return (
        hasText(state.title, 3)
        && hasText(state.authorName, 2)
        && (hasText(state.targetReader, 12) || hasText(state.tone, 8))
      );
    case 2:
      return state.chapters >= 1 && hasText(state.bookLength);
    case 3:
      return isNarrativeStructureComplete(state);
    case 4:
      return true;
    case 5:
      return state.validationIssueCount === 0;
    case 6:
      return true;
    case 7:
      return state.blueprintPreview;
    default:
      return false;
  }
}

export function canAdvanceToStep(targetStep: number, state: BookForgeWizardState): boolean {
  if (targetStep <= 0) return true;
  const lastRequired = Math.min(targetStep - 1, 7);
  for (let s = 0; s <= lastRequired; s += 1) {
    if (!isStepComplete(s, state)) return false;
  }
  return true;
}

export function stepCompletionHint(step: number, state: BookForgeWizardState): string | null {
  if (isStepComplete(step, state)) return null;
  switch (step) {
    case 0:
      if (!state.skipFoundationsStep && !state.foundationsConfirmed) {
        return "Conferma formato e genere nelle fondamenta del libro.";
      }
      if (!hasText(state.idea, 20) && !hasText(state.title, 3)) {
        return "Scrivi l'idea del libro (almeno 20 caratteri) oppure genera un titolo di partenza.";
      }
      if (!hasText(state.genre)) return "Seleziona il genere del libro.";
      return "Conferma formato, lingua e genere.";
    case 1:
      if (!hasText(state.title, 3)) return "Serve un titolo reale — scrivilo o genera proposte.";
      if (!hasText(state.authorName, 2)) return "Indica il nome autore in copertina.";
      return "Completa pubblico ideale o tono editoriale — scrivi tu o chiedi a Scriptora.";
    case 2:
      return "Imposta lunghezza e numero di capitoli.";
    case 3:
      return NARRATIVE_STEP_BLOCKED_MESSAGE;
    case 5:
      return "Risolvi i campi mancanti nella validazione prima di procedere.";
    case 7:
      return "Genera e rivedi il blueprint prima di approvare.";
    default:
      return "Completa questo step prima di andare avanti.";
  }
}
