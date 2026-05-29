import type { AuthorIdentity, BookConfig } from "@/types/book";
import { applyAuthorIdentityToConfig, enforceAuthorIdentityLock, resolveAuthorIdentity } from "@/lib/author-identity";
import {
  buildAuthorBrainInjectionSnapshot,
  buildAboutAuthorInjection,
  buildFollowAuthorInjection,
  buildOtherBooksInjection,
  isSameBookTitle,
} from "./injection";
import { hasPassiveAuthorIntelligence, resolvePassiveAuthorTone } from "./passive-intelligence";
import {
  PASSIVE_CONSISTENCY_FLOOR,
  PASSIVE_CONSISTENCY_SOFT,
  signalConsistencyScore,
  validateAuthorBrainExportBlock,
} from "./hardening";

export interface AuthorBrainHardeningAssertion {
  id: string;
  passed: boolean;
  message: string;
}

export interface AuthorBrainHardeningResult {
  id: string;
  label: string;
  passed: boolean;
  assertions: AuthorBrainHardeningAssertion[];
}

function assert(id: string, condition: boolean, message: string): AuthorBrainHardeningAssertion {
  return { id, passed: condition, message };
}

function baseConfig(identity: AuthorIdentity, title = "Current Novel"): BookConfig {
  return applyAuthorIdentityToConfig(
    {
      title,
      subtitle: "",
      language: "English",
      genre: "literary-fiction",
      category: "Fiction",
      chapterLength: "medium",
      numberOfChapters: 12,
      tone: "literary",
      audience: "Adults",
      authorStyle: "Cinematic",
    },
    identity,
  );
}

const COHERENT_IDENTITY: AuthorIdentity = {
  id: "hardening-coherent",
  name: "Coherent Author",
  penName: "Elena Hart",
  copyrightName: "Elena Hart",
  biography: "Elena Hart writes character-driven fiction with emotional precision.",
  authorPresence: ["emotional", "psychological", "premium"],
  readerEmotionalGoals: ["healing", "reflection"],
  authorMessage: "Readers should feel seen, not lectured.",
  publishedBooks: [
    { id: "b1", title: "Previous Novel", genre: "Literary", description: "A prior work.", links: { amazon: "https://amazon.example/prev" } },
  ],
  authorPlatform: { website: "https://elenahart.example" },
  language: "English",
};

const CONFLICTING_IDENTITY: AuthorIdentity = {
  id: "hardening-conflict",
  name: "Conflict Author",
  penName: "Alex Cross",
  copyrightName: "Alex Cross",
  biography: "Alex Cross explores contrast and tension in modern life.",
  authorPresence: ["minimalist", "poetic", "provocative", "dark", "spiritual", "professional", "intense"],
  readerEmotionalGoals: ["comfort", "obsession", "healing", "tension", "mystery", "empowerment"],
  authorMessage: "Corporate stakeholder synergy and enterprise ROI for B2B readers.",
  language: "English",
};

const EMPTY_IDENTITY: AuthorIdentity = {
  id: "hardening-empty",
  name: "Empty Author",
  penName: "No Bio Yet",
  copyrightName: "No Bio Yet",
  language: "English",
};

export function runSignalConsistencyTests(): AuthorBrainHardeningResult {
  const coherent = signalConsistencyScore(COHERENT_IDENTITY);
  const conflict = signalConsistencyScore(CONFLICTING_IDENTITY);
  const empty = signalConsistencyScore(EMPTY_IDENTITY);

  const coherentTone = resolvePassiveAuthorTone(COHERENT_IDENTITY);
  const conflictTone = resolvePassiveAuthorTone(CONFLICTING_IDENTITY);

  const assertions = [
    assert("coherent-high", coherent >= 0.75, `Coherent profile score ${coherent.toFixed(2)} >= 0.75`),
    assert("conflict-low", conflict < PASSIVE_CONSISTENCY_SOFT, `Conflicting profile score ${conflict.toFixed(2)} < ${PASSIVE_CONSISTENCY_SOFT}`),
    assert("conflict-damped", !conflictTone.hasSignal || conflict >= PASSIVE_CONSISTENCY_FLOOR, "Conflicting profile damped or neutralized"),
    assert("empty-neutral", empty === 1, "Empty voice memory scores as neutral-safe"),
    assert("coherent-signal", coherentTone.hasSignal, "Coherent profile retains passive signal"),
    assert("conflict-not-all-axes", !(conflictTone.warmth !== "neutral" && conflictTone.clarity !== "neutral" && conflictTone.depth !== "neutral" && conflictTone.energy !== "neutral"), "Conflicting profile never activates all tone axes"),
  ];

  return {
    id: "signal-consistency",
    label: "Signal Conflict Engine",
    passed: assertions.every((a) => a.passed),
    assertions,
  };
}

export function runEmptyPartialProfileTests(): AuthorBrainHardeningResult {
  const emptySnapshot = buildAuthorBrainInjectionSnapshot(baseConfig(EMPTY_IDENTITY));
  const bioOnly: AuthorIdentity = { ...EMPTY_IDENTITY, id: "bio-only", biography: "Writes quiet literary fiction." };
  const linksOnly: AuthorIdentity = {
    ...EMPTY_IDENTITY,
    id: "links-only",
    penName: "Link Author",
    authorPlatform: { instagram: "https://instagram.example/author" },
  };
  const goalsOnly: AuthorIdentity = {
    ...EMPTY_IDENTITY,
    id: "goals-only",
    readerEmotionalGoals: ["hope"],
  };

  const assertions = [
    assert("empty-no-about", emptySnapshot.aboutAuthor === "", "Empty profile produces no About the Author block"),
    assert("empty-no-other", emptySnapshot.otherBooks === "", "Empty profile produces no Other Books block"),
    assert("empty-no-follow", emptySnapshot.followAuthor === "", "Empty profile produces no Follow block"),
    assert("bio-only-about", buildAboutAuthorInjection(bioOnly).includes("quiet literary"), "Biography-only profile injects bio only"),
    assert("bio-only-no-follow", buildFollowAuthorInjection({ identity: bioOnly }) === "", "Biography-only profile skips Follow"),
    assert("links-only-follow", buildFollowAuthorInjection({ identity: linksOnly }).includes("instagram.example"), "Links-only profile produces Follow block"),
    assert("links-only-no-about", buildAboutAuthorInjection(linksOnly) === "", "Links-only profile skips About"),
    assert("goals-no-passive", !hasPassiveAuthorIntelligence(goalsOnly), "Single emotional goal alone does not force passive intelligence"),
  ];

  return {
    id: "empty-partial",
    label: "Empty / Partial Profile Safety",
    passed: assertions.every((a) => a.passed),
    assertions,
  };
}

export function runMultiAuthorIsolationTests(): AuthorBrainHardeningResult {
  const antonino = resolveAuthorIdentity(null, "builtin-scriptora-cinematic")!;
  const livia = resolveAuthorIdentity(null, "builtin-dark-romance")!;
  const verdi = resolveAuthorIdentity(null, "builtin-clear-nonfiction")!;

  const bookA = enforceAuthorIdentityLock(baseConfig(antonino, "Antonino Book"));
  const bookB = enforceAuthorIdentityLock(baseConfig(livia, "Livia Book"));
  const bookC = enforceAuthorIdentityLock(baseConfig(verdi, "Verdi Book"));

  const snapA = buildAuthorBrainInjectionSnapshot(bookA);
  const snapB = buildAuthorBrainInjectionSnapshot(bookB);
  const snapC = buildAuthorBrainInjectionSnapshot(bookC);

  const assertions = [
    assert("a-pen", snapA.aboutAuthor.includes("Scriptora Studio") || bookA.authorName === "Scriptora Studio", "Author A uses Antonino pen name"),
    assert("b-pen", snapB.aboutAuthor.includes("Livia Noir") || bookB.authorName === "Livia Noir", "Author B uses Livia pen name"),
    assert("c-pen", snapC.aboutAuthor.includes("A. Verdi") || bookC.authorName === "A. Verdi", "Author C uses Verdi pen name"),
    assert("no-bleed-ab", !snapA.aboutAuthor.includes("Livia Noir") && !snapA.aboutAuthor.includes("A. Verdi"), "Author A bio has no B/C bleed"),
    assert("no-bleed-ba", !snapB.aboutAuthor.includes("Scriptora Studio") && !snapB.aboutAuthor.includes("A. Verdi"), "Author B bio has no A/C bleed"),
    assert("no-bleed-cb", !snapC.aboutAuthor.includes("Livia Noir") && !snapC.aboutAuthor.includes("Scriptora Studio"), "Author C bio has no A/B bleed"),
    assert("lock-a", bookA.authorIdentityLock?.identityId === antonino.id, "Author A lock preserved"),
    assert("lock-b", bookB.authorIdentityLock?.identityId === livia.id, "Author B lock preserved"),
    assert("lock-c", bookC.authorIdentityLock?.identityId === verdi.id, "Author C lock preserved"),
  ];

  return {
    id: "multi-author",
    label: "Multi-Author Isolation",
    passed: assertions.every((a) => a.passed),
    assertions,
  };
}

export function runExportSafetyTests(): AuthorBrainHardeningResult {
  const identity: AuthorIdentity = {
    ...COHERENT_IDENTITY,
    publishedBooks: [
      { id: "b1", title: "Current Novel", genre: "Literary", description: "Same title test.", links: {} },
      { id: "b2", title: "Previous Novel", genre: "Literary", description: "Prior work.", links: { amazon: "https://amazon.example/prev" } },
    ],
  };

  const otherBooks = buildOtherBooksInjection({
    identity,
    currentBookTitle: "Current Novel",
    language: "English",
  });

  const duplicateHeading = validateAuthorBrainExportBlock(
    "Other Books by Elena Hart\n\nOther Books by Elena Hart\n\n• Book One",
    "Elena Hart",
  );
  const headingCount = duplicateHeading.split("Other Books by Elena Hart").length - 1;

  const assertions = [
    assert("exclude-current", !otherBooks.includes("Same title test"), "Current book excluded from Other Books catalogue"),
    assert("include-prior", otherBooks.includes("Previous Novel"), "Prior book retained in Other Books"),
    assert("links-present", otherBooks.includes("amazon.example"), "Book links preserved in export block"),
    assert("no-triple-newline", !otherBooks.includes("\n\n\n"), "No triple newlines in export block"),
    assert("dedupe-heading", headingCount <= 1, `Duplicate headings collapsed (${headingCount} found in: ${JSON.stringify(duplicateHeading)})`),
    assert("same-title-helper", isSameBookTitle("Current Novel", "current novel"), "Title exclusion helper is case-insensitive"),
  ];

  return {
    id: "export-safety",
    label: "Export Safety",
    passed: assertions.every((a) => a.passed),
    assertions,
  };
}

export function runOverPersonalizationGuardTests(): AuthorBrainHardeningResult {
  const emotionalOnly: AuthorIdentity = {
    id: "emotional-only",
    name: "One Chip",
    penName: "Solo Emotion",
    copyrightName: "Solo Emotion",
    authorPresence: ["emotional"],
    biography: "A deeply emotional and profoundly moving author of transformative journeys.",
  };

  const tone = resolvePassiveAuthorTone(emotionalOnly);
  const cleaned = buildAboutAuthorInjection(emotionalOnly);

  const assertions = [
    assert("single-chip-neutral-axes", tone.warmth === "neutral" && tone.clarity === "neutral", "Single presence chip keeps axes neutral"),
    assert("cliche-stripped", !/deeply emotional|profoundly moving|transformative journeys/i.test(cleaned), "Over-fit adjectives stripped from About block"),
    assert("no-directive-only-emotional", !tone.directive || tone.warmth !== "warm", "Single emotional chip does not force warm cadence"),
  ];

  return {
    id: "over-personalization",
    label: "Over-Personalization Guardrails",
    passed: assertions.every((a) => a.passed),
    assertions,
  };
}

export function runAuthorBrainHardeningSuite(): AuthorBrainHardeningResult[] {
  return [
    runSignalConsistencyTests(),
    runEmptyPartialProfileTests(),
    runMultiAuthorIsolationTests(),
    runExportSafetyTests(),
    runOverPersonalizationGuardTests(),
  ];
}

export function summarizeAuthorBrainHardening(results: AuthorBrainHardeningResult[]): {
  passed: boolean;
  totalAssertions: number;
  failedAssertions: number;
} {
  const totalAssertions = results.reduce((sum, r) => sum + r.assertions.length, 0);
  const failedAssertions = results.reduce(
    (sum, r) => sum + r.assertions.filter((a) => !a.passed).length,
    0,
  );
  return {
    passed: results.every((r) => r.passed),
    totalAssertions,
    failedAssertions,
  };
}
