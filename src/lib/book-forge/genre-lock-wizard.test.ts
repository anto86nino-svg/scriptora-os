import { describe, expect, it } from "vitest";
import { analyzeLongIdeaForProposal, detectGenreWithConfidence } from "./auto-detection-engine";
import {
  assertWizardGenreIntegrity,
  buildDominantAutoDetectionProposal,
  resolveWizardGenreInference,
} from "./genre-lock-wizard";
import { shouldBlockCloudGenreMutation } from "./genre-priority";

const SPOSTATI_IDEA =
  "Romanzo contemporaneo emozionale con amore maturo, destino, memoria e scelte irreversibili tra due persone che si ritrovano dopo anni.";

const COOKBOOK_IDEA =
  "Libro ricette cucina mediterranea tradizionale con ingredienti stagionali, tecniche base e menu settimanali per famiglie.";

const HORROR_0317_IDEA =
  "Ogni notte alle 03:17 una stazione ferroviaria abbandonata compare per sette minuti tra due gallerie inesistenti.";

const ELIAS_IDEA =
  "Elias, la porta nel cuore, ricordi di una donna vissuta mille anni, data della fine del mondo";

const THRILLER_PSICO_IDEA =
  "Thriller psicologico su un detective ossessionato da ricordi che non sono suoi, indagini notturne e identità spezzate.";

const POETRY_IDEA =
  "Raccolta poetica di frammenti lirici sulla memoria, il silenzio e la verità interiore con voce autentica e margini.";

const DARK_FANTASY_IDEA =
  "Dark fantasy gotico: un cavaliere maledetto attraversa un regno di ombre dove ogni promessa ha un prezzo di sangue.";

const IDEA_10_WORDS = "Un uomo riceve lettere misteriose ogni notte alle tre";
const IDEA_20_WORDS =
  "Un uomo riceve lettere dal futuro che predicono eventi terribili nella sua città ogni notte alle tre senza spiegazione plausibile";
const IDEA_ONE_SENTENCE = "Un uomo riceve lettere dal futuro";

function expectCleanGenre(idea: string, proposal: NonNullable<ReturnType<typeof buildDominantAutoDetectionProposal>>) {
  const integrity = assertWizardGenreIntegrity(idea, proposal);
  expect(integrity.ok, integrity.errors.join("; ")).toBe(true);
  expect(proposal.genre).toBeTruthy();
  expect(proposal.bookTypeId).toBeTruthy();
}

describe("book forge wizard genre lock", () => {
  it("detects Literary Romance for Spostati-style idea — not fantasy or philosophy label", () => {
    const proposal = buildDominantAutoDetectionProposal(SPOSTATI_IDEA, {
      title: "Spostati di un secondo",
    });
    expect(proposal).not.toBeNull();
    expect(proposal!.detectedLabel).toMatch(/Literary Romance/i);
    expect(proposal!.genre).not.toBe("fantasy");
    expect(proposal!.bookFormat).toBe("novel");
    expectCleanGenre(SPOSTATI_IDEA, proposal!);
  });

  it("keeps cookbook on mediterranean recipes — never literary fiction", () => {
    const proposal = buildDominantAutoDetectionProposal(COOKBOOK_IDEA);
    expect(proposal).not.toBeNull();
    expect(proposal!.bookFormat).toBe("cookbook");
    expect(proposal!.genre).toBe("cookbook");
    expect(proposal!.detectedLabel.toLowerCase()).not.toMatch(/literary fiction|philosophy/);
    expectCleanGenre(COOKBOOK_IDEA, proposal!);
  });

  it("keeps 03:17 horror station on horror — not romance", () => {
    const proposal = buildDominantAutoDetectionProposal(HORROR_0317_IDEA, { title: "Ogni notte 03:17" });
    expect(proposal).not.toBeNull();
    expect(["horror", "thriller"]).toContain(proposal!.genre);
    expect(proposal!.detectedLabel.toLowerCase()).not.toMatch(/romance/);
    expectCleanGenre(HORROR_0317_IDEA, proposal!);
  });

  it("keeps Elias on fantasy — not sci-fi without ice-city signals", () => {
    const proposal = buildDominantAutoDetectionProposal(ELIAS_IDEA, { title: "Elias" });
    expect(proposal).not.toBeNull();
    expect(proposal!.genre).toBe("fantasy");
    expect(proposal!.detectedLabel.toLowerCase()).toMatch(/fantasy/i);
    expectCleanGenre(ELIAS_IDEA, proposal!);
  });

  it("keeps thriller psicologico on thriller stack", () => {
    const proposal = buildDominantAutoDetectionProposal(THRILLER_PSICO_IDEA, { title: "Thriller Psicologico" });
    expect(proposal).not.toBeNull();
    expect(proposal!.genre).toBe("thriller");
    expectCleanGenre(THRILLER_PSICO_IDEA, proposal!);
  });

  it("keeps raccolta poetica on poetry format", () => {
    const proposal = buildDominantAutoDetectionProposal(POETRY_IDEA, { title: "Raccolta Poetica" });
    expect(proposal).not.toBeNull();
    expect(["poetry", "philosophy"]).toContain(proposal!.genre);
    expect(proposal!.bookFormat).toBeTruthy();
    expectCleanGenre(POETRY_IDEA, proposal!);
  });

  it("keeps dark fantasy on fantasy or horror — not cookbook or romance drift", () => {
    const proposal = buildDominantAutoDetectionProposal(DARK_FANTASY_IDEA, { title: "Dark Fantasy" });
    expect(proposal).not.toBeNull();
    expect(["fantasy", "horror"]).toContain(proposal!.genre);
    expect(proposal!.detectedLabel.toLowerCase()).toMatch(/fantasy|horror|dark/i);
    expectCleanGenre(DARK_FANTASY_IDEA, proposal!);
  });

  it("detects short 10-word ideas with ranked confidence", () => {
    const hypotheses = detectGenreWithConfidence(IDEA_10_WORDS);
    expect(hypotheses.length).toBeGreaterThanOrEqual(1);
    const result = analyzeLongIdeaForProposal(IDEA_10_WORDS);
    expect(result.isShortIdea).toBe(true);
    expect(result.shouldPropose).toBe(true);
  });

  it("detects 20-word ideas without skipping", () => {
    expect(IDEA_20_WORDS.split(/\s+/).filter(Boolean).length).toBeGreaterThanOrEqual(20);
    const result = analyzeLongIdeaForProposal(IDEA_20_WORDS);
    expect(result.shouldPropose).toBe(true);
    expect(result.proposal?.genre).toBeTruthy();
  });

  it("detects one-sentence ideas with confidence ranking", () => {
    const hypotheses = detectGenreWithConfidence(IDEA_ONE_SENTENCE);
    expect(hypotheses.length).toBeGreaterThanOrEqual(2);
    const result = analyzeLongIdeaForProposal(IDEA_ONE_SENTENCE);
    expect(result.shouldPropose).toBe(true);
    expect(result.proposal?.genre).toBeTruthy();
  });

  it("respects manual genre lock during inference", () => {
    const locked = resolveWizardGenreInference("Titolo", COOKBOOK_IDEA, {
      genre: "cookbook",
      bookTypeId: "cookbook",
      genreManuallyLocked: true,
    });
    expect(locked.genre).toBe("cookbook");
    expect(locked.bookFormat).toBe("cookbook");
  });

  it("blocks cloud genre mutation when manual lock or pending detection", () => {
    expect(shouldBlockCloudGenreMutation({ genreManuallyLocked: true })).toBe(true);
    expect(shouldBlockCloudGenreMutation({ genreDetectionAccepted: true })).toBe(true);
    expect(shouldBlockCloudGenreMutation({ hasPendingAutoDetection: true })).toBe(true);
    expect(shouldBlockCloudGenreMutation({})).toBe(false);
  });

  it("proposes via auto-detection engine with detectedLabel", () => {
    const result = analyzeLongIdeaForProposal(SPOSTATI_IDEA, { title: "Spostati di un secondo" });
    expect(result.shouldPropose).toBe(true);
    expect(result.proposal?.detectedLabel).toMatch(/Literary Romance/i);
    expect(result.proposal?.rationale).toMatch(/Ho rilevato:/i);
  });
});
