import { describe, expect, it } from "vitest";
import { applyInterviewAnswer, getInitialInterviewState } from "./question-engine";
import {
  applyStoryRoomAnswer,
  buildStoryRoomSnapshot,
  createEmptyStoryRoom,
  getStoryRoomQuestionsForPhase,
  isStoryRoomComplete,
} from "./story-room-engine";
import { getAntagonistForgeQuestions } from "./character-forge-engine";

describe("story room engine", () => {
  it("shows story room for fiction after useful answers", () => {
    let state = getInitialInterviewState({ chatFirst: true });
    state = applyInterviewAnswer(
      state,
      "dark romance in italiano tra una ragazza fragile e un uomo pericoloso in Sicilia",
    );
    const snapshot = buildStoryRoomSnapshot(state);
    expect(snapshot.visible).toBe(false);

    state = applyInterviewAnswer(
      state,
      "Il lettore deve uscire con tensione elegante, desiderio e paura morale.",
    );
    const later = buildStoryRoomSnapshot(state);
    expect(later.visible).toBe(true);
    expect(later.sections.map((s) => s.id)).toEqual(["characters", "scenes", "arcs", "ending"]);
  });

  it("stores scene and ending answers", () => {
    let state = getInitialInterviewState({ chatFirst: true, selectedGenre: "dark-romance" });
    state = {
      ...state,
      storyRoom: createEmptyStoryRoom(),
      messages: [
        { id: "u1", role: "user", content: "dark romance gotico", createdAt: 1 },
        { id: "u2", role: "user", content: "tensione e desiderio proibito", createdAt: 2 },
      ],
    };

    const room = applyStoryRoomAnswer(
      state,
      { id: "story-scene-opening", key: "sceneOpening" },
      "Pioggia su una villa decadente — lei entra e sente che qualcosa la osserva.",
    );
    expect(room.scenes).toHaveLength(1);
    expect(room.scenes[0]?.role).toBe("opening");

    const ending = applyStoryRoomAnswer(
      { ...state, storyRoom: room },
      { id: "story-ending-tone", key: "endingTone" },
      "Finale devastante ma giusto — nessuno resta uguale.",
    );
    expect(ending.ending?.tone).toMatch(/devastante/i);
  });

  it("queues antagonist questions after protagonist depth", () => {
    const state = {
      ...getInitialInterviewState({ chatFirst: true }),
      characters: [
        {
          id: "p1",
          role: "protagonist",
          name: "Elena",
          wound: "Abbandono del padre",
          fear: "La verità",
          desire: "Sapere",
          contradiction: "Vuole e non vuole",
          obsession: "La villa",
          secret: "Ha sentito un grido",
          arc: "Da obediente a libera",
        },
      ],
      extracted: { genre: "Horror gotico", genreDNA: "Gotico" },
      messages: Array.from({ length: 4 }, (_, i) => ({
        id: `u-${i}`,
        role: "user" as const,
        content: `Risposta gotica dettagliata numero ${i + 1}.`,
        createdAt: i,
      })),
    };

    const questions = getAntagonistForgeQuestions(state);
    expect(questions[0]?.key).toBe("antagonistName");
    expect(questions[0]?.question).toMatch(/forza contraria/i);
  });

  it("returns scene questions in characters phase", () => {
    const state = {
      ...getInitialInterviewState({ chatFirst: true }),
      characters: [
        {
          id: "p1",
          role: "protagonist",
          name: "Lucia",
          wound: "Ferita profonda",
          fear: "Perdere controllo",
          desire: "Libertà",
          contradiction: "Cerca e fugge",
          obsession: "Lui",
          secret: "Una menzogna",
          arc: "Da fragile a consapevole",
        },
        {
          id: "a1",
          role: "antagonist",
          name: "Damien",
          wound: "Ossessione",
          desire: "Possederla",
          arc: "Da magnetico a distruttivo",
        },
      ],
      extracted: { genre: "Dark romance", genreDNA: "Dark romance" },
      messages: Array.from({ length: 5 }, (_, i) => ({
        id: `u-${i}`,
        role: "user" as const,
        content: `Risposta dettagliata numero ${i + 1} con abbastanza testo.`,
        createdAt: i,
      })),
    };

    const questions = getStoryRoomQuestionsForPhase(state, "characters");
    expect(questions[0]?.id).toMatch(/story-scene-opening/);
  });

  it("marks story room complete when hydrated scenes and ending exist", () => {
    const state = {
      ...getInitialInterviewState({ chatFirst: true }),
      extracted: {
        genre: "Horror gotico",
        setting: "Villa decadente tra nebbia e pioggia",
        narrativeDrive: "Indagini notturne verso una verità sepolta",
        readerTransformation: "Il lettore chiude con inquietudine e verità amara",
      },
      characters: [
        {
          id: "p1",
          role: "protagonist",
          name: "Elena",
          wound: "Abbandono",
          fear: "Verità",
          desire: "Sapere",
          contradiction: "Vuole e non vuole",
          obsession: "La villa e i suoi silenzi",
          secret: "Ha sentito un grido nella notte",
          arc: "Trasformazione",
        },
        {
          id: "a1",
          role: "antagonist",
          name: "Marco",
          wound: "Colpa",
          desire: "Proteggere il segreto",
          arc: "Da protettore a minaccia",
        },
      ],
      storyFuture: { endingTone: "unsettling", finalStatus: "alive", lastPageFeeling: "inquietudine" },
      messages: Array.from({ length: 6 }, (_, i) => ({
        id: `u-${i}`,
        role: "user" as const,
        content: `Risposta gotica dettagliata numero ${i + 1}.`,
        createdAt: i,
      })),
    };

    expect(isStoryRoomComplete(state)).toBe(true);
  });
});
