import type { GuidedInterviewState, InterviewQuestion } from "./types";
import type { ForgeInterviewMemory, ForgeSlotKey } from "./interview-memory";
import { isSlotFilled } from "./interview-memory";
import { inferBookProfileFromText } from "./dna-inference";

export const SLOT_CONFIRM_PREFIX = "confirm-deduced-";

const CONFIRM_YES = /^(sì|si|yes|confermo|ok|esatto|corretto|va bene|perfetto)/i;
const CONFIRM_NO = /^(no|nope|correggo|sbagliato|non è|errato)/i;

const SLOT_LABELS: Partial<Record<ForgeSlotKey, string>> = {
  language: "lingua del libro",
  authorName: "nome autore / pen name",
  genre: "genere",
  bookType: "tipo di libro",
  subgenre: "sottogenere",
  tone: "tono",
  audience: "pubblico ideale",
  promise: "promessa del libro",
  marketplace: "marketplace principale",
  chapterCount: "numero di capitoli",
  protagonist: "protagonista",
  centralConflict: "conflitto centrale",
};

function parseLanguage(text: string): string | undefined {
  const t = text.toLowerCase();
  if (/\bitalian[oa]?|italiano\b/.test(t)) return "Italiano";
  if (/\benglish|inglese|in inglese\b/.test(t)) return "English";
  if (/\bespañol|spagnol[oa]\b/.test(t)) return "Español";
  if (/\bfrançais|frances[ei]\b/.test(t)) return "Français";
  if (/\bdeutsch|tedesc[oa]\b/.test(t)) return "Deutsch";
  return undefined;
}

function parseMarketplace(text: string): string | undefined {
  const t = text.toLowerCase();
  if (/amazon|kdp|kindle/.test(t)) return "Amazon KDP";
  if (/libreria|editore|tradizionale/.test(t)) return "Libreria tradizionale o editore";
  if (/audio|audiolibro|podcast/.test(t)) return "Audiolibro o adattamento audio";
  if (/universit|studio|accadem/.test(t)) return "Studio personale o università";
  return undefined;
}

function parseAuthorName(text: string): string | undefined {
  const match = text.match(
    /(?:pen name|pseudonimo|firmerò come|pubblico come|autore[:\s]+)\s*([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){0,3})/i,
  );
  return match?.[1]?.trim();
}

function activeSlotForQuestion(
  activeQuestion?: Pick<InterviewQuestion, "id" | "key">,
): ForgeSlotKey | null {
  if (!activeQuestion) return null;
  const map: Record<string, ForgeSlotKey> = {
    language: "language",
    authorName: "authorName",
    genre: "genre",
    bookType: "bookType",
    emotionalTone: "tone",
    targetReader: "audience",
    promise: "promise",
    bookTitle: "title",
    marketplace: "marketplace",
    frontMatter: "frontMatter",
    backMatter: "backMatter",
    subchaptersPreference: "subchaptersEnabled",
  };
  if (activeQuestion.id.startsWith(SLOT_CONFIRM_PREFIX)) {
    return activeQuestion.id.slice(SLOT_CONFIRM_PREFIX.length) as ForgeSlotKey;
  }
  return map[activeQuestion.key] ?? null;
}

export function collectDeducedSlots(
  state: GuidedInterviewState,
  userAnswer: string,
  activeQuestion?: Pick<InterviewQuestion, "id" | "key">,
): Partial<Record<ForgeSlotKey, string>> {
  const deduced: Partial<Record<ForgeSlotKey, string>> = {};
  const activeSlot = activeSlotForQuestion(activeQuestion);

  const language = parseLanguage(userAnswer);
  if (language && activeSlot !== "language") deduced.language = language;

  const marketplace = parseMarketplace(userAnswer);
  if (marketplace && activeSlot !== "marketplace") deduced.marketplace = marketplace;

  const author = parseAuthorName(userAnswer);
  if (author && activeSlot !== "authorName") deduced.authorName = author;

  const inference = inferBookProfileFromText(
    [...state.messages.filter((m) => m.role === "user").map((m) => m.content), userAnswer].join("\n"),
    state.extracted ?? {},
  );
  if (inference.genre && activeSlot !== "genre") deduced.genre = inference.genre;
  if (inference.bookType && activeSlot !== "bookType") deduced.bookType = inference.bookType;
  if (inference.subgenre && activeSlot !== "subgenre") deduced.subgenre = inference.subgenre;

  return deduced;
}

export function queueDeducedSlotConfirmations(
  memory: ForgeInterviewMemory,
  deduced: Partial<Record<ForgeSlotKey, string>>,
): ForgeInterviewMemory {
  const pending = { ...(memory.pendingSlotConfirmations ?? {}) };
  for (const [slot, value] of Object.entries(deduced) as Array<[ForgeSlotKey, string]>) {
    if (!value?.trim()) continue;
    if (isSlotFilled(memory, slot)) continue;
    pending[slot] = value.trim();
  }
  return { ...memory, pendingSlotConfirmations: pending };
}

export function isSlotConfirmationQuestion(questionId: string): boolean {
  return questionId.startsWith(SLOT_CONFIRM_PREFIX);
}

export function buildSlotConfirmationQuestion(
  slot: ForgeSlotKey,
  value: string,
): InterviewQuestion {
  const label = SLOT_LABELS[slot] ?? slot;
  return {
    id: `${SLOT_CONFIRM_PREFIX}${slot}`,
    key: slot,
    question: `Ho capito che ${label} è «${value}» — confermi?`,
    helper: "Un tap e lo salvo. Se non è corretto, correggi liberamente.",
    quickSuggestions: [
      { label: "Sì, confermo", value: `Sì, confermo: ${value}` },
      { label: "No, correggo", value: "No, correggo — non è questo." },
    ],
    placeholder: `Scrivi il valore corretto per ${label}…`,
  };
}

export function selectNextSlotConfirmationQuestion(
  memory: ForgeInterviewMemory,
): InterviewQuestion | null {
  const pending = memory.pendingSlotConfirmations ?? {};
  for (const slot of Object.keys(pending) as ForgeSlotKey[]) {
    const value = pending[slot];
    if (!value || isSlotFilled(memory, slot)) continue;
    const questionId = `${SLOT_CONFIRM_PREFIX}${slot}`;
    if (memory.askedQuestionKeys.includes(questionId)) continue;
    return buildSlotConfirmationQuestion(slot, value);
  }
  return null;
}

export function resolveSlotConfirmationAnswer(
  activeQuestion: Pick<InterviewQuestion, "id" | "key">,
  userAnswer: string,
  memory: ForgeInterviewMemory,
): { slot: ForgeSlotKey; value: string | null; reject: boolean } | null {
  if (!isSlotConfirmationQuestion(activeQuestion.id)) return null;
  const slot = activeQuestion.id.slice(SLOT_CONFIRM_PREFIX.length) as ForgeSlotKey;
  const pending = memory.pendingSlotConfirmations?.[slot];
  const text = userAnswer.trim();

  if (CONFIRM_NO.test(text)) {
    return { slot, value: null, reject: true };
  }
  if (CONFIRM_YES.test(text) && pending) {
    return { slot, value: pending, reject: false };
  }
  if (text.length >= 2) {
    const stripped = text.replace(/^sì,?\s*confermo:?\s*/i, "").trim();
    return { slot, value: stripped || text, reject: false };
  }
  return null;
}

export function clearPendingSlotConfirmation(
  memory: ForgeInterviewMemory,
  slot: ForgeSlotKey,
): ForgeInterviewMemory {
  const pending = { ...(memory.pendingSlotConfirmations ?? {}) };
  delete pending[slot];
  return { ...memory, pendingSlotConfirmations: pending };
}

export function seedAuthorIdentityConfirmation(
  memory: ForgeInterviewMemory,
  penName?: string | null,
  authorName?: string | null,
): ForgeInterviewMemory {
  const name = penName?.trim() || authorName?.trim();
  if (!name || isSlotFilled(memory, "authorName")) return memory;
  return queueDeducedSlotConfirmations(memory, { authorName: name });
}
