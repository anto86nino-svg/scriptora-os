import { describe, expect, it } from "vitest";
import { analyzeLongIdeaForProposal } from "./auto-detection-engine";
import { buildFoundationsFromDetection, resolveAuthorFoundationsToConfig } from "./author-format-genre-catalog";
import { buildDominantAutoDetectionProposal, resolveWizardGenreInference } from "./genre-lock-wizard";
import { buildExpressForgeConfiguration } from "@/lib/guided-interview/express-forge-config";
import { getInitialInterviewState } from "@/lib/guided-interview/question-engine";
import { startOneFlowSession, confirmOneFlowFoundations } from "@/lib/one-flow/ScriptoraOneFlowOrchestrator";
import { applyFormatDominance, assertFormatIntegrity } from "@/lib/book-format-dominance";
import { shouldBlockAutofillGenreMutation } from "./genre-priority";

const POETRY_IDEA =
  "Raccolta poetica di frammenti lirici sulla memoria, il silenzio e la verità interiore con voce autentica.";

const SELF_HELP_IDEA =
  "La Vita Che Rimandi Sempre — guida pratica per smettere di procrastinare e costruire abitudini sane.";

describe("author foundations flow", () => {
  it("poetry idea + author selects Raccolta poetica → never romance in locked config", () => {
    const detection = buildDominantAutoDetectionProposal(POETRY_IDEA);
    expect(detection).not.toBeNull();

    const authorLocked = resolveAuthorFoundationsToConfig({
      formatId: "raccolta_poetica",
      formatLabel: "Raccolta poetica",
      genreId: "contemporanea",
      genreLabel: "Contemporanea",
    });

    expect(authorLocked.genre).toBe("poetry");
    expect(authorLocked.genre).not.toBe("romance");
    expect(authorLocked.bookFormat).toBe("poetry_collection");

    const inference = resolveWizardGenreInference("Titolo", POETRY_IDEA, {
      genre: authorLocked.genre,
      bookTypeId: authorLocked.bookTypeId,
      bookFormat: authorLocked.bookFormat,
      genreManuallyLocked: true,
      authorFormatLocked: true,
    });
    expect(inference.genre).toBe("poetry");
    expect(inference.genre).not.toBe("romance");
  });

  it("self help idea + author selects Self Help → never horror in locked config", () => {
    const detection = buildDominantAutoDetectionProposal(SELF_HELP_IDEA);
    expect(detection).not.toBeNull();

    const authorLocked = resolveAuthorFoundationsToConfig({
      formatId: "self_help",
      formatLabel: "Self Help",
      genreId: "crescita-personale",
      genreLabel: "Crescita personale",
    });

    expect(authorLocked.genre).toBe("self-help");
    expect(authorLocked.genre).not.toBe("horror");
    expect(authorLocked.bookFormat).toBe("self_help");

    const dominated = applyFormatDominance({
      bookFormat: authorLocked.bookFormat,
      genre: authorLocked.genre,
      bookTypeId: authorLocked.bookTypeId,
      authorFormatLocked: true,
    });
    expect(dominated.genre).toBe("self-help");
    expect(dominated.genre).not.toBe("horror");
  });

  it("detection suggests but does NOT apply until author confirms foundations", () => {
    const session = startOneFlowSession(POETRY_IDEA);
    expect(session.phase).toBe("foundations");
    expect(session.state.selectedGenre).toBeFalsy();

    const proposal = analyzeLongIdeaForProposal(POETRY_IDEA);
    expect(proposal.shouldPropose).toBe(true);
    expect(proposal.proposal?.genre).toBeTruthy();

    const mapped = buildFoundationsFromDetection(proposal.proposal!);
    expect(mapped?.formatId).toBeTruthy();

    const confirmed = confirmOneFlowFoundations(session, {
      formatId: "raccolta_poetica",
      formatLabel: "Raccolta poetica",
      genreId: "contemporanea",
      genreLabel: "Contemporanea",
    });
    expect(confirmed.phase).not.toBe("foundations");
    expect(confirmed.state.selectedGenre).toBe("poetry");
    expect(confirmed.state.selectedGenre).not.toBe("romance");
  });

  it("express forge respects authorFormatLocked without idea inference override", () => {
    const result = buildExpressForgeConfiguration(
      {
        bookFormat: "self_help",
        genre: "self-help",
        language: "Italiano",
        titleMode: "suggest",
        ideaSeed: SELF_HELP_IDEA,
        tone: "pratico",
        length: "medio",
        controlLevel: "auto",
        authorFormatLocked: true,
      },
      getInitialInterviewState({ chatFirst: true }),
    );
    expect(result.state.selectedGenre).toBe("self-help");
    expect(result.state.selectedGenre).not.toBe("horror");
    expect(result.provenance.genre?.source).toBe("user");
  });

  it("blocks autofill genre mutation when manually locked", () => {
    expect(shouldBlockAutofillGenreMutation({ genreManuallyLocked: true })).toBe(true);
  });

  it("poetry format integrity rejects romance drift in stack", () => {
    const report = assertFormatIntegrity({
      bookFormat: "poetry_collection",
      genre: "romance",
      subgenre: "protagonist arc",
    });
    expect(report.ok).toBe(false);
  });
});
