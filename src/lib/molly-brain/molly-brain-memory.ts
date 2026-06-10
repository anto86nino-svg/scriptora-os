import type { MollyQuickActionId } from "./types";

const STORAGE_KEY = "scriptora-molly-brain-memory-v1";

export interface MollyBrainMemory {
  acceptedActions: Partial<Record<MollyQuickActionId, number>>;
  rejectedActions: Partial<Record<MollyQuickActionId, number>>;
  prefersRealisticDialogue: boolean;
  dislikesPoeticDialogue: boolean;
  lastMemoryNote?: string;
  updatedAt: number;
}

function defaultMemory(): MollyBrainMemory {
  return {
    acceptedActions: {},
    rejectedActions: {},
    prefersRealisticDialogue: false,
    dislikesPoeticDialogue: false,
    updatedAt: Date.now(),
  };
}

export function loadMollyBrainMemory(): MollyBrainMemory {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultMemory();
    return { ...defaultMemory(), ...JSON.parse(raw) };
  } catch {
    return defaultMemory();
  }
}

export function saveMollyBrainMemory(memory: MollyBrainMemory): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...memory, updatedAt: Date.now() }));
  } catch {
    /* ignore */
  }
}

export function recordMollyActionAccepted(actionId: MollyQuickActionId, memoryNote?: string): MollyBrainMemory {
  const memory = loadMollyBrainMemory();
  memory.acceptedActions[actionId] = (memory.acceptedActions[actionId] || 0) + 1;
  if (actionId === "more_human" || actionId === "more_natural" || actionId === "more_friction") {
    memory.prefersRealisticDialogue = true;
  }
  if (actionId === "reduce_ai_feeling") {
    memory.dislikesPoeticDialogue = true;
  }
  if (memoryNote) memory.lastMemoryNote = memoryNote;
  saveMollyBrainMemory(memory);
  return memory;
}

export function recordMollyActionRejected(actionId: MollyQuickActionId): MollyBrainMemory {
  const memory = loadMollyBrainMemory();
  memory.rejectedActions[actionId] = (memory.rejectedActions[actionId] || 0) + 1;
  saveMollyBrainMemory(memory);
  return memory;
}

export function mollyMemoryAcknowledgement(memory: MollyBrainMemory): string | null {
  if (memory.prefersRealisticDialogue) {
    return "Ho mantenuto il tuo stile realistico.";
  }
  if (memory.dislikesPoeticDialogue) {
    return "Ho evitato frasi troppo perfette.";
  }
  return null;
}
