import type { GuidedInterviewState } from "./types";
import type { FinalBookReview, FinalBookReviewField } from "./forge-evolution-types";
import { buildFinalBookReview } from "./final-book-review";
import { deriveTitleIntelligence } from "./title-intelligence-engine";
import { getStoryRoom } from "./story-room-engine";
import { sanitizeDnaText } from "./dna-cleaner";
import { getForgeMemory, type ForgeInterviewMemory } from "./interview-memory";
import { isRomanceMode } from "./narrative-first-engine";

export type BlueprintEditorialField =
  | "promise"
  | "centralConflict"
  | "readerTransformation"
  | "openingHook"
  | "bookSubtitle"
  | "bookTitle"
  | "characters"
  | "chapterCount"
  | "endingDirection";

export type BlueprintSummaryField = FinalBookReviewField & {
  isFallback?: boolean;
  isMissing?: boolean;
};

export type BlueprintIntegrityHints = {
  missingSubtitle: boolean;
  missingHook: boolean;
  canProceed: boolean;
  notes: string[];
};

export type BlueprintReadySummary = FinalBookReview & {
  fields: BlueprintSummaryField[];
  integrity: BlueprintIntegrityHints;
  normalizedExtracted: Partial<GuidedInterviewState["extracted"]>;
};

const GENRE_TOKENS = new Set([
  "romanzo",
  "narrativa",
  "fiction",
  "nonfiction",
  "non fiction",
  "dark romance",
  "dark-romance",
  "romance",
  "thriller",
  "horror",
  "fantasy",
  "giallo",
  "noir",
  "poesia",
  "poetry",
  "self-help",
  "self help",
  "manuale",
  "saggio",
  "guida",
  "memoir",
  "racconti",
  "contemporary romance",
  "psychological thriller",
  "epic fantasy",
  "supernatural horror",
  "personal growth",
  "practical guide",
  "lyric poetry",
]);

const ANTI_DRIFT_RE =
  /non deviare|anti[- ]?drift|dna editoriale|preserva sempre|non tradire il dna|resta nel genere scelto|evita toni incoerenti/i;

function clean(value?: unknown): string {
  return sanitizeDnaText(value);
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isGenreToken(value: string): boolean {
  const token = normalizeToken(value);
  if (!token) return true;
  if (GENRE_TOKENS.has(token)) return true;
  if (/^[a-z]+(-[a-z]+)+$/.test(token) && token.length <= 28) return true;
  return false;
}

export function isMetadataOnly(value?: unknown): boolean {
  const text = clean(value);
  if (!text || text.length < 3) return true;
  if (ANTI_DRIFT_RE.test(text)) return true;
  if (/^dna\s*:/i.test(text)) return true;

  const bulletParts = text
    .split(/[·•|,;/]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (bulletParts.length >= 2 && bulletParts.every((part) => isGenreToken(part) || part.length <= 14)) {
    return true;
  }

  if (bulletParts.length === 1 && isGenreToken(bulletParts[0]!)) return true;

  if (
    text.length <= 48 &&
    /^(romanzo|narrativa|dark romance|thriller|horror|fantasy|poesia|manuale|self-help)/i.test(text) &&
    !/[.!?]/.test(text) &&
    text.split(/\s+/).length <= 6
  ) {
    return true;
  }

  return false;
}

function isUsableEditorial(value?: unknown, minLen = 24): boolean {
  const text = clean(value);
  return text.length >= minLen && !isMetadataOnly(text);
}

function genreLabel(memory: ForgeInterviewMemory, state: GuidedInterviewState): string {
  const ex = state.extracted ?? {};
  return clean(
    memory.slotValues.subgenre ??
      memory.slotValues.genre ??
      ex.subgenre ??
      ex.genre ??
      state.selectedGenre ??
      "romanzo",
  );
}

function toneLabel(memory: ForgeInterviewMemory, state: GuidedInterviewState): string {
  const ex = state.extracted ?? {};
  return clean(memory.slotValues.tone ?? ex.emotionalTone ?? "intenso");
}

function protagonistLabel(memory: ForgeInterviewMemory, state: GuidedInterviewState): string {
  const ex = state.extracted ?? {};
  const lead = state.characters?.find((c) => c.role === "protagonist");
  return clean(
    lead?.name && lead?.wound
      ? `${lead.name} — ${lead.wound}`
      : lead?.name ??
          memory.slotValues.protagonist ??
          ex.protagonistWound ??
          "il protagonista",
  );
}

function titleLabel(memory: ForgeInterviewMemory, state: GuidedInterviewState): string {
  const title = deriveTitleIntelligence(state);
  return clean(title.definitiveTitle ?? memory.slotValues.title ?? state.extracted?.bookTitle ?? "questo libro");
}

function isDarkRomanceContext(memory: ForgeInterviewMemory, state: GuidedInterviewState): boolean {
  const bag = [genreLabel(memory, state), toneLabel(memory, state), clean(memory.slotValues.rawIdea)].join(" ");
  return /dark.?romance|romance.*dark|romance.*oscur|romance.*pericol/i.test(bag) || isRomanceMode(memory);
}

export function buildEditorialFallbackForMissingField(
  field: BlueprintEditorialField,
  memory: ForgeInterviewMemory,
  state: GuidedInterviewState,
): string {
  const genre = genreLabel(memory, state);
  const tone = toneLabel(memory, state);
  const protagonist = protagonistLabel(memory, state);
  const title = titleLabel(memory, state);
  const darkRomance = isDarkRomanceContext(memory, state);
  const ending = clean(memory.slotValues.endingDirection ?? state.extracted?.narrativeDrive);
  const stakes = clean(memory.slotValues.stakes ?? state.extracted?.centralConflict);

  switch (field) {
    case "promise":
      if (darkRomance) {
        return "Un dark romance claustrofobico dove colpa, desiderio e redenzione sporca si confondono, finché amare qualcuno significa scegliere se bruciare con lui o salvarsi dalle sue fiamme.";
      }
      if (/thriller|noir|giallo|crime/i.test(genre)) {
        return `Un ${genre} ad alta tensione dove ogni verità nascosta aumenta il prezzo da pagare — e il lettore non può smettere di chiedersi chi mente davvero.`;
      }
      if (/self-help|manuale|guida/i.test(genre)) {
        return `Un percorso pratico e umano che promette al lettore un cambiamento concreto, non teoria vuota — passo dopo passo, con esempi applicabili.`;
      }
      return `Un ${genre} ${tone} che promette al lettore un'esperienza memorabile: tensione emotiva, payoff chiaro e una storia che resta addosso dopo l'ultima pagina.`;

    case "centralConflict":
      if (darkRomance) {
        return "Il protagonista cerca espiazione attraverso il controllo, ma l'amore lo costringe a riaprire la ferita che aveva trasformato in potere.";
      }
      if (/thriller|noir|giallo|crime/i.test(genre)) {
        return `${protagonist} deve inseguire la verità mentre ogni risposta rivela che la minaccia più pericolosa è ciò che aveva deciso di non vedere.`;
      }
      return `${protagonist} è costretto a scegliere tra ciò che desidera e ciò che teme di perdere — e ogni decisione rende il conflitto più irreversibile.`;

    case "readerTransformation":
      if (darkRomance) {
        return "Da anima divorata dalla colpa a persona costretta a scegliere se usare l'amore come punizione o come ultima possibilità di redenzione.";
      }
      if (/thriller|noir|giallo|crime/i.test(genre)) {
        return "Da osservatore che crede di controllare la situazione a persona costretta a riconoscere quanto poco conosceva la verità — e quanto costa guardarla in faccia.";
      }
      return `Da ${protagonist.split("—")[0]?.trim() || "chi credeva di avere tutto sotto controllo"} a figura trasformata dal conflitto centrale — più vulnerabile, più lucida, più pericolosa.`;

    case "openingHook":
      if (darkRomance) {
        return `Amare ${title} non era mai stato sicuro — ma scoprire che il desiderio può essere la forma più elegante della autodistruzione cambia tutto.`;
      }
      return `${title}: una storia ${tone} dove la prima pagina promette ciò che l'ultima pagina farà pagare caro.`;

    case "bookSubtitle":
      if (darkRomance) {
        return "Quando il desiderio diventa colpa, e la redenzione ha il sapore del fuoco.";
      }
      return `Un ${genre} ${tone} — la promessa che il lettore non dimenticherà facilmente.`;

    case "bookTitle":
      return title.length >= 3 ? title : "Titolo provvisorio";

    case "characters":
      return protagonist;

    case "chapterCount":
      return clean(memory.slotValues.chapterCount) || "12 capitoli · ritmo equilibrato";

    case "endingDirection":
      if (ending && !isMetadataOnly(ending)) return ending;
      if (darkRomance) return "Finale devastante ma giusto — redenzione possibile solo attraverso una scelta che brucia qualcosa per sempre.";
      return stakes
        ? `Finale coerente con la posta in gioco: ${stakes.slice(0, 80)}…`
        : "Finale che chiude la promessa emotiva senza tradire il tono del libro.";

    default:
      return "";
  }
}

function resolveEditorialField(
  field: BlueprintEditorialField,
  candidates: Array<string | undefined>,
  memory: ForgeInterviewMemory,
  state: GuidedInterviewState,
  minLen = 24,
): { value: string; isFallback: boolean } {
  for (const candidate of candidates) {
    if (isUsableEditorial(candidate, minLen)) {
      return { value: clean(candidate), isFallback: false };
    }
  }
  return {
    value: buildEditorialFallbackForMissingField(field, memory, state),
    isFallback: true,
  };
}

function buildCharactersLine(state: GuidedInterviewState, memory: ForgeInterviewMemory): string {
  const lead = state.characters?.find((c) => c.role === "protagonist");
  const villain = state.characters?.find((c) => c.role === "antagonist");
  if (lead?.name) {
    const line = `${lead.name}${villain?.name ? ` vs ${villain.name}` : ""}${lead.arc ? ` — ${lead.arc}` : ""}`;
    if (!isMetadataOnly(line)) return line;
  }
  const resolved = resolveEditorialField(
    "characters",
    [
      clean(memory.slotValues.protagonist),
      state.extracted?.protagonistWound,
      clean(memory.slotValues.loveInterest),
      clean(memory.slotValues.antagonist),
    ],
    memory,
    state,
    8,
  );
  return resolved.value;
}

export function buildBlueprintReadySummary(state: GuidedInterviewState): BlueprintReadySummary {
  const memory = getForgeMemory(state);
  const ex = state.extracted ?? {};
  const titleIntel = deriveTitleIntelligence(state);
  const storyRoom = getStoryRoom(state);
  const base = buildFinalBookReview(state);

  const promiseResolved = resolveEditorialField(
    "promise",
    [
      titleIntel.commercialPromise,
      clean(memory.slotValues.promise),
      ex.promise,
      state.bookPromises?.emotional?.[0],
      state.bookPromises?.plot?.[0],
    ],
    memory,
    state,
  );

  const conflictResolved = resolveEditorialField(
    "centralConflict",
    [
      clean(memory.slotValues.centralConflict),
      ex.centralConflict,
      clean(memory.slotValues.stakes),
      storyRoom.scenes.find((s) => s.role === "crisis")?.beat,
    ],
    memory,
    state,
  );

  const transformationResolved = resolveEditorialField(
    "readerTransformation",
    [
      ex.readerTransformation,
      state.characters?.find((c) => c.role === "protagonist")?.arc,
      storyRoom.arcBeats.map((b) => b.change).find(Boolean),
      state.storyFuture?.lastPageFeeling,
    ],
    memory,
    state,
  );

  const hookResolved = resolveEditorialField(
    "openingHook",
    [titleIntel.commercialHook, ex.openingHook],
    memory,
    state,
    18,
  );
  if (!isUsableEditorial(titleIntel.commercialHook ?? ex.openingHook, 18)) {
    const fallbackHook = buildEditorialFallbackForMissingField("openingHook", memory, state);
    if (!hookResolved.isFallback) {
      hookResolved.value = fallbackHook;
      hookResolved.isFallback = true;
    }
  }

  const hasUserHook =
    isUsableEditorial(titleIntel.commercialHook ?? ex.openingHook, 18) && !hookResolved.isFallback;

  const subtitleRaw = clean(titleIntel.subtitle ?? ex.bookSubtitle);
  const subtitleResolved =
    subtitleRaw && !isMetadataOnly(subtitleRaw)
      ? { value: subtitleRaw, isFallback: false }
      : { value: "", isFallback: true };

  const endingResolved = resolveEditorialField(
    "endingDirection",
    [
      clean(memory.slotValues.endingDirection),
      ex.narrativeDrive,
      state.canon?.ending.facts?.[0],
      storyRoom.ending?.readerFeeling,
      storyRoom.ending?.tone,
    ],
    memory,
    state,
    16,
  );

  const charactersLine = buildCharactersLine(state, memory);
  const genre = genreLabel(memory, state);
  const subgenre = clean(memory.slotValues.subgenre ?? ex.subgenre ?? state.inferredProfile?.subgenre);
  const targetReader = isMetadataOnly(ex.targetReader)
    ? clean(memory.slotValues.audience) || "Lettori del genere che cercano intensità e payoff emotivo."
    : clean(ex.targetReader ?? memory.slotValues.audience);

  const review: BlueprintReadySummary = {
    ...base,
    title: clean(titleIntel.definitiveTitle ?? ex.bookTitle ?? base.title),
    subtitle: subtitleResolved.value,
    genre: isMetadataOnly(base.genre) ? genre : base.genre,
    subgenre: isMetadataOnly(base.subgenre) ? subgenre : base.subgenre,
    targetReader,
    promise: promiseResolved.value,
    conflict: conflictResolved.value,
    transformation: transformationResolved.value,
    characters: charactersLine,
    ending: endingResolved.value,
    commercialHook: hookResolved.value,
    fields: [],
    integrity: {
      missingSubtitle: !subtitleResolved.value,
      missingHook: !hasUserHook,
      canProceed: true,
      notes: [],
    },
    normalizedExtracted: {
      bookTitle: clean(titleIntel.definitiveTitle ?? ex.bookTitle),
      bookSubtitle: subtitleResolved.value || undefined,
      promise: promiseResolved.value,
      centralConflict: conflictResolved.value,
      readerTransformation: transformationResolved.value,
      openingHook: hookResolved.isFallback ? undefined : hookResolved.value,
      targetReader,
      genre: genre || ex.genre,
      subgenre: subgenre || ex.subgenre,
      narrativeDrive: endingResolved.value,
    },
  };

  if (review.integrity.missingSubtitle) {
    review.integrity.notes.push("Manca un sottotitolo commerciale.");
  }
  if (review.integrity.missingHook) {
    review.integrity.notes.push(
      hookResolved.isFallback
        ? "Manca un hook commerciale forte — ne ho suggerito uno."
        : "Manca un hook commerciale forte.",
    );
  }

  const fieldDefs: BlueprintSummaryField[] = [
    { label: "Titolo", value: review.title, key: "bookTitle" },
    { label: "Sottotitolo", value: review.subtitle || "—", key: "bookSubtitle", isMissing: review.integrity.missingSubtitle },
    { label: "Lingua", value: review.language, key: "language" },
    { label: "Genere", value: review.genre, key: "genre" },
    { label: "Sottogenere", value: review.subgenre, key: "subgenre" },
    { label: "Lettore ideale", value: review.targetReader, key: "targetReader" },
    { label: "Promessa", value: review.promise, key: "promise", isFallback: promiseResolved.isFallback },
    { label: "Conflitto", value: review.conflict, key: "centralConflict", isFallback: conflictResolved.isFallback },
    { label: "Trasformazione", value: review.transformation, key: "readerTransformation", isFallback: transformationResolved.isFallback },
    { label: "Personaggi", value: review.characters, key: "protagonist" },
    { label: "Finale", value: review.ending, key: "endingDirection", isFallback: endingResolved.isFallback },
    { label: "Struttura", value: review.chapters, key: "chapterCount" },
    { label: "Hook commerciale", value: review.commercialHook, key: "openingHook", isFallback: hookResolved.isFallback, isMissing: review.integrity.missingHook },
  ];

  review.fields = fieldDefs.filter((f) => f.value && f.value !== "—");
  return review;
}

export function applyBlueprintReadySummaryToState(
  state: GuidedInterviewState,
  summary?: BlueprintReadySummary,
): GuidedInterviewState {
  const resolved = summary ?? buildBlueprintReadySummary(state);
  const memory = getForgeMemory(state);
  const nextMemory = {
    ...memory,
    slotValues: { ...memory.slotValues },
    answeredSlots: { ...memory.answeredSlots },
  };

  if (resolved.promise) {
    nextMemory.slotValues.promise = resolved.promise;
    nextMemory.answeredSlots.promise = true;
  }
  if (resolved.conflict) {
    nextMemory.slotValues.centralConflict = resolved.conflict;
    nextMemory.answeredSlots.centralConflict = true;
  }
  if (resolved.ending) {
    nextMemory.slotValues.endingDirection = resolved.ending;
    nextMemory.answeredSlots.endingDirection = true;
  }
  if (resolved.subtitle) {
    nextMemory.slotValues.subtitle = resolved.subtitle;
    nextMemory.answeredSlots.subtitle = true;
  }
  if (resolved.commercialHook) {
    nextMemory.slotValues.title = resolved.title;
  }

  return {
    ...state,
    extracted: {
      ...state.extracted,
      ...resolved.normalizedExtracted,
      promise: resolved.promise,
      centralConflict: resolved.conflict,
      readerTransformation: resolved.transformation,
      openingHook: resolved.commercialHook,
      bookSubtitle: resolved.subtitle || state.extracted?.bookSubtitle,
      bookTitle: resolved.title,
      narrativeDrive: resolved.ending,
    },
    titleIntelligence: {
      ...state.titleIntelligence,
      definitiveTitle: resolved.title,
      subtitle: resolved.subtitle || state.titleIntelligence?.subtitle,
      commercialHook: resolved.commercialHook,
      commercialPromise: resolved.promise,
      workingTitle: resolved.title,
    },
    forgeMemory: nextMemory,
  };
}
