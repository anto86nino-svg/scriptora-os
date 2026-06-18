import { describe, expect, it } from "vitest";
import type { GuidedInterviewState, InterviewQuestion } from "./types";
import {
  applyInterviewAnswer,
  getInitialInterviewState,
  getNextInterviewQuestion,
} from "./question-engine";
import { evaluateForgeEvolution } from "./forge-evolution-engine";
import { evaluateEditorialUnderstanding } from "./book-understanding-engine";
import {
  detectGenreConvergenceProfile,
  evaluateGenreConvergence,
  hasCoreQuartetStrong,
} from "./genre-convergence-engine";
import { getForgeMemory } from "./interview-memory";
import { isStoryRoomBlueprintReady } from "./story-room-state-machine";

function state(partial: Partial<GuidedInterviewState>): GuidedInterviewState {
  return {
    messages: [],
    extracted: {},
    confidence: 0.2,
    chatFirst: true,
    ...partial,
  } as GuidedInterviewState;
}

type Scenario = {
  id: string;
  seed: string;
  answers: Record<string, string>;
};

const SCENARIOS: Scenario[] = [
  {
    id: "thriller",
    seed: "Un uomo trova qualcosa che non avrebbe dovuto trovare.",
    answers: {
      readerTransformation:
        "Il lettore deve chiudere con paranoia crescente e la certezza che nessuno è innocente.",
      centralConflict:
        "Indagine personale contro un sistema che lo vuole silenziato — ogni indizio scoperto costa qualcosa di reale.",
      protagonistWound: "Ha ignorato un crimine passato e ora la verità lo raggiunge.",
      narrativeDrive: "Ogni prova lo avvicina a un complotto più grande di lui.",
      emotionalTone: "Teso, claustrofobico, investigativo, disturbante, realistico.",
      genreDNA: "Thriller psicologico investigativo noir urbano, non horror soprannaturale.",
      promise: "Una corsa contro il tempo dove ogni risposta apre una domanda più pericolosa.",
      setting: "Città industriale, magazzini, archivi, notti senza luna.",
      targetReader: "Lettori di thriller psicologico che amano indizi, sospetti e verità nascoste.",
      depthReaderFit: "Lettori che cercano mistero, pericolo e posta in gioco alta.",
      depthCoreFear: "Paura che la verità distrugga tutto ciò che ha costruito.",
    },
  },
  {
    id: "fantasy",
    seed: "Esiste una città che non dovrebbe esistere.",
    answers: {
      readerTransformation: "Il lettore deve chiudere con meraviglia e il peso di un destino troppo grande.",
      centralConflict:
        "Il regno nasconde una verità che potrebbe far crollare l'ordine del mondo — obiettivo: salvarlo o lasciarlo cadere.",
      emotionalTone: "Epico, immersivo, meraviglioso, teso, maestoso.",
      genreDNA: "Fantasy epico con regole magiche coerenti, non urban fantasy leggero.",
      promise: "Scoprire una città impossibile e il prezzo della sua esistenza.",
      setting: "Regno decadente, città sospesa tra le pieghe del mondo, foreste che ricordano.",
      targetReader: "Lettori fantasy che amano worldbuilding, regole magiche e destini grandi.",
      protagonistWound: "Non appartiene a nessun mondo e teme di non meritare il potere.",
      narrativeDrive: "La città impossibile rivela una regola magica il cui prezzo nessuno vuole pagare.",
      structurePreference: "18 capitoli epici in terza persona, worldbuilding progressivo.",
      openingSpark: "Esiste una città che non dovrebbe esistere.",
    },
  },
  {
    id: "poetry",
    seed: "Voglio parlare della nostalgia.",
    answers: {
      readerTransformation:
        "Il lettore deve attraversare malinconia, tenerezza e rinascita lenta — un'esperienza emotiva intima.",
      centralConflict: "La nostalgia come ferita dolce che non guarisce ma trasforma chi la guarda davvero.",
      emotionalTone: "Malinconico, intimo, lirico, sensoriale, fragile.",
      genreDNA: "Poesia lirica contemporanea sulla memoria e il tempo, non prosa mascherata.",
      promise: "Restituire al lettore un linguaggio per ciò che il tempo non restituisce.",
      setting: "Case, strade, oggetti, silenzi domestici e memoria.",
      targetReader: "Lettori sensibili che amano poesia intima e immagini forti.",
    },
  },
  {
    id: "sci-fi",
    seed: "Una tecnologia permette di cancellare i ricordi.",
    answers: {
      readerTransformation:
        "Il lettore deve chiudere con il peso di una conseguenza umana che non può più ignorare.",
      centralConflict:
        "Una tecnologia che cancella i ricordi apre un mercato nero di identità — chi controlla la memoria controlla la verità.",
      emotionalTone: "Distopico, teso, riflessivo, inquietante, umano.",
      genreDNA: "Sci-fi distopico sulla memoria manipolata, non space opera.",
      promise: "Esplorare il prezzo umano di cancellare ciò che ci definisce.",
      setting: "Città futura, cliniche di memoria, archivi digitali.",
      targetReader: "Lettori di sci-fi che amano idee centrali forti e conseguenze morali.",
    },
  },
  {
    id: "crime",
    seed: "Un omicidio impossibile avviene in una stanza chiusa.",
    answers: {
      readerTransformation: "Il lettore deve chiudere con la verità finale e il sapore amaro della giustizia incompleta.",
      centralConflict:
        "Un omicidio impossibile in una stanza chiusa — ogni indizio contraddice l'altro e la verità finale costa troppo.",
      emotionalTone: "Noir, investigativo, claustrofobico, preciso, inquietante.",
      genreDNA: "Crime mystery da stanza chiusa, giallo investigativo classico.",
      promise: "Un mistero dove ogni sospetto sembra colpevole e nessuno esce pulito.",
      setting: "Villa isolata, stanza chiusa, notte, testimoni inaffidabili.",
      targetReader: "Lettori di gialli e crime che amano enigmi logici e rivelazioni finali.",
    },
  },
];

function answerFor(profile: Scenario, question: InterviewQuestion): string {
  const structuralDefaults: Record<string, string> = {
    language: "Italiano",
    bookType: profile.answers.genreDNA ?? profile.answers.genre ?? "Romanzo",
    bookTitle: "Titolo provvisorio",
    structurePreference:
      profile.answers.structurePreference ??
      profile.answers.chapterCount ??
      "18 capitoli in terza persona, ritmo sostenuto.",
    openingSpark: profile.seed,
  };

  const resolved =
    profile.answers[question.key] ??
    profile.answers[question.id] ??
    structuralDefaults[question.key] ??
    profile.answers.readerTransformation ??
    profile.answers.genreDNA ??
    profile.answers.centralConflict ??
    profile.answers.promise ??
    profile.answers.protagonistWound ??
    profile.answers.emotionalTone ??
    profile.answers.targetReader;

  if (resolved) return resolved;
  if (question.key === "openingSpark") return profile.seed;
  return profile.answers.readerTransformation ?? profile.answers.centralConflict ?? profile.seed;
}

function simulateUnderstanding(profile: Scenario): {
  understood: boolean;
  steps: number;
  profileId: string;
} {
  let s = getInitialInterviewState({ chatFirst: true });
  s = applyInterviewAnswer(s, profile.seed);
  let steps = 1;

  for (const [key, value] of Object.entries(profile.answers)) {
    s = applyInterviewAnswer(s, value, { id: `seed-${key}`, key } as InterviewQuestion);
    steps += 1;
  }

  s = applyInterviewAnswer(s, "Italiano", { id: "seed-language", key: "language" });
  s = applyInterviewAnswer(s, "Titolo provvisorio", { id: "seed-title", key: "bookTitle" });
  s = applyInterviewAnswer(
    s,
    profile.answers.structurePreference ?? "18 capitoli in terza persona",
    { id: "seed-structure", key: "structurePreference" },
  );
  steps += 3;

  const seeded = evaluateEditorialUnderstanding(s);
  if (seeded.readyForBlueprint) {
    return {
      understood: true,
      steps,
      profileId: detectGenreConvergenceProfile(s, seeded.mode),
    };
  }

  for (let i = 0; i < 20; i += 1) {
    const editorial = evaluateEditorialUnderstanding(s);
    if (editorial.readyForBlueprint) {
      return {
        understood: true,
        steps,
        profileId: detectGenreConvergenceProfile(s, editorial.mode),
      };
    }
    const next = getNextInterviewQuestion(s);
    if (next.done || !next.question) {
      if (
        next.done &&
        isStoryRoomBlueprintReady(getForgeMemory(s)) &&
        !editorial.readyForBlueprint &&
        !s.forgeRefineMode
      ) {
        s = { ...s, forgeRefineMode: true };
        continue;
      }
      break;
    }
    s = applyInterviewAnswer(s, answerFor(profile, next.question), next.question);
    steps += 1;
  }

  const final = evaluateEditorialUnderstanding(s);
  return {
    understood: final.readyForBlueprint,
    steps,
    profileId: detectGenreConvergenceProfile(s, final.mode),
  };
}

describe("genre convergence engine", () => {
  it("detects genre profiles from seeds", () => {
    expect(detectGenreConvergenceProfile(state({ messages: [{ id: "1", role: "user", content: "Un uomo trova qualcosa che non avrebbe dovuto trovare.", createdAt: 1 }] }), "fiction")).toBe("thriller");
    expect(detectGenreConvergenceProfile(state({ messages: [{ id: "1", role: "user", content: "Esiste una città che non dovrebbe esistere.", createdAt: 1 }] }), "fiction")).toBe("fantasy");
    expect(detectGenreConvergenceProfile(state({ messages: [{ id: "1", role: "user", content: "Voglio parlare della nostalgia.", createdAt: 1 }] }), "poetry")).toBe("poetry");
    expect(detectGenreConvergenceProfile(state({ messages: [{ id: "1", role: "user", content: "Una tecnologia permette di cancellare i ricordi.", createdAt: 1 }] }), "fiction")).toBe("sci-fi");
    expect(detectGenreConvergenceProfile(state({ messages: [{ id: "1", role: "user", content: "Un omicidio impossibile avviene in una stanza chiusa.", createdAt: 1 }] }), "fiction")).toBe("crime");
  });

  it(
    "skips fiction depth requirements for thriller when core quartet is strong",
    () => {
      const scenario = SCENARIOS.find((s) => s.id === "thriller")!;
      const result = simulateUnderstanding(scenario);
      expect(result.understood).toBe(true);

      let s = getInitialInterviewState({ chatFirst: true });
      s = applyInterviewAnswer(s, scenario.seed);
      for (const [key, value] of Object.entries(scenario.answers)) {
        s = applyInterviewAnswer(s, value, { id: key, key } as InterviewQuestion);
      }
      const report = evaluateEditorialUnderstanding(s);
      expect(report.blindSpots).not.toContain("protagonist");
      expect(report.blindSpots).not.toContain("wound");
      expect(report.blindSpots).not.toContain("ending");
    },
    15000,
  );

  it("evaluates poetry without fiction plot requirements", () => {
    const report = evaluateEditorialUnderstanding(state({
      selectedGenre: "poetry",
      messages: [{ id: "1", role: "user", content: "Voglio parlare della nostalgia in poesia lirica.", createdAt: 1 }],
      extracted: {
        genreDNA: "Poesia lirica contemporanea sulla memoria e il tempo",
        promise: "Restituire al lettore un linguaggio per ciò che il tempo non restituisce.",
        emotionalTone: "Malinconico, intimo, lirico, sensoriale, fragile.",
        readerTransformation: "Il lettore attraversa malinconia, tenerezza e rinascita lenta.",
        targetReader: "Lettori sensibili che amano poesia intima e immagini forti.",
        centralConflict: "La nostalgia come ferita dolce che trasforma senza guarire.",
      } as GuidedInterviewState["extracted"],
    }));
    expect(report.mode).toBe("poetry");
    expect(report.readyForBlueprint).toBe(true);
  });

  it("still blocks generic shallow concepts", () => {
    const report = evaluateEditorialUnderstanding(state({
      extracted: { genreDNA: "Thriller", promise: "Una storia intensa." } as GuidedInterviewState["extracted"],
    }));
    expect(report.readyForBlueprint).toBe(false);
  });

  it("detects core quartet strength", () => {
    const components = {
      genre: { score: 0.8, weak: false, evidence: [] },
      conflict: { score: 0.8, weak: false, evidence: [] },
      promise: { score: 0.8, weak: false, evidence: [] },
      reader: { score: 0.8, weak: false, evidence: [] },
    };
    expect(hasCoreQuartetStrong(components)).toBe(true);
  });
});

describe("genre convergence simulations", () => {
  for (const scenario of SCENARIOS) {
    it(`converges understanding for ${scenario.id}`, () => {
      const result = simulateUnderstanding(scenario);
      console.log(JSON.stringify({ scenario: scenario.id, ...result }));
      expect(result.understood, `${scenario.id} did not converge in ${result.steps} steps`).toBe(true);
      expect(result.steps).toBeLessThan(50);
    });
  }
});
