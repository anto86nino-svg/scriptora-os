import type { GuidedInterviewState } from "./types";
import {
  createEmptyForgeMemory,
  getCriticalMissingSlots,
  type ForgeInterviewMemory,
} from "./interview-memory";
import {
  advanceStoryRoomStage,
  STORY_ROOM_STAGE_DEFS,
  type StoryRoomStageId,
} from "./story-room-state-machine";
import type {
  ExpressForgeInput,
  ExpressForgeResult,
  ForgeFieldProvenance,
} from "./express-forge-types";
import { buildBlueprintScenarios } from "./blueprint-scenarios";

const GENRE_SUBGENRE: Record<string, string> = {
  romance: "contemporary romance",
  "dark romance": "dark romance",
  thriller: "psychological thriller",
  horror: "supernatural horror",
  fantasy: "epic fantasy",
  "self-help": "personal growth",
  manuale: "practical guide",
  poesia: "lyric poetry",
};

const LENGTH_CHAPTERS: Record<ExpressForgeInput["length"], string> = {
  breve: "8 capitoli · ritmo compatto",
  medio: "12 capitoli · equilibrio narrativo",
  lungo: "18 capitoli · arco esteso",
  pro: "24 capitoli · saga commerciale",
};

function prov(
  value: string,
  source: ForgeFieldProvenance["source"],
  confidence: number,
): ForgeFieldProvenance {
  return { value, source, confidence };
}

function inferAudience(genre: string, tone: string): string {
  const g = genre.toLowerCase();
  if (g.includes("romance")) return "Lettrici 25–45 che cercano intensità emotiva e payoff relazionale";
  if (g.includes("thriller") || g.includes("horror")) return "Lettori adulti che amano tensione e ritmo serrato";
  if (g.includes("self") || g.includes("manuale")) return "Lettori pratici che vogliono risultati applicabili subito";
  if (g.includes("poesia")) return "Lettori sensibili al linguaggio e all'atmosfera";
  return `Lettori di ${genre} attratti da un tono ${tone}`;
}

function inferPromise(genre: string, protagonist: string, tone: string): string {
  return `Un ${genre} ${tone} centrato su ${protagonist}: promessa chiara di trasformazione, tensione e payoff memorabile.`;
}

function inferConflict(genre: string, protagonist: string, tone: string): string {
  const g = genre.toLowerCase();
  if (g.includes("romance")) {
    return `${protagonist} deve scegliere tra desiderio e sicurezza mentre il legame diventa pericolosamente reale.`;
  }
  if (g.includes("thriller") || g.includes("horror")) {
    return `${protagonist} scopre che la minaccia più grande non è esterna — è ciò che nasconde.`;
  }
  return `${protagonist} affronta una scelta irreversibile che mette in crisi tutto ciò che credeva stabile.`;
}

function inferStakes(genre: string): string {
  const g = genre.toLowerCase();
  if (g.includes("romance")) return "Cuore, identità e fiducia — il prezzo dell'amore è la verità.";
  if (g.includes("thriller")) return "Vita, reputazione e verità nascosta — ogni ritardo aumenta il danno.";
  return "Identità, relazioni e futuro — ciò che si perde non si recupera facilmente.";
}

function inferAntagonist(genre: string, protagonist: string): string {
  const g = genre.toLowerCase();
  if (g.includes("romance")) return "Interesse amorso magnetico e pericoloso — specchio oscuro del protagonista";
  if (g.includes("thriller")) return "Forza sistemica o avversario che conosce i punti deboli del protagonista";
  return "Ostacolo interno ed esterno che amplifica il conflitto centrale";
}

function inferEnding(tone: string): string {
  if (tone.includes("oscuro")) return "Finale intenso con crepa emotiva aperta — catharsis senza piena rassicurazione";
  if (tone.includes("commerciale")) return "Finale soddisfacente con payoff chiaro e senso di completamento";
  if (tone.includes("poetico")) return "Finale evocativo che lascia eco emotiva più che risposta esplicita";
  return "Finale coerente con la promessa — trasformazione visibile del protagonista";
}

function inferTitle(input: ExpressForgeInput): { title: string; source: ForgeFieldProvenance["source"] } {
  if (input.titleMode === "provided" && input.title?.trim()) {
    return { title: input.title.trim(), source: "user" };
  }
  if (input.titleMode === "provisional" && input.title?.trim()) {
    return { title: input.title.trim(), source: "user" };
  }
  const seed = input.protagonistSeed.split(/\s+/).slice(0, 3).join(" ");
  return {
    title: `${input.genre} — ${seed || "Progetto"}`,
    source: "auto",
  };
}

function fillSlot(
  memory: ForgeInterviewMemory,
  key: keyof ForgeInterviewMemory["slotValues"],
  value: string | number | boolean,
  provenance: Record<string, ForgeFieldProvenance>,
  source: ForgeFieldProvenance["source"],
  confidence: number,
): void {
  memory.slotValues[key] = value;
  memory.answeredSlots[key] = true;
  provenance[String(key)] = prov(String(value), source, confidence);
}

export function buildExpressForgeConfiguration(
  input: ExpressForgeInput,
  baseState?: GuidedInterviewState,
): ExpressForgeResult {
  const memory = createEmptyForgeMemory();
  const provenance: Record<string, ForgeFieldProvenance> = {};
  const autoFilledFields: string[] = [];

  const titleResult = inferTitle(input);
  const subgenre = GENRE_SUBGENRE[input.genre.toLowerCase()] ?? input.genre;
  const chapters = LENGTH_CHAPTERS[input.length];
  const audience = inferAudience(input.genre, input.tone);
  const marketPromise = inferPromise(input.genre, input.protagonistSeed, input.tone);
  const centralConflict = inferConflict(input.genre, input.protagonistSeed, input.tone);
  const stakes = inferStakes(input.genre);
  const antagonist = inferAntagonist(input.genre, input.protagonistSeed);
  const endingDirection = inferEnding(input.tone);

  const userFields: Array<[keyof ForgeInterviewMemory["slotValues"], string]> = [
    ["genre", input.genre],
    ["language", input.language],
    ["tone", input.tone],
    ["protagonist", input.protagonistSeed],
    ["rawIdea", `${input.genre} · ${input.protagonistSeed} · tono ${input.tone}`],
  ];

  for (const [key, value] of userFields) {
    fillSlot(memory, key, value, provenance, "user", 0.95);
  }

  fillSlot(memory, "title", titleResult.title, provenance, titleResult.source, titleResult.source === "user" ? 0.95 : 0.72);
  fillSlot(memory, "subgenre", subgenre, provenance, "auto", 0.78);
  fillSlot(memory, "audience", audience, provenance, "auto", 0.75);
  fillSlot(memory, "promise", marketPromise, provenance, "auto", 0.8);
  fillSlot(memory, "centralConflict", centralConflict, provenance, "auto", 0.82);
  fillSlot(memory, "stakes", stakes, provenance, "auto", 0.8);
  fillSlot(memory, "antagonist", antagonist, provenance, "auto", 0.7);
  fillSlot(memory, "endingDirection", endingDirection, provenance, "auto", 0.74);
  fillSlot(memory, "chapterCount", chapters, provenance, "auto", 0.85);
  fillSlot(memory, "subchaptersEnabled", input.length === "pro" || input.length === "lungo", provenance, "auto", 0.7);
  fillSlot(memory, "frontMatter", "Prefazione breve + nota autore", provenance, "auto", 0.65);
  fillSlot(memory, "backMatter", "Ringraziamenti e note finali", provenance, "auto", 0.65);
  fillSlot(memory, "authorName", "Da definire in seguito", provenance, "auto", 0.55);
  fillSlot(memory, "marketplace", "Amazon KDP", provenance, "auto", 0.7);
  fillSlot(memory, "indexOutline", "Indice provvisorio generato da Scriptora", provenance, "auto", 0.68);
  fillSlot(memory, "antiDriftRules", "Resta nel genere scelto; evita toni incoerenti; mantieni la promessa commerciale.", provenance, "auto", 0.8);
  fillSlot(memory, "forbiddenElements", "Deus ex machina, incoerenze di tono, finali gratuiti", provenance, "auto", 0.75);

  if (/romance/i.test(input.genre)) {
    fillSlot(memory, "loveInterest", antagonist, provenance, "auto", 0.72);
    fillSlot(memory, "bookType", "Romanzo", provenance, "auto", 0.8);
  }

  autoFilledFields.push(
    "subgenre",
    "audience",
    "promise",
    "centralConflict",
    "stakes",
    "antagonist",
    "endingDirection",
    "chapterCount",
    "subchaptersEnabled",
    "frontMatter",
    "backMatter",
    "authorName",
    "marketplace",
    "indexOutline",
    "antiDriftRules",
  );

  let advanced = advanceStoryRoomStage(memory);
  for (let i = 0; i < 20; i += 1) {
    const before = advanced.storyRoomMachine?.currentStageId;
    advanced = advanceStoryRoomStage(advanced);
    const after = advanced.storyRoomMachine?.currentStageId;
    if (before === after) break;
  }

  if (advanced.storyRoomMachine) {
    advanced.storyRoomMachine.currentStageId = "blueprintReady";
    advanced.storyRoomMachine.completedStageIds = STORY_ROOM_STAGE_DEFS.map((s) => s.id) as StoryRoomStageId[];
  }

  const missingCriticalFields = getCriticalMissingSlots(advanced).map(String);

  const state: GuidedInterviewState = {
    ...(baseState ?? {
      completed: false,
      currentStep: 0,
      confidence: 0.82,
      messages: [],
      extracted: {},
      chatFirst: true,
    }),
    forgeMode: "express",
    expressConfig: input,
    forgeMemory: advanced,
    slotProvenance: provenance,
    selectedGenre: input.genre,
    selectedTone: input.tone,
    selectedLength: input.length,
    extracted: {
      ...(baseState?.extracted ?? {}),
      genre: input.genre,
      subgenre,
      language: input.language,
      bookTitle: titleResult.title,
      emotionalTone: input.tone,
      targetReader: audience,
      promise: marketPromise,
      centralConflict,
      protagonistWound: input.protagonistSeed,
      antagonist,
      narrativeDrive: endingDirection,
      chapterCount: chapters,
      subchaptersPreference: String(advanced.slotValues.subchaptersEnabled),
      frontMatter: String(advanced.slotValues.frontMatter),
    },
    messages: [
      ...(baseState?.messages ?? []),
      {
        id: `express-user-${Date.now()}`,
        role: "user",
        content: `Studio Express: ${input.genre}, ${input.protagonistSeed}, tono ${input.tone}`,
        createdAt: Date.now(),
      },
      {
        id: `express-user-2-${Date.now()}`,
        role: "user",
        content: input.protagonistSeed,
        createdAt: Date.now() + 1,
      },
      {
        id: `express-user-3-${Date.now()}`,
        role: "user",
        content: `${input.tone} · ${input.length}`,
        createdAt: Date.now() + 2,
      },
      {
        id: `express-user-4-${Date.now()}`,
        role: "user",
        content: input.language,
        createdAt: Date.now() + 3,
      },
      {
        id: `express-assistant-${Date.now()}`,
        role: "assistant",
        content:
          input.controlLevel === "scenarios"
            ? "Scriptora ha preparato 3 direzioni blueprint. Scegli quella più vicina al tuo libro."
            : "Ho completato automaticamente alcune parti. Puoi correggerle ora o partire.",
        createdAt: Date.now(),
      },
    ],
  };

  const candidateBlueprintScenarios = buildBlueprintScenarios(state);

  return {
    state: {
      ...state,
      blueprintScenarios: candidateBlueprintScenarios,
    },
    memory: advanced,
    candidateBlueprintScenarios,
    missingCriticalFields,
    autoFilledFields,
    provenance,
  };
}
