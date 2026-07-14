import type { AuthorIdentity, BookConfig } from "@/types/book";
import { isUserAuthorIdentityConfigured } from "@/lib/author-identity";
import { inferGenreFromText, type GenreInference } from "./genre-inference";
import { validateConfigCoherence } from "@/lib/book-config-engine";
import { wizardInferenceForAutofill } from "@/lib/book-forge/genre-lock-wizard";
import {
  shouldBlockAutofillGenreMutation,
  stripGenreFieldsFromAutofillPatch,
} from "@/lib/book-forge/genre-priority";
import {
  NARRATIVE_BLUEPRINT_BLOCKED_MESSAGE,
  type BookForgeWizardState,
  isNarrativeReadyForBlueprint,
} from "@/lib/book-forge/step-completion";

export type PreflightIssue = {
  id: string;
  field: string;
  message: string;
  humanHint: string;
  autoFillable: boolean;
};

export type BlueprintPreflightResult = {
  ready: boolean;
  issues: PreflightIssue[];
  humanSummary: string;
};

function hasText(value: unknown, min = 2): boolean {
  return String(value || "").trim().length >= min;
}

export function runBlueprintPreflight(
  config: BookConfig,
  authorIdentity?: AuthorIdentity | null,
  narrativeState?: BookForgeWizardState,
): BlueprintPreflightResult {
  const issues: PreflightIssue[] = [];
  const identity = authorIdentity || config.authorIdentity || null;

  if (narrativeState && !isNarrativeReadyForBlueprint(narrativeState)) {
    return {
      ready: false,
      issues: [{
        id: "narrative",
        field: "narrative",
        message: NARRATIVE_BLUEPRINT_BLOCKED_MESSAGE,
        humanHint: "Completa protagonista, conflitto, obiettivo e struttura nello step Narrativa.",
        autoFillable: true,
      }],
      humanSummary: NARRATIVE_BLUEPRINT_BLOCKED_MESSAGE,
    };
  }

  if (!hasText(config.title) || config.title === "Romanzo senza titolo") {
    issues.push({
      id: "title",
      field: "title",
      message: "Titolo mancante",
      humanHint: "Prima serve un titolo commerciale: posso suggerirlo dal DNA della tua idea.",
      autoFillable: true,
    });
  }

  if (!config.language) {
    issues.push({
      id: "language",
      field: "language",
      message: "Lingua non impostata",
      humanHint: "Scegli la lingua del libro: serve per tono, mercato e blueprint.",
      autoFillable: false,
    });
  }

  if (!hasText(config.genre)) {
    issues.push({
      id: "genre",
      field: "genre",
      message: "Genere mancante",
      humanHint: "Mi manca il genere per costruire il blueprint. Posso dedurlo dal titolo.",
      autoFillable: true,
    });
  }

  if (!hasText(config.category)) {
    issues.push({
      id: "category",
      field: "category",
      message: "Categoria mancante",
      humanHint: "La categoria Amazon deve essere coerente col filone del libro.",
      autoFillable: true,
    });
  }

  if (!hasText(config.subcategory)) {
    issues.push({
      id: "subcategory",
      field: "subcategory",
      message: "Sottocategoria mancante",
      humanHint: "Aggiungiamo un sottogenere preciso: rende il blueprint molto più forte.",
      autoFillable: true,
    });
  }

  if (!hasText(config.tone, 8)) {
    issues.push({
      id: "tone",
      field: "tone",
      message: "Tono editoriale mancante",
      humanHint: "Il tono guida voce, ritmo e atmosfera di ogni capitolo.",
      autoFillable: true,
    });
  }

  if (!hasText(config.targetReader, 12)) {
    issues.push({
      id: "targetReader",
      field: "targetReader",
      message: "Pubblico ideale mancante",
      humanHint: "Manca il pubblico ideale: posso suggerirlo io dal titolo e dal genere.",
      autoFillable: true,
    });
  }

  const ideaHay = `${config.idea || ""} ${config.subtitle || ""}`.toLowerCase();
  if (!hasText(ideaHay, 20) && !hasText(config.subtitle, 8)) {
    issues.push({
      id: "promise",
      field: "narrativePromise",
      message: "Promessa editoriale debole",
      humanHint: "Serve almeno una promessa o un'idea: cosa promette il libro al lettore?",
      autoFillable: true,
    });
  }

  if (!config.numberOfChapters || config.numberOfChapters < 1) {
    issues.push({
      id: "chapters",
      field: "numberOfChapters",
      message: "Struttura capitoli mancante",
      humanHint: "Impostiamo quanti capitoli servono per questo filone.",
      autoFillable: true,
    });
  }

  const identityOk = isUserAuthorIdentityConfigured(identity)
    || (hasText(identity?.penName || config.authorName, 2)
      && hasText(identity?.biography, 12)
      && hasText(identity?.voice, 8));

  if (!identityOk) {
    issues.push({
      id: "identity",
      field: "authorIdentity",
      message: "Identità autore incompleta",
      humanHint: "Completa pen name, bio e voce narrativa: il blueprint ne ha bisogno.",
      autoFillable: false,
    });
  }

  const coherence = validateConfigCoherence(config);
  if (coherence.needsCorrection && coherence.overall < 65) {
    issues.push({
      id: "coherence",
      field: "coherence",
      message: "Configurazione incoerente",
      humanHint: coherence.dimensions.flatMap((d) => d.issues)[0]
        || "Titolo, genere e categoria non sono allineati. Correggiamo prima di generare.",
      autoFillable: true,
    });
  }

  const ready = issues.length === 0;
  const issueLabels = issues.map((issue) => issue.message || issue.field).filter(Boolean);
  const humanSummary = ready
    ? "Tutto pronto: possiamo generare il blueprint."
    : issueLabels.length === 1
      ? `Per generare il Blueprint manca: ${issueLabels[0]}.`
      : `Per generare il Blueprint mancano: ${issueLabels.join(", ")}.`;

  return { ready, issues, humanSummary };
}

export type WizardAutofillPatch = {
  title?: string;
  subtitle?: string;
  bookTypeId?: string;
  genre?: BookConfig["genre"];
  category?: string;
  subcategory?: string;
  subgenre?: string;
  tone?: string;
  targetReader?: string;
  narrativePromise?: string;
  commercialGoal?: string;
  chapters?: number;
  idea?: string;
  coreConflict?: string;
  setting?: string;
  openingHook?: string;
};

export function buildWizardAutofillPatch(
  config: BookConfig,
  inference: GenreInference,
  extras?: {
    narrativePromise?: string;
    commercialGoal?: string;
    coreConflict?: string;
    setting?: string;
    openingHook?: string;
    genreManuallyLocked?: boolean;
    genreDetectionAccepted?: boolean;
  },
): WizardAutofillPatch {
  const dominantInference = wizardInferenceForAutofill(
    {
      title: config.title,
      idea: config.idea,
      genre: config.genre,
      subgenre: config.subgenre,
      bookTypeId: config.bookTypeId,
      category: config.category,
      subcategory: config.subcategory,
      bookFormat: config.bookFormat,
    },
    extras?.genreManuallyLocked ?? false,
  );
  const locked = {
    ...inference,
    ...dominantInference,
    genre: dominantInference.genre || inference.genre,
    bookTypeId: dominantInference.bookTypeId || inference.bookTypeId,
    category: dominantInference.category || inference.category,
    subcategory: dominantInference.subcategory || inference.subcategory,
    subgenre: dominantInference.subgenre || inference.subgenre,
    bookFormat: dominantInference.bookFormat || inference.bookFormat,
  };

  const patch: WizardAutofillPatch = {};

  if (!hasText(config.title) || config.title === "Romanzo senza titolo") {
    /* title left to magical generator */
  }
  const genreLocked = shouldBlockAutofillGenreMutation({
    genreManuallyLocked: extras?.genreManuallyLocked,
    genreDetectionAccepted: extras?.genreDetectionAccepted,
  });

  if (!genreLocked) {
    if (!hasText(config.genre)) patch.genre = locked.genre;
    if (!hasText(config.category)) patch.category = locked.category;
    if (!hasText(config.subcategory)) patch.subcategory = locked.subcategory;
    if (!hasText(config.subgenre)) patch.subgenre = locked.subgenre;
    patch.bookTypeId = locked.bookTypeId;
  }

  if (!hasText(config.tone, 8)) patch.tone = locked.tone;
  if (!hasText(config.targetReader, 12)) patch.targetReader = locked.targetReader;
  if (!config.numberOfChapters) patch.chapters = locked.suggestedChapters;

  const promiseMissing = !hasText(config.idea, 20) && !hasText(config.subtitle, 8);
  if (promiseMissing) {
    patch.narrativePromise = extras?.narrativePromise || locked.narrativePromise;
    patch.commercialGoal = extras?.commercialGoal || locked.commercialGoal;
    if (!hasText(config.subtitle, 8)) patch.subtitle = locked.narrativePromise.slice(0, 90);
  }

  return stripGenreFieldsFromAutofillPatch(patch, {
    genreManuallyLocked: extras?.genreManuallyLocked,
    genreDetectionAccepted: extras?.genreDetectionAccepted,
  });
}

export function humanizeBlueprintError(error: unknown, config: BookConfig): string {
  const raw = error instanceof Error ? error.message : String(error || "");

  console.error("🚨 BLUEPRINT HUMANIZER");
  console.error("RAW ERROR:", error);
  console.error("MESSAGE:", raw);

  const validationErrors =
    (error as any)?.errors ||
    (error as any)?.details ||
    [];

  if (Array.isArray(validationErrors) && validationErrors.length) {
    console.error("VALIDATION ERRORS:", validationErrors);

    return `Blueprint non completato: ${validationErrors
      .slice(0, 3)
      .join(" • ")}`;
  }
  const lower = raw.toLowerCase();

  if (/genre|category|config|undefined|null|missing|invalid/i.test(lower)) {
    const inference = inferGenreFromText(config.title, config.idea);
    if (/self.?help|mindset/i.test(`${config.category} ${config.subcategory}`) && inference.level1 === "romanzo") {
      return "Il progetto ha un titolo narrativo ma categoria Self-help. Correggiamo prima di continuare.";
    }
    return "Mi mancano dati coerenti per il blueprint. Posso completarli automaticamente dal titolo.";
  }
  if (/author|identity|pen/i.test(lower)) {
    return "Completa identità autore (nome, bio, voce) prima di generare il blueprint.";
  }
  if (/title/i.test(lower)) {
    return "Serve un titolo commerciale prima di generare il blueprint.";
  }
  const cleaned =
    raw
      ?.replace(/^error:\s*/i, "")
      ?.replace(/^blueprint/i, "")
      ?.trim();

  return cleaned && cleaned.length > 8
    ? `Blueprint non completato: ${cleaned}`
    : "Blueprint non completato. Uno o più step potrebbero essere incompleti o incoerenti.";
}
