import { describe, expect, it } from "vitest";
import type { BookConfig } from "@/types/book";
import {
  applyInterviewAnswer,
  getInitialInterviewState,
  getNextInterviewQuestion,
} from "./question-engine";
import { getForgeMemory, isSlotFilled } from "./interview-memory";
import { buildForgeInterviewSeed } from "./forge-blueprint-handoff";
import {
  buildForgeWriterContextBlock,
  enrichBookConfigFromForgeSeed,
} from "./forge-writer-bridge";

type Scenario = {
  label: string;
  firstAnswer: string;
  answers: string[];
  expectedGenre: string;
  expectedSubgenre?: RegExp;
};

const scenarios: Scenario[] = [
  {
    label: "dark romance gotico",
    firstAnswer:
      "Voglio un dark romance gotico in italiano: una villa antica, due anime ferite, desiderio proibito, segreti di famiglia e un'atmosfera oscura.",
    answers: [
      "La protagonista è una restauratrice che torna nella villa per sistemare un dipinto e incontra l'erede tormentato.",
      "Il conflitto è morale: l'attrazione li salva e li distrugge, perché il segreto della famiglia può rovinare entrambi.",
      "Il lettore deve sentire ossessione, vulnerabilità e una promessa di rivelazione finale.",
      "Pubblico adulto che ama dark romance eleganti, tensione psicologica e ambientazioni gotiche.",
      "Struttura in 24 capitoli, terza persona ravvicinata, capitoli con cliffhanger morbidi.",
    ],
    expectedGenre: "dark-romance",
    expectedSubgenre: /gotic/i,
  },
  {
    label: "thriller",
    firstAnswer:
      "Vorrei scrivere un thriller psicologico in italiano su una donna che scopre messaggi impossibili nella casa nuova.",
    answers: [
      "La protagonista è una psicologa razionale che teme di perdere lucidità proprio mentre tutti le chiedono prove.",
      "Il segreto è che la casa conserva una verità familiare rimossa, ma il pericolo resta umano e ambiguo.",
      "Tono claustrofobico, investigativo e disturbante, con indizi progressivi.",
      "Lettori di suspense psicologica, capitoli brevi e promessa di verità nascosta.",
      "28 capitoli, terza persona, progressione a indizi e finale rivelatore.",
    ],
    expectedGenre: "thriller",
  },
  {
    label: "self help",
    firstAnswer:
      "Voglio un self-help pratico in italiano per persone bloccate che sanno cosa fare ma rimandano per perfezionismo.",
    answers: [
      "La promessa è trasformare l'intenzione in azione con micro-passi, esercizi e un metodo settimanale.",
      "Il problema è il sovraccarico mentale: il lettore confonde preparazione e progresso.",
      "Tono diretto, umano, concreto, senza colpevolizzare.",
      "Pubblico: professionisti, creativi e studenti brillanti che procrastinano sotto pressione.",
      "14 capitoli con esempi, esercizi, riepiloghi e piano finale.",
    ],
    expectedGenre: "self-help",
  },
  {
    label: "raccolta poetica",
    firstAnswer:
      "Voglio una raccolta poetica in italiano su memoria, corpo, notte e rinascita, con voce intima e immagini ricorrenti.",
    answers: [
      "La ferita centrale è la perdita, ma il percorso porta verso una luce fragile.",
      "Simboli ricorrenti: stanze vuote, pioggia, pelle, mare e finestre.",
      "Tono malinconico, viscerale, a tratti spirituale.",
      "Lettori che cercano poesia accessibile ma intensa, non ermetica.",
      "Cinque sezioni tematiche con apertura, discesa, rottura, cura e rinascita.",
    ],
    expectedGenre: "poetry",
  },
];

function baseConfig(genre: string): BookConfig {
  return {
    title: "Libro Test",
    subtitle: "",
    tone: "Intenso",
    authorStyle: "Scriptora",
    language: "Italian",
    genre: genre as BookConfig["genre"],
    category: "Fiction",
    subcategory: "",
    chapterLength: "medium",
    bookLength: "medium",
    numberOfChapters: 12,
    subchaptersEnabled: true,
  };
}

describe("final Book Forge continuity audit", () => {
  it.each(scenarios)("keeps continuity for $label from interview memory to writer context", (scenario) => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = applyInterviewAnswer(state, scenario.firstAnswer);

    const afterFirstQuestion = getNextInterviewQuestion(state).question;
    expect(afterFirstQuestion?.id).not.toBe("genre-family-select");

    for (const answer of scenario.answers) {
      const next = getNextInterviewQuestion(state);
      if (next.done) break;
      state = applyInterviewAnswer(state, answer, next.question);
    }

    const memory = getForgeMemory(state);
    expect(isSlotFilled(memory, "genre")).toBe(true);
    expect(isSlotFilled(memory, "language")).toBe(true);
    expect(String(memory.slotValues.genre)).toContain(scenario.expectedGenre);

    if (scenario.expectedSubgenre) {
      expect(String(memory.slotValues.subgenre)).toMatch(scenario.expectedSubgenre);
      expect(String(memory.slotValues.tone)).toMatch(/gotic|oscura|ombre/i);
    }

    const seed = buildForgeInterviewSeed(state);
    const config = enrichBookConfigFromForgeSeed(baseConfig(scenario.expectedGenre), seed);
    const writerContext = buildForgeWriterContextBlock(config);

    expect(seed.selectedGenre || seed.extracted?.genre).toBeTruthy();
    expect(config.idea || config.forgeStoryArchitecture || config.forgeCanonBrief).toBeTruthy();
    expect(writerContext).toContain("FORGE");
  });
});
