import type { BookConfig, BookProject } from "@/types/book";
import { fallbackTitleForFamily, isForbiddenGenericTitle, resolveBookTypeDefinition } from "@/lib/book-type-engine";
import { isForbiddenFantasyTitlePattern, isLiteraryRomanceGenreContext } from "@/lib/concept-dominance";

type ChapterTitleContext = {
  config?: Partial<BookConfig>;
  summary?: string;
  content?: string;
  totalChapters?: number;
  language?: string;
};

const GENERIC_TITLE_RE =
  /^(?:chapter|capitolo|chapitre|kapitel|capitulo|capitulo|cap\.?|ch\.?)\s*\d+$/i;
const PLACEHOLDER_TITLE_RE =
  /^(?:untitled|senza titolo|to be generated|da generare|chapter title|titolo capitolo|titolo del capitolo)$/i;
const FORBIDDEN_TITLE_RE =
  /^(?:to|the|a|an|titolo|title|section|sezione|part|parte|intro|introduction|preface|prefazione)$/i;
const TECHNICAL_BEAT_TITLE_RE =
  /^(?:forced proximity(?:\s*\/\s*inevitable encounter)?|inevitable encounter|setup mondi separati|costruzione attrazione|primo bacio(?:\/momento)?|ostacolo(?:\/rottura)?|riconciliazione|promessa futura|antagonistic chemistry|respect earned|vulnerability reveal|shift)$/i;
const TECHNICAL_BEAT_FRAGMENT_RE =
  /(?:forced proximity|inevitable encounter|setup mondi separati|costruzione attrazione|primo bacio|ostacolo|rottura|riconciliazione|promessa futura|antagonistic chemistry|respect earned|vulnerability reveal)/i;
const CHAPTER_PREFIX_RE =
  /^(?:chapter|capitolo|chapitre|kapitel|capitulo|capitulo|cap\.?|ch\.?)\s*\d+\s*(?:[:.\-–—·]\s*)?/i;
const WEAK_ISOLATED_TITLE_RE =
  /^(?:trova|trovare|paese|casa|memoria|adulto|adulta|protagonista|antagonista|personaggio|conflitto|segreto|mistero|ritorno)$/i;
const WEAK_COMPOSITE_TITLE_RE =
  /^(?:trova|trovare|paese|casa|memoria|adulto|adulta|protagonista|antagonista|personaggio|conflitto|segreto|mistero|ritorno|e|di|del|della|nel|nella|su|la|il|lo|le|gli|un|una|\d+)(?:\s+(?:trova|trovare|paese|casa|memoria|adulto|adulta|protagonista|antagonista|personaggio|conflitto|segreto|mistero|ritorno|e|di|del|della|nel|nella|su|la|il|lo|le|gli|un|una|\d+))*$/i;
const DISCONNECTED_TEMPLATE_RE =
  /(?:confronto\s+su\s+la\s+citt[àa]\s+nel\s+ghiaccio|citt[àa]\s+nel\s+ghiaccio|fotografia:\s*storia\s+di\s+adulta)/i;
const SUBCHAPTER_BEAT_RE =
  /^(?:apertura|pressione|scelta|conseguenza|rivelazione|ferita|svolta|aftershock|opening move|pressure point|choice|consequence|revelation|wound|turn)$/i;

const ITALIAN_FALLBACK_TITLES = [
  "L'innesco",
  "La prima crepa",
  "Il desiderio nascosto",
  "La soglia",
  "La scelta difficile",
  "Il punto di rottura",
  "La promessa sospesa",
  "La distanza necessaria",
  "Il segreto in superficie",
  "La notte della verita",
  "Il prezzo del silenzio",
  "La mappa del conflitto",
  "La ferita che parla",
  "Il passo oltre",
  "La tensione che resta",
  "La prova decisiva",
  "Il ritorno dell'ombra",
  "La risposta inattesa",
  "Il cuore della storia",
  "La linea da attraversare",
  "La conseguenza",
  "Il nodo finale",
  "La resa dei conti",
  "L'ultima soglia",
  "La promessa mantenuta",
  "Il nuovo inizio",
  "La forma del cambiamento",
  "La scelta definitiva",
  "Dopo la tempesta",
  "La porta aperta",
];

const ENGLISH_FALLBACK_TITLES = [
  "The Spark",
  "The First Crack",
  "The Hidden Want",
  "The Threshold",
  "The Difficult Choice",
  "The Breaking Point",
  "The Suspended Promise",
  "The Necessary Distance",
  "The Secret at the Surface",
  "The Night of Truth",
  "The Price of Silence",
  "The Map of Conflict",
  "The Speaking Wound",
  "The Step Beyond",
  "The Tension That Remains",
  "The Decisive Test",
  "The Returning Shadow",
  "The Unexpected Answer",
  "The Heart of the Story",
  "The Line to Cross",
  "The Consequence",
  "The Final Knot",
  "The Reckoning",
  "The Last Threshold",
  "The Kept Promise",
  "The New Beginning",
  "The Shape of Change",
  "The Final Choice",
  "After the Storm",
  "The Open Door",
];

function cleanTitle(value: unknown): string {
  return String(value || "")
    .replace(/^#+\s*/, "")
    .replace(/^[\s"'“”‘’]+|[\s"'“”‘’]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeLoose(value: string): string {
  return cleanTitle(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function contextText(context: ChapterTitleContext = {}): string {
  const config: Partial<BookConfig> = context.config || {};
  const characters = Array.isArray(config.characters)
    ? config.characters
        .map((character: any) => [character?.name, character?.surname, character?.role, character?.secret].filter(Boolean).join(" "))
        .join(" ")
    : "";
  return [
    context.content,
    context.summary,
    config.title,
    config.subtitle,
    config.idea,
    config.originalIdea,
    config.genre,
    config.subgenre,
    config.subcategory,
    config.targetReader,
    config.promise,
    config.forgeCanonBrief,
    Array.isArray(config.forgeAntiDriftRules) ? config.forgeAntiDriftRules.join(" ") : "",
    characters,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
}

function isLiteraryRomanceTitleContext(context: ChapterTitleContext = {}): boolean {
  const config = context.config || {};
  return isLiteraryRomanceGenreContext({
    genre: config.genre,
    subcategory: config.subcategory,
    subgenre: config.subgenre,
    bookTypeId: config.bookTypeId,
  });
}

function isForbiddenTitleForContext(value: string, context: ChapterTitleContext = {}): boolean {
  if (isDisconnectedTemplateTitle(value, context)) return true;
  if (isLiteraryRomanceTitleContext(context) && isForbiddenFantasyTitlePattern(value)) return true;
  return false;
}

function isDisconnectedTemplateTitle(value: string, context: ChapterTitleContext = {}): boolean {
  const loose = normalizeLoose(value);
  if (!loose) return true;
  if (DISCONNECTED_TEMPLATE_RE.test(loose)) {
    const bag = normalizeLoose(contextText(context));
    return !bag.includes("citta nel ghiaccio");
  }
  if (/\b(?:adulto|adulta|protagonista|antagonista|personaggio)\b/.test(loose)) return true;
  if (/^confronto\s+su\b/.test(loose)) return true;
  return false;
}

export function stripChapterTitlePrefix(value: unknown): string {
  return cleanTitle(value)
    .replace(CHAPTER_PREFIX_RE, "")
    .replace(/^\d+\s*(?:[.)\-:–—·]\s*)?/, "")
    .trim();
}

export function isGenericChapterTitle(value: unknown): boolean {
  const cleaned = cleanTitle(value);
  if (!cleaned) return true;
  const loose = normalizeLoose(cleaned);
  const words = loose.split(/\s+/).filter(Boolean);
  return (
    /^\d+$/.test(loose) ||
    loose.length < 3 ||
    WEAK_ISOLATED_TITLE_RE.test(loose) ||
    (words.length <= 4 && WEAK_COMPOSITE_TITLE_RE.test(loose)) ||
    GENERIC_TITLE_RE.test(loose) ||
    PLACEHOLDER_TITLE_RE.test(loose) ||
    FORBIDDEN_TITLE_RE.test(loose) ||
    TECHNICAL_BEAT_TITLE_RE.test(loose) ||
    ((/[\/→]/.test(cleaned) || loose.split(/\s+/).length <= 6) && TECHNICAL_BEAT_FRAGMENT_RE.test(loose)) ||
    isForbiddenGenericTitle(cleaned)
  );
}

function isBadSummary(value: string): boolean {
  const loose = normalizeLoose(value);
  return (
    !loose ||
    loose === "to be generated" ||
    loose === "da generare" ||
    /^develop chapter \d+/.test(loose) ||
    /^write the \d+/.test(loose)
  );
}

function titleFromSummary(summary?: string): string {
  const clean = String(summary || "").replace(/\s+/g, " ").trim();
  if (isBadSummary(clean)) return "";

  const firstSentence = clean.split(/[.!?]/)[0]?.trim() || clean;
  const candidate = firstSentence
    .replace(/^(?:in this chapter|this chapter|questo capitolo|il capitolo)\s+/i, "")
    .replace(/^(?:explores|explore|develops|develop|introduces|introduce|racconta|esplora|sviluppa|introduce)\s+/i, "")
    .replace(/^(?:how|come)\s+/i, "")
    .trim();

  if (isGenericChapterTitle(candidate)) return "";
  const words = candidate.split(/\s+/).filter(Boolean).slice(0, 8);
  if (words.length < 2) return "";
  const title = words.join(" ").replace(/[,;:]+$/g, "").trim();
  return title ? title.charAt(0).toUpperCase() + title.slice(1) : "";
}

function storySignalTitle(context: ChapterTitleContext, index: number): string {
  const source = contextText(context).toLowerCase();
  if (!source.trim()) return "";

  const signals: Array<{ test: RegExp; titles: string[] }> = [
    {
      test: /amore\s+maturo|romance\s+emozional|scelte\s+irreversibili|secondo\s+sospeso|spostati\s+di\s+un\s+secondo|romanzo\s+contemporaneo\s+emozional/,
      titles: [
        "Il secondo che cambia tutto",
        "La distanza necessaria",
        "Ciò che il passato tiene ancora",
        "Un appuntamento senza alibi",
        "La scelta che non si rimanda",
        "Ciò che resta dopo il silenzio",
      ],
    },
    {
      test: /casa sotto pelle|madri scomparse|madre scomparsa|paese d['’]?infanzia|casa di famiglia|ricordare pi[ùu] di lei/,
      titles: [
        "Il ritorno alla piazza vuota",
        "Le madri dietro le pareti",
        "La casa che ricorda",
        "La targa che mente",
        "Il paese senza madri",
        "La stanza sotto pelle",
      ],
    },
    {
      test: /nome scritto nel buio|nome scritto su un muro|nomi sui muri|sette giorni|bambino scomparso|documenti ufficiali/,
      titles: [
        "Il nome sul muro",
        "Sette giorni al buio",
        "Il bambino che non esiste",
        "Il fascicolo cancellato",
        "La parete dei condannati",
        "La prova del settimo giorno",
      ],
    },
    {
      test: /custode delle chiavi perdute|bottega delle chiavi perdute|chiave del 17 ottobre|registro delle chiavi|linea temporale|arturo valli|nora bellini/,
      titles: [
        "La Chiave del 17 Ottobre",
        "Nora Bellini Entra in Bottega",
        "Il Registro delle Chiavi",
        "Ferrara Non Ricorda",
        "La Serratura Mancante",
        "La Linea Temporale si Spezza",
      ],
    },
    {
      test: /condotti|voce nei condotti|corridoi tecnici/,
      titles: ["La Voce nei Condotti", "La Cosa nei Condotti"],
    },
    {
      test: /sala del sangue|debito di sangue|patto di sangue|sangue/,
      titles: ["Il Patto del Sangue", "La Sala del Sangue"],
    },
    {
      test: /sigillo d['’]?argento|argento|sigillo/,
      titles: ["Il Sigillo d'Argento", "La Legge del Sigillo"],
    },
    {
      test: /coscienza artificiale|codice|armature|ferro|bracciale di rame/,
      titles: ["Memoria nel Ferro", "Quello che non era uomo"],
    },
    {
      test: /lettere segrete|lettere mai spedite|lettera proibita|lettere/,
      titles: ["La Lettera Proibita", "Le Lettere che Restano"],
    },
    {
      test: /falso nome|nome scelto/,
      titles: ["Il Nome Scelto", "Il Falso Nome"],
    },
  ];

  const match = signals.find((signal) => signal.test.test(source));
  if (!match) return "";
  return match.titles[index % match.titles.length];
}

function fallbackTitle(index: number, context: ChapterTitleContext = {}): string {
  const language = context.language || context.config?.language || "Italian";
  if (context.config?.genre) {
    const def = resolveBookTypeDefinition(
      context.config.genre,
      context.config.subcategory,
      context.config.subgenre,
      context.config.bookTypeId,
    );
    if (def.family !== "narrative") {
      return fallbackTitleForFamily(def.family, index, language);
    }
  }
  const pool = language === "English" ? ENGLISH_FALLBACK_TITLES : ITALIAN_FALLBACK_TITLES;
  const base = pool[index % pool.length];
  if (index < pool.length) return base;
  return language === "English" ? `${base} Revisited` : `${base} ritrovata`;
}

export function resolveChapterTitle(
  rawTitle: unknown,
  index: number,
  context: ChapterTitleContext = {},
): string {
  const stripped = stripChapterTitlePrefix(rawTitle);
  if (!isGenericChapterTitle(stripped) && !isForbiddenTitleForContext(stripped, context)) return stripped;

  const fromSignals = storySignalTitle(context, index);
  if (fromSignals) return fromSignals;

  const fromSummary = titleFromSummary(context.summary);
  if (fromSummary) return fromSummary;

  return fallbackTitle(index, context);
}

export function chapterLabelWord(language?: string): string {
  switch (language) {
    case "English":
      return "Chapter";
    case "Spanish":
      return "Capitulo";
    case "French":
      return "Chapitre";
    case "German":
      return "Kapitel";
    default:
      return "Capitolo";
  }
}

export function formatChapterDisplayTitle(
  index: number,
  rawTitle: unknown,
  context: ChapterTitleContext = {},
): string {
  const language = context.language || context.config?.language;
  const title = resolveChapterTitle(rawTitle, index, context);
  return `${chapterLabelWord(language)} ${index + 1}: ${title}`;
}

function subchapterSignalTitles(context: ChapterTitleContext, chapterTitle: string): string[] {
  const source = `${contextText(context)} ${chapterTitle}`.toLowerCase();
  const chapter = normalizeLoose(chapterTitle);
  if (/casa sotto pelle|madri scomparse|madre scomparsa|paese d['’]?infanzia|casa di famiglia|la casa che ricorda|piazza vuota/.test(source)) {
    return [
      "La fontana scomparsa",
      "La targa che mente",
      "La madre di Tommaso",
      "La stanza che respira",
      "Il corridoio delle fotografie",
      "La porta murata",
    ];
  }
  if (/nome scritto nel buio|nome scritto su un muro|nomi sui muri|sette giorni|bambino scomparso|fascicolo cancellato/.test(source)) {
    return [
      "Il primo nome sul muro",
      "Il fascicolo che non esiste",
      "La settima notte",
      "La vittima senza passato",
      "Il bambino cancellato",
      "La parete che condanna",
    ];
  }
  if (/custode delle chiavi perdute|bottega delle chiavi perdute|chiave del 17 ottobre|registro delle chiavi|linea temporale|arturo valli|nora bellini/.test(source)) {
    if (/salvare|preservare|scelta|destino|arbitrio|prezzo/.test(chapter)) {
      return ["La scelta senza ritorno", "Il costo di Nora", "Il prezzo della linea"];
    }
    if (/nora|bellini/.test(chapter)) {
      return ["La donna che ricorda", "Il nome gia conosciuto", "La seconda memoria"];
    }
    if (/registro|pagina/.test(chapter)) {
      return ["La pagina che manca", "La lista delle possibilita", "La firma impossibile"];
    }
    if (/ferrara|vicolo|bottega/.test(chapter)) {
      return ["Il banco dopo mezzanotte", "La via che cambia", "La citta fuori posto"];
    }
    if (/linea|temporale|17 ottobre|giorno|futuro/.test(chapter)) {
      return ["La data che avanza", "La frattura nella linea", "Il futuro dentro la porta"];
    }
    return [
      "La chiave senza serratura",
      "L'incisione del 17 ottobre",
      "La pagina del registro",
      "Nora davanti al banco",
      "La memoria cambiata",
      "La scelta sulla linea",
    ];
  }
  if (/sala del sangue|debito di sangue|sigillo d['’]?argento/.test(source)) {
    return [
      "La soglia della Sala",
      "Il sigillo che pretende",
      "Il debito inciso",
      "La legge del sangue",
    ];
  }
  return [];
}

function fallbackSubchapterTitle(index: number, context: ChapterTitleContext = {}): string {
  const italian = String(context.language || context.config?.language || "Italian").toLowerCase().includes("ital");
  const titles = italian
    ? [
        "La soglia del ritorno",
        "La pressione del segreto",
        "La scelta senza prova",
        "La conseguenza nascosta",
        "La rivelazione che incrina",
        "La ferita in superficie",
      ]
    : [
        "The Returning Threshold",
        "The Pressure of the Secret",
        "The Choice Without Proof",
        "The Hidden Consequence",
        "The Fracturing Revelation",
        "The Wound at the Surface",
      ];
  return titles[index % titles.length]!;
}

export function resolveSubchapterTitle(
  rawTitle: unknown,
  subchapterIndex: number,
  chapterTitle: unknown,
  context: ChapterTitleContext = {},
): string {
  const stripped = stripChapterTitlePrefix(rawTitle);
  const loose = normalizeLoose(stripped);
  const beatSuffix = /[·:–—-]\s*([a-zà-ú ]+)$/i.exec(stripped)?.[1] || "";
  const inheritsWeakParent = beatSuffix && SUBCHAPTER_BEAT_RE.test(normalizeLoose(beatSuffix));
  if (
    stripped &&
    !inheritsWeakParent &&
    !SUBCHAPTER_BEAT_RE.test(loose) &&
    !isGenericChapterTitle(stripped) &&
    !isForbiddenTitleForContext(stripped, context)
  ) {
    return stripped;
  }

  const parentTitle = resolveChapterTitle(chapterTitle, 0, context);
  const signalTitles = subchapterSignalTitles(context, parentTitle);
  if (signalTitles.length) return signalTitles[subchapterIndex % signalTitles.length]!;
  return fallbackSubchapterTitle(subchapterIndex, context);
}

export function normalizeProjectChapterTitles(project: BookProject): BookProject {
  const totalChapters = project.config?.numberOfChapters || project.blueprint?.chapterOutlines?.length || project.chapters?.length || 0;
  const blueprint = project.blueprint
    ? {
        ...project.blueprint,
        chapterOutlines: project.blueprint.chapterOutlines.map((outline, index) => {
          const context = {
            config: project.config,
            summary: outline?.summary,
            totalChapters,
          };
          const title = resolveChapterTitle(outline?.title, index, context);
          return {
            ...outline,
            title,
            subchapters: outline.subchapters?.map((sub, subIndex) => ({
              ...sub,
              title: resolveSubchapterTitle(sub?.title, subIndex, title, {
                ...context,
                summary: sub?.summary || outline?.summary,
              }),
            })),
          };
        }),
      }
    : project.blueprint;

  const chapters = (project.chapters || []).map((chapter, index) => {
    const outline = blueprint?.chapterOutlines?.[index];
    const title = resolveChapterTitle(chapter?.title || outline?.title, index, {
      config: project.config,
      summary: outline?.summary,
      totalChapters,
    });
    return {
      ...chapter,
      title,
      subchapters: chapter.subchapters?.map((sub, subIndex) => ({
        ...sub,
        title: resolveSubchapterTitle(sub?.title || outline?.subchapters?.[subIndex]?.title, subIndex, title, {
          config: project.config,
          summary: outline?.subchapters?.[subIndex]?.summary || outline?.summary,
          content: sub?.content,
          totalChapters,
        }),
      })) || [],
    };
  });

  return { ...project, blueprint, chapters };
}
