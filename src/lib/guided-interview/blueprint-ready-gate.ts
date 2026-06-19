import type { GuidedInterviewState, InterviewQuestion } from "./types";
import { evaluateForgeReadiness } from "./forge-readiness";
import {
  getCriticalMissingSlots,
  getForgeMemory,
  getMemoryStageProgress,
  presetQuestionForSlot,
} from "./interview-memory";
import type { ForgeSlotKey } from "./interview-memory";
import {
  getStoryRoomMachine,
  isStoryRoomBlueprintReady,
  slotsForCurrentStage,
} from "./story-room-state-machine";
import {
  BOOK_FOUNDATION_ASSISTANT_MESSAGE,
  BOOK_FOUNDATION_MISSING_MESSAGE,
  isBookFoundationLocked,
  isBookFoundationComplete,
} from "./book-foundation-lock";

export const BLUEPRINT_READY_ASSISTANT_MESSAGE =
  "Perfetto. Ho abbastanza materiale per costruire il blueprint. Ti mostro la sintesi finale: puoi confermare, correggere una parte o generare il blueprint.";

export type BlueprintGateStatus = {
  isBlueprintReady: boolean;
  shouldStopQuestions: boolean;
  canShowConfirmation: boolean;
  needsFoundationLock: boolean;
  foundationComplete: boolean;
  progressLabel: string;
  stagePercent: number;
  currentStageId: string;
  missingCritical: string[];
  assistantMessage: string;
};

export function getBlueprintGateStatus(
  state: GuidedInterviewState,
  opts?: { allowRefine?: boolean },
): BlueprintGateStatus {
  const memory = getForgeMemory(state);
  const machine = getStoryRoomMachine(memory);
  const stageProgress = getMemoryStageProgress(memory);
  const forgeReady = evaluateForgeReadiness(state);
  const missingSlots = getCriticalMissingSlots(memory);

  const storyRoomReady =
    stageProgress.percent >= 100 ||
    isStoryRoomBlueprintReady(memory) ||
    machine.currentStageId === "blueprintReady";

  const foundationComplete =
    !storyRoomReady && !state.bookFoundation
      ? false
      : isBookFoundationComplete(state);
  const foundationLocked = isBookFoundationLocked(state);
  const needsFoundationLock = storyRoomReady && !foundationLocked;

  const isBlueprintReady = storyRoomReady && foundationLocked;

  const allowRefine = opts?.allowRefine ?? Boolean(state.forgeRefineMode);
  const shouldStopQuestions = (storyRoomReady || isBlueprintReady) && !allowRefine;

  const progressLabel = isBlueprintReady
    ? "100% · pronto per blueprint"
    : needsFoundationLock
      ? "Fondamenta · conferma titolo, personaggi e hook"
      : stageProgress.percent >= 100 || storyRoomReady
        ? `${stageProgress.percent}% · fondamenta`
        : `${stageProgress.percent}%`;

  const assistantMessage = needsFoundationLock
    ? foundationComplete
      ? BOOK_FOUNDATION_ASSISTANT_MESSAGE
      : BOOK_FOUNDATION_MISSING_MESSAGE
    : BLUEPRINT_READY_ASSISTANT_MESSAGE;

  return {
    isBlueprintReady,
    shouldStopQuestions,
    canShowConfirmation: isBlueprintReady && (forgeReady.canShowConfirmation || missingSlots.length <= 1),
    needsFoundationLock,
    foundationComplete,
    progressLabel,
    stagePercent: stageProgress.percent,
    currentStageId: machine.currentStageId,
    missingCritical: missingSlots.slice(0, 3),
    assistantMessage,
  };
}

export function shouldBlockNarrativeQuestions(state: GuidedInterviewState): boolean {
  return getBlueprintGateStatus(state).shouldStopQuestions;
}

let lastTargetedQuestionSlot: ForgeSlotKey | null = null;

export function getSingleTargetedMissingQuestion(
  state: GuidedInterviewState,
): InterviewQuestion | null {
  const memory = getForgeMemory(state);
  const gate = getBlueprintGateStatus(state);
  if (!gate.isBlueprintReady) return null;
  if (gate.currentStageId === "blueprintReady") {
    lastTargetedQuestionSlot = null;
    return null;
  }

  const stageSlots = slotsForCurrentStage(memory);
  if (!stageSlots.length) {
    lastTargetedQuestionSlot = null;
    return null;
  }

  const slot = stageSlots[0];
  if (lastTargetedQuestionSlot === slot && state.forgeRefineMode) {
    return null;
  }
  lastTargetedQuestionSlot = slot;

  const preset = presetQuestionForSlot(slot, memory);
  if (!preset) return null;

  return {
    ...preset,
    id: `blueprint-gap-${slot}`,
    helper: `Ho quasi tutto, ma manca ancora: ${slot}. Una risposta mirata e passiamo al blueprint.`,
  };
}

export function resetBlueprintTargetedQuestion(): void {
  lastTargetedQuestionSlot = null;
}
