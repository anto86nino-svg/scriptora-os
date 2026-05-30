import type { BookProject } from "@/types/book";
import type { UILanguage } from "@/lib/i18n";
import { FIXTURE_DARK_ROMANCE_STRONG, FIXTURE_MEMOIR_STRONG, FIXTURE_THRILLER_STRONG } from "@/lib/intelligence-stabilization/fixtures/benchmark-corpus";

/** Full chapter body — same benchmark corpus used inside Scriptora editorial tests. */
export const LANDING_LIVE_CHAPTER_EN = [
  FIXTURE_DARK_ROMANCE_STRONG,
  FIXTURE_THRILLER_STRONG,
  FIXTURE_MEMOIR_STRONG,
].join("\n\n");

export const LANDING_LIVE_CHAPTER_IT = `
La porta era sbagliata prima ancora che la toccasse — più fredda del corridoio.

Marco non la guardò. «Non avresti dovuto venire.»

Lei avrebbe quasi risposto. Poi non lo fece.

La sua mano restava sulla cornice come se stesse tenendo insieme la stanza e separando se stesso da lei.

«Cosa stai nascondendo?» chiese, e odiò quanto fosse ferma la sua voce.

Lui rise una volta, senza umorismo. «Non ancora.»

La chiave non combaciava con nessuna serratura che avesse visto — eppure qualcuno l'aveva lasciata sul suo tavolo.

Controllò lo specchio del corridoio. Vuoto.

Poi il telefono vibrò: numero sconosciuto. Nessun messaggio. Solo l'orario di tre minuti nel futuro.

Chi la osservava voleva farle capire che poteva entrare nella sua giornata e riorganizzarla.

Mia madre non bussava mai. Apriva le porte come altri aprivano le discussioni — già a metà strada.

Imparai a tenere le scarpe accanto al letto non per paura del fuoco, ma perché andarsene in fretta era diventata un'abilità.

Quell'inverno non le dissi che stavo facendo la valigia. Mi dissi che stavo solo riordinando.
`.trim();

export function landingLiveChapterText(lang: UILanguage): string {
  return lang === "it" ? LANDING_LIVE_CHAPTER_IT : LANDING_LIVE_CHAPTER_EN;
}

const now = "2026-01-01T12:00:00.000Z";

export function buildLandingDemoProject(lang: UILanguage): BookProject {
  const isIt = lang === "it";
  return {
    id: "landing-live-demo",
    phase: "chapters",
    createdAt: now,
    updatedAt: now,
    config: {
      title: isIt ? "Ombre sul Corso" : "Shadows on the Corridor",
      subtitle: isIt ? "Un dark romance contemporaneo" : "A contemporary dark romance",
      tone: isIt ? "intenso, sensoriale, cinematografico" : "intense, sensory, cinematic",
      author: isIt ? "Livia Noir" : "Livia Noir",
      authorName: "Livia Noir",
      writerName: "Livia Noir",
      authorStyle: "cinematic",
      language: isIt ? "Italian" : "English",
      genre: "dark-romance",
      category: "Fiction",
      subcategory: "Dark Romance",
      chapterLength: "medium",
      bookLength: "medium",
      numberOfChapters: 8,
      subchaptersEnabled: false,
    },
    blueprint: {
      overview: isIt
        ? "Attrazione, segreti e conseguenze emotive in una città che non perdona."
        : "Attraction, secrets, and emotional consequences in an unforgiving city.",
      emotionalArc: isIt ? "Desiderio → sospetto → resa controllata" : "Desire → suspicion → controlled surrender",
      themes: isIt ? ["desiderio", "colpa", "controllo"] : ["desire", "guilt", "control"],
      chapterOutlines: [
        { title: isIt ? "Primo contatto" : "First contact", summary: isIt ? "Incontro carico di sottotesto." : "A charged first encounter." },
        { title: isIt ? "La regola" : "The rule", summary: isIt ? "Confini che nessuno rispetta." : "Boundaries no one respects." },
        { title: isIt ? "La porta sbagliata" : "The wrong door", summary: isIt ? "Segreti dietro una cornice fredda." : "Secrets behind a cold frame." },
        { title: isIt ? "Seconda campana" : "Second bell", summary: isIt ? "Qualcuno sta già guardando." : "Someone is already watching." },
        { title: isIt ? "Resa parziale" : "Partial surrender", summary: isIt ? "Quasi-confatto e silenzio." : "Near-touch and silence." },
        { title: isIt ? "La chiave" : "The key", summary: isIt ? "Un oggetto fuori posto." : "An object out of place." },
        { title: isIt ? "Confronto" : "Confrontation", summary: isIt ? "Verità a metà." : "Half-truths." },
        { title: isIt ? "Costo" : "The cost", summary: isIt ? "Niente si risolve gratis." : "Nothing resolves for free." },
      ],
    },
    frontMatter: {
      titlePage: "",
      copyright: "",
      dedication: "",
      aboutAuthor: "",
      howToUse: "",
      letterToReader: "",
    },
    frontMatterStatus: "completed",
    backMatter: null,
    backMatterStatus: "idle",
    chapters: Array.from({ length: 8 }, (_, index) => {
      if (index < 2) {
        return {
          title: "",
          content: isIt ? "Capitolo completato — memoria del libro sincronizzata." : "Completed chapter — book memory synced.",
          subchapters: [],
          status: "completed" as const,
        };
      }
      if (index === 2) {
        return {
          title: "",
          content: "",
          subchapters: [],
          status: "idle" as const,
        };
      }
      return {
        title: "",
        content: "",
        subchapters: [],
        status: "idle" as const,
      };
    }),
  };
}

export const LANDING_DEMO_ACTIVE_CHAPTER = 2;
