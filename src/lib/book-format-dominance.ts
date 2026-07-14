type FormatProfile = {
  format: string;
  bookTypeId: string;
  genre: string;
  family: string;
  brain: string;
  blueprintType: string;
  forbiddenGenres?: string[];
};

export type DominanceSource =
  | "bookFormat"
  | "bookTypeId"
  | "family"
  | "genre"
  | "subgenre"
  | "marketing"
  | "none";

export type DominantFormatResolution = {
  dominantFormat: string | null;
  source: DominanceSource;
  profile: FormatProfile | null;
};

type DominanceInput = {
  bookFormat?: string;
  bookTypeId?: string;
  family?: string;
  genre?: string;
  subgenre?: string;
  subcategory?: string;
  category?: string;
  brain?: string;
  blueprintType?: string;
  marketingLabels?: string[] | string;
  /** When true, author selection is absolute — never override format/genre from inference. */
  authorFormatLocked?: boolean;
};

type MutableShape = DominanceInput & Record<string, unknown>;

const PRESERVED_FICTION_GENRES = [
  "fantasy",
  "horror",
  "thriller",
  "romance",
  "dark-romance",
  "sci-fi",
  "historical",
  "mystery",
  "narrativa",
];

function isPreservedFictionGenre(genre?: string): boolean {
  const g = normalize(genre || "");
  if (!g) return false;
  return PRESERVED_FICTION_GENRES.some((item) => g.includes(item));
}

const FORMAT_PROFILES: Record<string, FormatProfile> = {
  cookbook: {
    format: "cookbook",
    bookTypeId: "cookbook",
    genre: "cookbook",
    family: "cookbook",
    brain: "cookbook-brain",
    blueprintType: "CookbookBlueprint",
    forbiddenGenres: ["philosophy", "literary-fiction", "psychology", "novel", "dark-romance", "memoir"],
  },
  workbook: {
    format: "workbook",
    bookTypeId: "manual",
    genre: "manual",
    family: "workbook",
    brain: "workbook-brain",
    blueprintType: "WorkbookBlueprint",
  },
  manual: {
    format: "manual",
    bookTypeId: "manual",
    genre: "manual",
    family: "manual",
    brain: "manual-brain",
    blueprintType: "GuideBlueprint",
  },
  study_material: {
    format: "study_material",
    bookTypeId: "education",
    genre: "education",
    family: "study_material",
    brain: "study-material-brain",
    blueprintType: "StudyBlueprint",
  },
  poetry_collection: {
    format: "poetry_collection",
    bookTypeId: "poetry",
    genre: "poetry",
    family: "poetry",
    brain: "poetry-brain",
    blueprintType: "PoetryBlueprint",
    forbiddenGenres: ["romance", "horror", "fantasy", "thriller", "novel", "narrativa", "dark-romance", "sci-fi"],
  },
  memoir: {
    format: "memoir",
    bookTypeId: "memoir",
    genre: "memoir",
    family: "memoir",
    brain: "memoir-brain",
    blueprintType: "MemoirBlueprint",
  },
  self_help: {
    format: "self_help",
    bookTypeId: "self-help",
    genre: "self-help",
    family: "self_help",
    brain: "self-help-brain",
    blueprintType: "GuideBlueprint",
    forbiddenGenres: ["romance", "horror", "fantasy", "thriller", "novel", "narrativa", "dark-romance", "sci-fi", "mystery"],
  },
  novel: {
    format: "novel",
    bookTypeId: "literary",
    genre: "philosophy",
    family: "novel",
    brain: "narrative-brain",
    blueprintType: "NarrativeBlueprint",
  },
};

function normalize(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function inferFormatFromBookTypeId(bookTypeId?: string): string | null {
  const id = normalize(bookTypeId);
  if (!id) return null;
  if (id.includes("cookbook")) return "cookbook";
  if (id === "manual") return "manual";
  if (id.includes("education")) return "study_material";
  if (id === "poetry") return "poetry_collection";
  if (id === "memoir") return "memoir";
  if (id === "self-help" || id === "mindset" || id === "coaching" || id === "productivity") return "self_help";
  if (id.includes("workbook")) return "workbook";
  if (
    id.includes("romance") ||
    id.includes("thriller") ||
    id.includes("horror") ||
    id.includes("fantasy") ||
    id.includes("literary")
  ) {
    return "novel";
  }
  return null;
}

function inferFormatFromGenreLike(text: string): string | null {
  if (!text) return null;
  if (/cookbook|ricettario|ricette|cucina/.test(text)) return "cookbook";
  if (/workbook|schede|tracker/.test(text)) return "workbook";
  if (/study_material|materiale di studio|quiz|flashcard/.test(text)) return "study_material";
  if (/poetry_collection|raccolta poetica|poesia|poesie/.test(text)) return "poetry_collection";
  if (/memoir|autobiografia|memorie/.test(text)) return "memoir";
  if (/self-help|self help|crescita personale/.test(text)) return "self_help";
  if (/manuale|manual|guida pratica/.test(text)) return "manual";
  if (/romanzo|novel|narrativa|horror|thriller|romance|fantasy/.test(text)) return "novel";
  return null;
}

function inferFormatFromMarketing(marketingLabels?: string[] | string): string | null {
  const text = Array.isArray(marketingLabels) ? marketingLabels.join(" ") : String(marketingLabels || "");
  return inferFormatFromGenreLike(normalize(text));
}

export function resolveDominantFormat(input: DominanceInput): DominantFormatResolution {
  const byFormat = normalize(input.bookFormat);
  if (byFormat && FORMAT_PROFILES[byFormat]) {
    return { dominantFormat: byFormat, source: "bookFormat", profile: FORMAT_PROFILES[byFormat] };
  }

  const byBookTypeId = inferFormatFromBookTypeId(input.bookTypeId);
  if (byBookTypeId && FORMAT_PROFILES[byBookTypeId]) {
    return { dominantFormat: byBookTypeId, source: "bookTypeId", profile: FORMAT_PROFILES[byBookTypeId] };
  }

  const byFamily = inferFormatFromGenreLike(normalize(input.family));
  if (byFamily && FORMAT_PROFILES[byFamily]) {
    return { dominantFormat: byFamily, source: "family", profile: FORMAT_PROFILES[byFamily] };
  }

  const byGenre = inferFormatFromGenreLike(
    normalize([input.genre, input.subgenre, input.subcategory, input.category].filter(Boolean).join(" ")),
  );
  if (byGenre && FORMAT_PROFILES[byGenre]) {
    return { dominantFormat: byGenre, source: input.genre ? "genre" : "subgenre", profile: FORMAT_PROFILES[byGenre] };
  }

  const byMarketing = inferFormatFromMarketing(input.marketingLabels);
  if (byMarketing && FORMAT_PROFILES[byMarketing]) {
    return { dominantFormat: byMarketing, source: "marketing", profile: FORMAT_PROFILES[byMarketing] };
  }

  return { dominantFormat: null, source: "none", profile: null };
}

export function applyFormatDominance<T extends MutableShape>(input: T): T & DominanceInput {
  const resolved = resolveDominantFormat(input);
  if (!resolved.profile) return input as T & DominanceInput;

  const next = { ...input } as T & DominanceInput;
  const profile = resolved.profile;
  const existingGenre = normalize(next.genre);
  const authorLocked = Boolean(input.authorFormatLocked);

  next.bookFormat = profile.format as T["bookFormat"];

  if (!next.bookTypeId || authorLocked) {
    if (!authorLocked || !next.bookTypeId) {
      next.bookTypeId = profile.bookTypeId as T["bookTypeId"];
    }
  }

  const isForbiddenGenre =
    profile.forbiddenGenres?.some((forbidden) => existingGenre.includes(normalize(forbidden))) ?? false;

  const shouldPreserveGenre = authorLocked || isPreservedFictionGenre(existingGenre);
  if ((!existingGenre || isForbiddenGenre || resolved.source !== "genre") && !shouldPreserveGenre) {
    next.genre = profile.genre as T["genre"];
  }

  if (!authorLocked) {
    next.family = profile.family as T["family"];
    next.brain = profile.brain as T["brain"];
    next.blueprintType = profile.blueprintType as T["blueprintType"];
  } else if (!next.family) {
    next.family = profile.family as T["family"];
    next.brain = profile.brain as T["brain"];
    next.blueprintType = profile.blueprintType as T["blueprintType"];
  }

  return next;
}

export function assertFormatIntegrity(input: DominanceInput): { ok: boolean; errors: string[] } {
  const resolved = resolveDominantFormat(input);
  if (!resolved.profile) return { ok: true, errors: [] };

  const errors: string[] = [];
  const profile = resolved.profile;
  const genre = normalize(input.genre);
  const subgenre = normalize(input.subgenre);
  const stack = `${genre} ${subgenre}`.trim();

  if (profile.forbiddenGenres) {
    for (const forbidden of profile.forbiddenGenres) {
      if (stack.includes(normalize(forbidden))) {
        errors.push(`Formato ${profile.format} incompatibile con genere ${forbidden}.`);
      }
    }
  }

  if (profile.format === "cookbook" && /philosophy|literary-fiction|psychology|novel|dark romance|memoir|protagonist|antagonist|romance|horror|fantasy/.test(stack)) {
    errors.push("Cookbook lock violato: rilevata deriva narrativa/filosofica.");
  }

  if (profile.format === "poetry_collection" && /romance|horror|fantasy|thriller|novel|narrativa|protagonist|antagonist|worldbuilding/.test(stack)) {
    errors.push("Raccolta poetica: elementi narrativi/fiction non ammessi.");
  }

  if (profile.format === "self_help" && /romance|horror|fantasy|thriller|novel|narrativa|protagonist|antagonist|worldbuilding/.test(stack)) {
    errors.push("Self Help: elementi narrativi/fiction non ammessi.");
  }

  return { ok: errors.length === 0, errors };
}
