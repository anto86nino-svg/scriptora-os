import { useCallback, useEffect, useMemo, useState } from "react";
import {
  X, ArrowLeft, ArrowRight, Rocket, Sparkles, Plus, Trash2, Users, Loader2,
  CheckCircle2, AlertTriangle, BookOpen, Clock3,
} from "lucide-react";
import type { AuthorIdentity, BookBlueprint, BookCharacter, BookConfig, Genre, Language } from "@/types/book";
import { DEFAULT_SUBCHAPTERS_PER_CHAPTER } from "@/types/book";
import {
  DEFAULT_STYLE_PROFILE,
  STYLE_PRESETS,
  profileToStyleDirective,
  type WritingStyleProfile,
} from "@/lib/book-creation-os/objectives";
import {
  applyAuthorIdentityToConfig,
  isUserAuthorIdentityConfigured,
  saveAuthorIdentity,
} from "@/lib/author-identity";
import {
  consumeWizardCharacterFreeRegen,
  generateWizardCharacter,
  getWizardCharacterFreeRegensRemaining,
} from "@/lib/book-creation-os/character-generator";
import { usePlan } from "@/lib/plan";
import { toast } from "sonner";
import { GuidedInterviewPanel } from "@/components/guided-interview/GuidedInterviewPanel";
import { STUDIO_STEPS, AMAZON_MARKETPLACES, STUDIO_GENRES, STUDIO_LANGUAGES } from "@/lib/book-config-studio/constants";
import { DEFAULT_MATTER_OPTIONS, normalizeBookConfig } from "@/lib/book-config-studio/defaults";
import { validateBookConfigStudio } from "@/lib/book-config-studio/validation";
import type { StudioLaunchPayload } from "@/lib/book-config-studio/types";
import { STUDIO_DRAFT_STORAGE_KEY } from "@/lib/book-config-studio/types";
import {
  getVisibleBookTypesForLevel1,
  inferLevel1FromConfig,
  resolveLevel1FromBookTypeId,
  resetConfigForLevel1Change,
  sanitizeBookConfiguration,
  validateConfigCoherence,
  type Level1BookType,
} from "@/lib/book-config-engine";
import {
  inferGenreFromText,
  isConfigIncoherentWithInference,
  type GenreInference,
} from "@/lib/book-creation-os/genre-inference";
import {
  buildWizardAutofillPatch,
  humanizeBlueprintError,
  runBlueprintPreflight,
  type BlueprintPreflightResult,
} from "@/lib/book-creation-os/blueprint-preflight";
import {
  consumeWizardTitleFreeRegen,
  generateWizardTitleProposals,
  getWizardTitleFreeRegensRemaining,
  runTitleForgeAnimation,
  type TitleProposal,
  type TitleForgeContext,
  TITLE_FORGE_PHASES,
  WIZARD_TITLE_FREE_REGENS,
} from "@/lib/book-creation-os/title-generator";

interface BookCreationOsWizardProps {
  open: boolean;
  onClose: () => void;
  authorIdentity: AuthorIdentity;
  onAuthorIdentity?: () => void;
  onManualStudio?: (config: BookConfig) => void;
  onStudioComplete?: (payload: StudioLaunchPayload) => void;
  onGenerateBlueprint?: (config: BookConfig) => Promise<BookBlueprint>;
  onDetectIntent?: (idea: string, language: Language) => Promise<{
    genre: string;
    subcategory: string;
    tone: string;
    numberOfChapters: number;
    suggestedTitles: string[];
    suggestedSubtitles: string[];
    bestTitleIndex: number;
  } | null>;
}

function emptyCharacter(): BookCharacter {
  return { name: "", role: "", wound: "", secret: "", externalDesire: "", personality: "" };
}



function mapForgeGenreToInterviewGenre(
  forgePresetId?: string | null,
  bookTypeId?: string
) {
  const source =
    forgePresetId
      ? forgePresetId.toLowerCase()
      : (bookTypeId || "general").toLowerCase();

  const map: Record<string, string> = {
    poetry: "poetry",
    romance: "romance",
    "dark-romance": "dark-romance",
    thriller: "thriller",
    horror: "thriller",
    fantasy: "fantasy",
    "self-help": "self-help",
    business: "business",
    manual: "manual",
    story: "literary-fiction",
    storia: "literary-fiction",
    historical: "literary-fiction",
    history: "literary-fiction",
    "historical-fiction": "literary-fiction",
    novel: "literary-fiction",
    fiction: "literary-fiction",
    handbook: "manual",
  };

  return map[source] || "general";
}

function handleInterviewCompleteFactory({
  setNarrativePromise,
  setCoreConflict,
  setSetting,
  setVoiceConsistency,
  setCommercialGoal,
  setTargetReader,
  setShowAdvancedForge,
}: {
  setNarrativePromise: (value: string) => void;
  setCoreConflict: (value: string) => void;
  setSetting: (value: string) => void;
  setVoiceConsistency: (value: string) => void;
  setCommercialGoal: (value: string) => void;
  setTargetReader?: (value: string) => void;
  setShowAdvancedForge: (value: boolean) => void;
}) {
  return (state: { extracted?: Record<string, string | undefined> }) => {
    const extracted = state?.extracted ?? {};

    setNarrativePromise(
      cleanStr(extracted.promise) ||
      cleanStr(extracted.readerTransformation),
    );

    setCoreConflict(cleanStr(extracted.centralConflict));
    setSetting(cleanStr(extracted.setting));
    setVoiceConsistency(cleanStr(extracted.emotionalTone));
    setCommercialGoal(cleanStr(extracted.promise));
    if (setTargetReader) setTargetReader(cleanStr(extracted.targetReader));

    setShowAdvancedForge(true);
  };
}

function cleanStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-sky-400/50 focus:outline-none";

const BOOK_CREATION_DECISIONS = [
  "Tipo libro",
  "Sottogenere",
  "Tono",
  "Target lettore",
  "Lunghezza",
  "Struttura",
  "Stile autore",
  "Velocità narrativa",
  "Intensità emotiva",
  "Personaggi",
  "Conflitto",
  "Promessa",
  "Ambientazione",
  "Hook iniziale",
  "Twist",
  "Obiettivo commerciale",
  "Voice consistency",
  "Blueprint",
  "Conferma",
  "Generazione reale",
] as const;

const GUIDED_STARTERS = [
  {
    id: "horror",
    label: "Dark Horror",
    title: "La Casa Sotto la Pelle",
    subtitle: "La paura non arriva di colpo: si installa sotto la pelle.",
    bookTypeId: "horror",
    genre: "horror" as Genre,
    subgenre: "dark horror / psychological horror",
    tone: "oscuro, claustrofobico, disturbante, cinematografico",
    targetReader: "Lettori horror adulti che cercano tensione, mistero e atmosfera inquietante.",
    idea: "Un romanzo dark horror su un paese dove le madri spariscono e la casa nasconde ciò che nessuno vuole nominare.",
    conflict: "Scoprire la verità senza perdere sé stessi nel buio che la protegge.",
    promise: "Mistero disturbante con rivelazione progressiva e trauma familiare.",
    setting: "Paese isolato, case antiche, nebbia, rituali dimenticati.",
    hook: "La protagonista trova una stanza che non compare nelle planimetrie — e sente respirare qualcuno dentro.",
    commercialGoal: "Posizionamento dark horror / gothic suspense su Amazon e BookTok horror.",
  },
  {
    id: "dark-romance",
    label: "Dark Romance",
    title: "Il Patto delle Cose Spezzate",
    subtitle: "Ogni desiderio ha un prezzo. Ogni promessa lascia un segno.",
    bookTypeId: "dark-romance",
    genre: "dark-romance" as Genre,
    subgenre: "dark romance psicologico, tensione morale, slow burn",
    tone: "oscuro, sensuale, trattenuto, cinematografico",
    targetReader: "Lettrici romance adulte che amano tensione, ambiguità morale, ferite emotive e payoff lento.",
    idea: "Una protagonista con una ferita antica entra in una relazione pericolosa con una persona che sembra offrirle salvezza, ma le chiede di guardare la parte più scomoda di sé.",
    conflict: "Desiderio di essere vista contro paura di perdere controllo.",
    promise: "Una storia di attrazione, potere, vulnerabilità progressiva e conseguenze emotive.",
    setting: "Città notturna, luoghi privati, lusso freddo, stanze dove ogni gesto pesa.",
    hook: "La protagonista riceve un invito che non dovrebbe accettare, firmato da qualcuno che conosce il suo segreto.",
    commercialGoal: "Alta tensione emotiva, capitoli con micro-hook e posizionamento BookTok/dark romance.",
  },
  {
    id: "fantasy",
    label: "Fantasy",
    title: "La Cattedrale delle Anime Dimenticate",
    subtitle: "Ogni segreto ha un prezzo. Ogni anima reclama il proprio debito.",
    bookTypeId: "fantasy",
    genre: "fantasy" as Genre,
    subgenre: "portal fantasy gotico, mito sacro, viaggio nel mondo ferito",
    tone: "mitico, atmosferico, emotivo, immersivo",
    targetReader: "Lettori fantasy adulti che cercano worldbuilding, mistero, colpa, magia con costo e personaggi contraddittori.",
    idea: "Una restauratrice di reliquie viene chiamata a riparare un portale sacro, ma scopre che la sua memoria è parte della prigione che dovrebbe aprire.",
    conflict: "Salvare un mondo che la condanna o distruggere la verità che la tiene viva.",
    promise: "Un viaggio di colpa, fede, magia e scelta impossibile.",
    setting: "Ducato in autunno eterno, cattedrali di nebbia, reliquie vive, campane funebri.",
    hook: "La prima reliquia che tocca pronuncia il suo nome in una lingua morta.",
    commercialGoal: "Fantasy immersivo con promessa forte, capitoli a rivelazione controllata e cover direction gotica.",
  },
  {
    id: "self-help",
    label: "Self Help",
    title: "L'Arte di Tornare a Sé",
    subtitle: "Una guida pratica per ritrovare calma, direzione e presenza.",
    bookTypeId: "self-help",
    genre: "self-help" as Genre,
    subgenre: "crescita personale, regolazione emotiva, vita quotidiana",
    tone: "chiaro, autorevole, caldo, pratico",
    targetReader: "Persone sovraccariche che vogliono strumenti concreti, esempi semplici e un percorso trasformativo realistico.",
    idea: "Un manuale che accompagna il lettore da confusione e ansia quotidiana verso abitudini pratiche di calma, scelta e presenza.",
    conflict: "Smettere di vivere in reazione e ricostruire una relazione più stabile con sé stessi.",
    promise: "Dal caos mentale a una pratica quotidiana sostenibile.",
    setting: "Vita reale: mattine difficili, lavoro, relazioni, decisioni, corpo e respiro.",
    hook: "Non hai bisogno di diventare un'altra persona. Hai bisogno di tornare raggiungibile a te stesso.",
    commercialGoal: "Promessa chiara, capitoli pratici, esercizi e posizionamento Amazon self-help italiano.",
  },
] as const;

const FEATURED_BOOK_TYPES = [
  { id: "literary", label: "Romanzo", helper: "Narrativa, contemporary o literary fiction.", subgenre: "romanzo contemporaneo" },
  { id: "romance", label: "Romance", helper: "Slow burn, tensione, relazione e payoff emotivo." },
  { id: "thriller", label: "Thriller", helper: "Pericolo, ritmo, indizi e capitoli a gancio." },
  { id: "horror", label: "Horror", helper: "Dark horror, tensione, atmosfera inquietante.", subgenre: "dark horror / psychological horror" },
  { id: "fantasy", label: "Fantasy", helper: "Mondo, lore, magia, quest e meraviglia." },
  { id: "dark-romance", label: "Dark Romance", helper: "Desiderio, ombra, potere e attrito morale." },
  { id: "self-help", label: "Self-help", helper: "Promessa chiara, metodo, esempi e trasformazione.", subgenre: "self-help pratico" },
  { id: "manual", label: "Manuale", helper: "Guida pratica, struttura e istruzioni operative." },
  { id: "education", label: "Scolastico / universitario", helper: "Studio, didattica, esercizi e spiegazioni." },
  { id: "poetry", label: "Poesia", helper: "Voce, raccolta, ritmo e identità autoriale." },
  { id: "literary", label: "Raccolta racconti", helper: "Storie brevi con filo tematico comune.", subgenre: "raccolta racconti" },
  { id: "ya", label: "Bambini / ragazzi", helper: "Lettura giovane, accessibile e immaginativa." },
  { id: "business", label: "Business", helper: "Autorità, promessa, metodo e casi pratici." },
  { id: "self-help", label: "Memoir / biografia", helper: "Percorso personale, trasformazione e verità narrativa.", subgenre: "memoir / biografia" },
] as const;

const TARGET_READER_PRESETS = [
  "Lettrici romance adulte che vogliono tensione emotiva, vulnerabilità lenta e payoff intenso.",
  "Lettori fantasy adulti che cercano mondi coerenti, magia con costo e personaggi psicologicamente veri.",
  "Lettori self-help che vogliono chiarezza, esempi concreti e trasformazione applicabile subito.",
  "Lettori thriller che amano ritmo, sospetto, reversals e capitoli con domande aperte.",
];

const COMMERCIAL_GOAL_PRESETS = [
  "Massima leggibilità Amazon: promessa chiara, titolo forte, hook immediato e capitoli ad alto retention.",
  "Posizionamento premium: tono autoriale, cover direzionale, sottotitolo memorabile e target lettore netto.",
  "Serialità: costruire un primo libro con mondo, personaggi e promessa capaci di sostenere una saga.",
  "Libro pratico: trasformazione visibile, esempi concreti, esercizi e fiducia del lettore.",
];

const BLUEPRINT_FORGE_STEPS = [
  "Analisi idea",
  "Architettura libro",
  "Coerenza genere",
  "Promessa narrativa/editoriale",
  "Capitoli e ritmo",
  "Controllo finale blueprint",
] as const;

const BLUEPRINT_FORGE_COPY = [
  "Sto costruendo l'ossatura del libro…",
  "Controllo promessa, genere e struttura…",
  "Allineo capitoli, tono e direzione editoriale…",
  "Creo una traiettoria leggibile per ogni capitolo…",
  "Ultimo controllo prima del blueprint…",
  "Non chiudere: Scriptora sta ancora lavorando.",
] as const;

function formatForgeTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${secs}`;
}

export function BookCreationOsWizard({
  open,
  onClose,
  authorIdentity,
  onAuthorIdentity,
  onManualStudio,
  onStudioComplete,
  onGenerateBlueprint,
  onDetectIntent,
}: BookCreationOsWizardProps) {
  const { plan } = usePlan();
  const isFree = plan === "free";
  const [step, setStep] = useState(0);
  const [showAdvancedForge, setShowAdvancedForge] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobileViewport(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const [useGuidedInterview, setUseGuidedInterview] = useState(true);
  const [dnaConfirmed, setDnaConfirmed] = useState(false);

  const mobileInterviewMode = isMobileViewport && step === 0 && useGuidedInterview;

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [idea, setIdea] = useState("");
  const [authorName, setAuthorName] = useState(authorIdentity?.penName?.trim() || "");
  const [language, setLanguage] = useState<Language>("Italian");
  const [amazonMarketplace, setAmazonMarketplace] = useState("amazon.it");
  const [category, setCategory] = useState("Fiction");
  const [subcategory, setSubcategory] = useState("General");
  const [bookTypeId, setBookTypeId] = useState("romance");
  const [genre, setGenre] = useState<Genre>("romance");
  const [subgenre, setSubgenre] = useState("");
  const [identityDraft, setIdentityDraft] = useState<AuthorIdentity>(authorIdentity);
  const [chapters, setChapters] = useState(18);
  const [chapterLength, setChapterLength] = useState<"short" | "medium" | "long">("medium");
  const [bookLength, setBookLength] = useState<"short" | "medium" | "long">(isFree ? "short" : "medium");
  const [subchaptersEnabled, setSubchaptersEnabled] = useState(true);
  const [subchaptersPerChapter, setSubchaptersPerChapter] = useState(DEFAULT_SUBCHAPTERS_PER_CHAPTER);
  const [matterOptions, setMatterOptions] = useState(DEFAULT_MATTER_OPTIONS);
  const [characters, setCharacters] = useState<BookCharacter[]>([emptyCharacter()]);
  const [styleProfile, setStyleProfile] = useState<WritingStyleProfile>(DEFAULT_STYLE_PROFILE);
  const [tone, setTone] = useState("editoriale, chiaro, coinvolgente");
  const [targetReader, setTargetReader] = useState("");
  const [referenceAuthors, setReferenceAuthors] = useState("");
  const [coreConflict, setCoreConflict] = useState("");
  const [narrativePromise, setNarrativePromise] = useState("");
  const [setting, setSetting] = useState("");
  const [openingHook, setOpeningHook] = useState("");
  const [mainTwists, setMainTwists] = useState("");
  const [commercialGoal, setCommercialGoal] = useState("");
  const [voiceConsistency, setVoiceConsistency] = useState("Mantieni stessa voce, stesso punto di vista, stessi comportamenti e stessa promessa emotiva in ogni capitolo.");
  const [blueprintPreview, setBlueprintPreview] = useState<BookBlueprint | null>(null);
  const [generatingBlueprint, setGeneratingBlueprint] = useState(false);
  const [blueprintError, setBlueprintError] = useState<string | null>(null);
  const [blueprintElapsedSeconds, setBlueprintElapsedSeconds] = useState(0);
  const [launching, setLaunching] = useState(false);
  const [generatingCharacter, setGeneratingCharacter] = useState(false);
  const [freeRegensLeft, setFreeRegensLeft] = useState(() => getWizardCharacterFreeRegensRemaining());
  const [level1BookType, setLevel1BookType] = useState<Level1BookType>("romanzo");
  const [showTypeChangeModal, setShowTypeChangeModal] = useState(false);
  const [pendingBookTypeId, setPendingBookTypeId] = useState<string | null>(null);
  const [pendingFeaturedSubgenre, setPendingFeaturedSubgenre] = useState<string | undefined>();
  const [titleProposals, setTitleProposals] = useState<TitleProposal[]>([]);
  const [titleForgePhase, setTitleForgePhase] = useState(0);
  const [titleForgeLabel, setTitleForgeLabel] = useState("");
  const [generatingTitles, setGeneratingTitles] = useState(false);
  const [freeTitleRegensLeft, setFreeTitleRegensLeft] = useState(() => getWizardTitleFreeRegensRemaining());
  const [preflightResult, setPreflightResult] = useState<BlueprintPreflightResult | null>(null);
  const [showCoherenceWarning, setShowCoherenceWarning] = useState(false);
  const [coherenceDismissed, setCoherenceDismissed] = useState(false);
  const [forgePresetId, setForgePresetId] = useState<string | null>(null);
  const [forgePresetLabel, setForgePresetLabel] = useState<string | null>(null);

  const textInference = useMemo(
    () => inferGenreFromText(title, idea),
    [title, idea],
  );

  useEffect(() => {
    if (coherenceDismissed) return;
    setShowCoherenceWarning(
      isConfigIncoherentWithInference(textInference, category, genre, subcategory),
    );
  }, [textInference, category, genre, subcategory, coherenceDismissed]);

  const visibleGenres = useMemo(() => {
  const baseGenres =
    getVisibleBookTypesForLevel1(level1BookType);

  if (!forgePresetId) {
    return baseGenres;
  }

  const presetFilters: Record<string, string[]> = {
    poetry: ["poetry"],

    history: [
      "historical-fiction",
      "literary",
      "history",
    ],

    manual: [
      "manual",
      "self-help",
      "business",
      "educational",
    ],

    romance: [
      "romance",
      "dark-romance",
    ],

    thriller: [
      "thriller",
      "crime",
      "horror",
    ],

    horror: [
      "horror",
      "thriller",
    ],

    fantasy: [
      "fantasy",
      "sci-fi",
    ],

    "dark-romance": [
      "dark-romance",
      "romance",
    ],

    story: [
      "literary",
      "historical-fiction",
      "fiction",
    ],
  };

  const allowed =
    presetFilters[forgePresetId] || [];

  return baseGenres.filter((g) =>
    allowed.includes(g.id)
  );
}, [
  level1BookType,
  forgePresetId,
]);

  const filteredFeaturedTypes = useMemo(() => {
    if (textInference.level1 === "romanzo") {
      return FEATURED_BOOK_TYPES.filter((t) => !["self-help", "manual", "education", "business"].includes(t.id));
    }
    if (textInference.level1 === "self-help") {
      return FEATURED_BOOK_TYPES.filter((t) => ["self-help", "business", "manual", "education"].includes(t.id) || /memoir|biografia/i.test(t.label));
    }
    if (textInference.level1 === "business") {
      return FEATURED_BOOK_TYPES.filter((t) => ["business", "self-help", "manual"].includes(t.id));
    }
    return FEATURED_BOOK_TYPES;
  }, [textInference.level1]);

  const filteredTargetPresets = useMemo(() => {
    if (textInference.bookTypeId === "horror" || textInference.genre === "horror") {
      return TARGET_READER_PRESETS.filter((p) => /thriller|horror|tensione/i.test(p));
    }
    if (textInference.level1 === "self-help") {
      return TARGET_READER_PRESETS.filter((p) => /self-help/i.test(p));
    }
    return TARGET_READER_PRESETS;
  }, [textInference]);

  const buildConfig = useCallback((): BookConfig => {
    const styleDirective = profileToStyleDirective(styleProfile);
    const presetLabel = STYLE_PRESETS.find((p) => p.id === styleProfile.presetId)?.label || "Bestseller Commerciale";
    const mergedIdentity = saveAuthorIdentity({
      ...identityDraft,
      penName: identityDraft.penName || authorName,
      biography: identityDraft.biography || "",
      voice: identityDraft.voice || "",
      language,
    });
    const guidedBrief = [
      idea.trim() && `Idea del libro:\n${idea.trim()}`,
      coreConflict.trim() && `Conflitto principale:\n${coreConflict.trim()}`,
      narrativePromise.trim() && `Promessa narrativa/editoriale:\n${narrativePromise.trim()}`,
      setting.trim() && `Ambientazione:\n${setting.trim()}`,
      openingHook.trim() && `Hook iniziale:\n${openingHook.trim()}`,
      mainTwists.trim() && `Twist principali:\n${mainTwists.trim()}`,
      commercialGoal.trim() && `Obiettivo commerciale:\n${commercialGoal.trim()}`,
      voiceConsistency.trim() && `Voice consistency:\n${voiceConsistency.trim()}`,
    ].filter(Boolean).join("\n\n");

    const raw = normalizeBookConfig(applyAuthorIdentityToConfig({
      title: title.trim() || "Romanzo senza titolo",
      subtitle: subtitle.trim(),
      idea: guidedBrief || idea.trim(),
      language,
      titleLanguage: language,
      amazonMarketplace,
      bookTypeId,
      genre,
      category,
      subcategory,
      subgenre: subgenre.trim() || subcategory,
      tone: `${tone} · ${styleDirective}`,
      authorStyle: presetLabel,
      authorName: authorName.trim() || mergedIdentity.penName,
      author: authorName.trim() || mergedIdentity.penName,
      targetReader: targetReader.trim(),
      referenceAuthors: referenceAuthors.trim(),
      chapterLength,
      bookLength: isFree ? "short" : bookLength,
      numberOfChapters: chapters,
      subchaptersEnabled,
      subchaptersPerChapter: subchaptersEnabled ? subchaptersPerChapter : 0,
      matterOptions,
      styleProfile,
      characters: characters.filter((c) => String(c.name || "").trim()),
      configStatus: "validated",
    }, mergedIdentity) as BookConfig);
    const { config: sanitized } = sanitizeBookConfiguration(raw);
    return sanitized;
  }, [
    styleProfile, identityDraft, authorName, title, subtitle, idea, language, amazonMarketplace,
    bookTypeId, genre, category, subcategory, subgenre, tone, targetReader, referenceAuthors, chapterLength,
    bookLength, isFree, chapters, subchaptersEnabled, subchaptersPerChapter, matterOptions, characters,
    coreConflict, narrativePromise, setting, openingHook, mainTwists, commercialGoal, voiceConsistency,
  ]);

  useEffect(() => {
    if (step === 6 && open) {
      setPreflightResult(runBlueprintPreflight(buildConfig(), identityDraft));
    }
  }, [step, open, buildConfig, identityDraft]);

  const persistDraft = useCallback(() => {
    try {
      sessionStorage.setItem(STUDIO_DRAFT_STORAGE_KEY, JSON.stringify({
        step, title, subtitle, idea, authorName, language, amazonMarketplace, category, subcategory,
        bookTypeId, genre, subgenre, chapters, chapterLength, bookLength, subchaptersEnabled, subchaptersPerChapter,
        matterOptions, characters, styleProfile, tone, targetReader, referenceAuthors,
        coreConflict, narrativePromise, setting, openingHook, mainTwists, commercialGoal, voiceConsistency,
      }));
    } catch { /* noop */ }
  }, [
    step, title, subtitle, idea, authorName, language, amazonMarketplace, category, subcategory,
    bookTypeId, genre, subgenre, chapters, chapterLength, bookLength, subchaptersEnabled, subchaptersPerChapter,
    matterOptions, characters, styleProfile, tone, targetReader, referenceAuthors,
    coreConflict, narrativePromise, setting, openingHook, mainTwists, commercialGoal, voiceConsistency,
  ]);

  useEffect(() => {
    if (!open) return;
    try {
      const raw = sessionStorage.getItem(STUDIO_DRAFT_STORAGE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (draft.step != null) setStep(draft.step);
      if (draft.title) setTitle(draft.title);
      if (draft.subtitle) setSubtitle(draft.subtitle);
      if (draft.idea) setIdea(draft.idea);
      if (draft.authorName) setAuthorName(draft.authorName);
      if (draft.language) setLanguage(draft.language);
      if (draft.amazonMarketplace) setAmazonMarketplace(draft.amazonMarketplace);
      if (draft.category) setCategory(draft.category);
      if (draft.subcategory) setSubcategory(draft.subcategory);
      if (draft.bookTypeId) {
        setBookTypeId(draft.bookTypeId);
        setLevel1BookType(resolveLevel1FromBookTypeId(draft.bookTypeId));
      }
      if (draft.genre) setGenre(draft.genre);
      if (draft.subgenre) setSubgenre(draft.subgenre);
      if (draft.chapters) setChapters(draft.chapters);
      if (draft.chapterLength) setChapterLength(draft.chapterLength);
      if (draft.bookLength) setBookLength(draft.bookLength);
      if (draft.subchaptersEnabled != null) setSubchaptersEnabled(draft.subchaptersEnabled);
      if (draft.subchaptersPerChapter) setSubchaptersPerChapter(draft.subchaptersPerChapter);
      if (draft.matterOptions) setMatterOptions({ ...DEFAULT_MATTER_OPTIONS, ...draft.matterOptions });
      if (draft.characters?.length) setCharacters(draft.characters);
      if (draft.styleProfile) setStyleProfile({ ...DEFAULT_STYLE_PROFILE, ...draft.styleProfile });
      if (draft.tone) setTone(draft.tone);
      if (draft.targetReader) setTargetReader(draft.targetReader);
      if (draft.referenceAuthors) setReferenceAuthors(draft.referenceAuthors);
      if (draft.coreConflict) setCoreConflict(draft.coreConflict);
      if (draft.narrativePromise) setNarrativePromise(draft.narrativePromise);
      if (draft.setting) setSetting(draft.setting);
      if (draft.openingHook) setOpeningHook(draft.openingHook);
      if (draft.mainTwists) setMainTwists(draft.mainTwists);
      if (draft.commercialGoal) setCommercialGoal(draft.commercialGoal);
      if (draft.voiceConsistency) setVoiceConsistency(draft.voiceConsistency);
    } catch { /* noop */ }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const applyForgePresetFromSession = () => {
      try {
        const raw = sessionStorage.getItem("scriptora-forge-selected-preset");
        if (!raw) return;

        const preset = JSON.parse(raw) as {
          id?: string;
          label?: string;
          defaultChapters?: number;
          defaultLanguage?: Language;
          tone?: string;
          blueprintHint?: string;
          promise?: string;
        };

        sessionStorage.removeItem("scriptora-forge-selected-preset");

        const presetId = String(preset.id || "");
        setForgePresetId(presetId);
        setForgePresetLabel(String(preset.label || ""));
        const presetTone = String(preset.tone || "").trim();
        const presetHint = String(preset.blueprintHint || "").trim();
        const presetPromise = String(preset.promise || "").trim();

        setStep(0);
        setLanguage(preset.defaultLanguage || "Italian");
        setChapters(Number(preset.defaultChapters || 8));
        setChapterLength("medium");
        setBookLength(isFree ? "short" : "medium");
        setTargetReader("");
        setReferenceAuthors("");
        setCommercialGoal(presetPromise);
        setNarrativePromise(presetPromise);
        setVoiceConsistency(
          presetHint ||
          "Mantieni coerenza di struttura, tono, promessa editoriale e lettore in ogni sezione."
        );
        setCoherenceDismissed(true);
        setShowCoherenceWarning(false);

        if (presetTone) setTone(presetTone);

        if (presetId === "poetry") {
          setBookTypeId("literary");
          setLevel1BookType("romanzo");
          setGenre("literary" as Genre);
          setCategory("Poetry");
          setSubcategory("Poetry Collection");
          setSubgenre("raccolta poetica contemporanea");
          setChapters(6);
          setSubchaptersEnabled(false);
          setSubchaptersPerChapter(0);
          setChapterLength("short");
          setBookLength(isFree ? "short" : "short");
          setTone(presetTone || "lirico, essenziale, emotivo, contemporaneo");
          setIdea((current) =>
            current ||
            "Una raccolta di poesie organizzata in sezioni emotive, con versi liberi, immagini concrete, silenzi, ritmo e nessuna struttura da romanzo."
          );
          setCommercialGoal("Raccolta poetica leggibile, intima e pubblicabile, con sezioni coerenti e forte identità emotiva.");
          setNarrativePromise("Trasformare emozioni, memoria e immagini in una raccolta poetica coerente.");
          return;
        }

        if (presetId === "songs") {
          setBookTypeId("literary");
          setLevel1BookType("romanzo");
          setGenre("literary" as Genre);
          setCategory("Music");
          setSubcategory("Songbook");
          setSubgenre("raccolta testi canzoni");
          setChapters(8);
          setSubchaptersEnabled(false);
          setSubchaptersPerChapter(0);
          setChapterLength("short");
          setTone(presetTone || "musicale, emotivo, memorabile");
          setIdea((current) =>
            current ||
            "Una raccolta di testi musicali con strofe, ritornelli, bridge, hook cantabili e identità emotiva coerente."
          );
          return;
        }

        if (presetId === "history") {
          setBookTypeId("education");
          setLevel1BookType("self-help");
          setGenre("nonfiction" as Genre);
          setCategory("Education");
          setSubcategory("History");
          setSubgenre("storia divulgativa");
          setChapters(14);
          setSubchaptersEnabled(true);
          setSubchaptersPerChapter(3);
          setTone(presetTone || "divulgativo, accurato, ordinato");
          setIdea((current) =>
            current ||
            "Un libro di storia con cronologia, contesto, cause, conseguenze, protagonisti e box di approfondimento."
          );
          return;
        }

        if (presetId === "math") {
          setBookTypeId("education");
          setLevel1BookType("self-help");
          setGenre("nonfiction" as Genre);
          setCategory("Education");
          setSubcategory("Mathematics");
          setSubgenre("matematica didattica");
          setChapters(10);
          setSubchaptersEnabled(true);
          setSubchaptersPerChapter(3);
          setTone(presetTone || "didattico, preciso, progressivo");
          setIdea((current) =>
            current ||
            "Un libro didattico di matematica con teoria, formule, esempi svolti, esercizi graduati e soluzioni."
          );
          return;
        }

        if (presetId === "physics") {
          setBookTypeId("education");
          setLevel1BookType("self-help");
          setGenre("nonfiction" as Genre);
          setCategory("Education");
          setSubcategory("Physics");
          setSubgenre("fisica didattica");
          setChapters(10);
          setSubchaptersEnabled(true);
          setSubchaptersPerChapter(3);
          setTone(presetTone || "scientifico, chiaro, visuale");
          setIdea((current) =>
            current ||
            "Un libro didattico di fisica con concetti, formule, esempi reali, problemi risolti, esperimenti e sintesi."
          );
          return;
        }

        if (presetId === "manual") {
          setBookTypeId("manual");
          setLevel1BookType("self-help");
          setGenre("nonfiction" as Genre);
          setCategory("Nonfiction");
          setSubcategory("Manual");
          setSubgenre("manuale pratico");
          setChapters(12);
          setSubchaptersEnabled(true);
          setSubchaptersPerChapter(3);
          setTone(presetTone || "chiaro, pratico, autorevole");
          return;
        }

        if (presetId === "essay" || presetId === "philosophy") {
          setBookTypeId("literary");
          setLevel1BookType("romanzo");
          setGenre("literary" as Genre);
          setCategory("Nonfiction");
          setSubcategory(presetId === "philosophy" ? "Philosophy" : "Essay");
          setSubgenre(presetId === "philosophy" ? "filosofia divulgativa" : "saggio argomentativo");
          setChapters(presetId === "philosophy" ? 12 : 10);
          setSubchaptersEnabled(true);
          setSubchaptersPerChapter(3);
          setTone(presetTone || "profondo, chiaro, argomentativo");
          return;
        }

        if (presetId === "children") {
          setBookTypeId("children");
          setLevel1BookType("romanzo");
          setGenre("children" as Genre);
          setCategory("Children");
          setSubcategory("Children Book");
          setSubgenre("libro per bambini");
          setChapters(8);
          setSubchaptersEnabled(false);
          setSubchaptersPerChapter(0);
          setChapterLength("short");
          setTone(presetTone || "semplice, caldo, immaginifico");
          return;
        }

        if (presetId === "self_help") {
          setBookTypeId("self-help");
          setLevel1BookType("self-help");
          setGenre("self-help" as Genre);
          setCategory("Nonfiction");
          setSubcategory("Self-help");
          setSubgenre("self-help pratico");
          setChapters(12);
          setSubchaptersEnabled(true);
          setSubchaptersPerChapter(3);
          setTone(presetTone || "motivazionale, umano, pratico");
          return;
        }

        if (presetId === "business") {
          setBookTypeId("business");
          setLevel1BookType("business");
          setGenre("nonfiction" as Genre);
          setCategory("Business");
          setSubcategory("Business Strategy");
          setSubgenre("business pratico");
          setChapters(12);
          setSubchaptersEnabled(true);
          setSubchaptersPerChapter(3);
          setTone(presetTone || "autorevole, concreto, commerciale");
          return;
        }

        // Romanzo/default
        setBookTypeId("literary");
        setLevel1BookType("romanzo");
        setGenre("literary" as Genre);
        setCategory("Fiction");
        setSubcategory("Literary Fiction");
        setSubgenre("romanzo contemporaneo");
        setChapters(18);
        setSubchaptersEnabled(true);
        setSubchaptersPerChapter(3);
        setTone(presetTone || "narrativo, immersivo, cinematografico");
      } catch {
        // Non bloccare mai il wizard se il preset non è leggibile.
      }
    };

    applyForgePresetFromSession();
  }, [open, isFree]);

  useEffect(() => {
    if (open) persistDraft();
  }, [open, persistDraft]);

  useEffect(() => {
    setIdentityDraft(authorIdentity);
    if (!authorName.trim()) setAuthorName(authorIdentity?.penName?.trim() || "");
  }, [authorIdentity]);

  useEffect(() => {
    if (!generatingBlueprint) {
      setBlueprintElapsedSeconds(0);
      return;
    }
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setBlueprintElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [generatingBlueprint]);

  if (!open) return null;

  const validationIssues = validateBookConfigStudio(buildConfig(), identityDraft);
  const coherenceReport = step >= 5 ? validateConfigCoherence(buildConfig()) : null;
  const stepLabel = STUDIO_STEPS[step];

  const applyCoherenceAutoFix = () => {
    const { config } = sanitizeBookConfiguration(buildConfig());
    if (config.bookTypeId) {
      setBookTypeId(config.bookTypeId);
      setLevel1BookType(resolveLevel1FromBookTypeId(config.bookTypeId));
    }
    setGenre(config.genre);
    setCategory(config.category);
    setSubcategory(config.subcategory);
    setSubgenre(config.subgenre || config.subcategory);
    setTone(config.tone.split(" · Voce autore:")[0]?.trim() || config.tone);
    if (config.styleProfile) setStyleProfile({ ...DEFAULT_STYLE_PROFILE, ...config.styleProfile });
    if (config.targetReader) setTargetReader(config.targetReader);
    toast.success("Impostazioni corrette automaticamente.");
  };

  const applyPreset = (presetId: string) => {
    const preset = STYLE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setStyleProfile((prev) => ({ ...prev, ...preset.profile, presetId }));
    setTone(preset.label);
  };

  const applyStudioGenre = (id: string, opts?: { force?: boolean; featuredSubgenre?: string }) => {
    const newLevel1 = resolveLevel1FromBookTypeId(id);
    const prevLevel1 = resolveLevel1FromBookTypeId(bookTypeId);
    if (!opts?.force && newLevel1 !== prevLevel1) {
      setPendingBookTypeId(id);
      setPendingFeaturedSubgenre(opts?.featuredSubgenre);
      setShowTypeChangeModal(true);
      return;
    }

    const g = visibleGenres.find((x) => x.id === id) || STUDIO_GENRES.find((x) => x.id === id);
    if (!g) return;

    if (newLevel1 !== prevLevel1) {
      const draft = normalizeBookConfig({
        bookTypeId: id,
        genre: g.genre,
        category: g.category,
        subcategory: g.defaultSubcategory,
        subgenre: opts?.featuredSubgenre || g.defaultSubcategory,
        tone,
        authorStyle: STYLE_PRESETS.find((p) => p.id === styleProfile.presetId)?.label || "Bestseller Commerciale",
        styleProfile,
      } as BookConfig);
      const { config: reset } = resetConfigForLevel1Change(draft, newLevel1, prevLevel1);
      setTone(reset.tone);
      setStyleProfile({ ...DEFAULT_STYLE_PROFILE, ...(reset.styleProfile || {}) });
      setSubcategory(reset.subcategory);
      setSubgenre(opts?.featuredSubgenre || reset.subgenre || reset.subcategory);
      setLevel1BookType(newLevel1);
      toast.info("Impostazioni aggiornate per mantenere coerenza narrativa.");
    } else {
      setSubgenre((current) => opts?.featuredSubgenre || current || g.defaultSubcategory);
    }

    setBookTypeId(g.id);
    setGenre(g.genre);
    setCategory(g.category);
    if (newLevel1 === prevLevel1) {
      setSubcategory(g.defaultSubcategory);
      if (!opts?.featuredSubgenre) setSubgenre((current) => current || g.defaultSubcategory);
    }
    setSubchaptersEnabled(g.defaultSubchapters);
  };

  const confirmTypeChange = () => {
    if (!pendingBookTypeId) return;
    applyStudioGenre(pendingBookTypeId, { force: true, featuredSubgenre: pendingFeaturedSubgenre });
    setShowTypeChangeModal(false);
    setPendingBookTypeId(null);
    setPendingFeaturedSubgenre(undefined);
  };

  const applyFeaturedBookType = (type: (typeof FEATURED_BOOK_TYPES)[number]) => {
    applyStudioGenre(type.id, { featuredSubgenre: type.subgenre });
  };

  const applyInference = (inference: GenreInference, opts?: { keepTitle?: boolean }) => {
    applyStudioGenre(inference.bookTypeId, { force: true, featuredSubgenre: inference.subgenre });
    setGenre(inference.genre);
    setCategory(inference.category);
    setSubcategory(inference.subcategory);
    setSubgenre(inference.subgenre);
    setTone(inference.tone);
    if (!targetReader.trim()) setTargetReader(inference.targetReader);
    if (!narrativePromise.trim()) setNarrativePromise(inference.narrativePromise);
    if (!commercialGoal.trim()) setCommercialGoal(inference.commercialGoal);
    if (!chapters || chapters < 6) setChapters(inference.suggestedChapters);
    setCoherenceDismissed(false);
    toast.success("Configurazione aggiornata dal DNA del titolo.");
  };

  const applyTitleProposal = (proposal: TitleProposal) => {
    setTitle(proposal.title);
    setSubtitle(proposal.subtitle);
    applyInference(proposal.inference, { keepTitle: true });
  };

  const runMagicalTitleGeneration = async () => {
    if (!idea.trim() && !title.trim()) {
      toast.error("Scrivi almeno un'idea o un titolo di partenza.");
      return;
    }
    setGeneratingTitles(true);
    setTitleProposals([]);
    try {
      const remaining = getWizardTitleFreeRegensRemaining();
      if (remaining <= 0) {
        const { chargePremiumOperation } = await import("@/lib/billing/charge");
        await chargePremiumOperation("wizard_title_regeneration", { source: "wizard_title_forge" });
      } else {
        consumeWizardTitleFreeRegen();
        setFreeTitleRegensLeft(getWizardTitleFreeRegensRemaining());
      }

      await runTitleForgeAnimation((idx, text) => {
        setTitleForgePhase(idx);
        setTitleForgeLabel(text);
      });

      const titleForgeContext: TitleForgeContext = {
        bookTypeId,
        level1BookType,
        forgePresetId,
        category,
        subcategory,
        subgenre,
      };
      const titleForgeLocksBookType =
        level1BookType === "manuale" ||
        ["manual", "manuale", "technical-manual", "software-guide", "ai-tools-guide", "handbook", "guide", "guida", "workbook", "study", "educational", "education", "cookbook"].includes(String(bookTypeId || "").toLowerCase());

      const proposals = generateWizardTitleProposals(title, idea, language, String(Date.now()), titleForgeContext);
      setTitleProposals(proposals);
      if (onDetectIntent && idea.trim().length >= 6 && !titleForgeLocksBookType) {
        try {
          const detected = await onDetectIntent(idea.trim(), language);
          if (detected?.suggestedTitles?.length) {
            const best = Math.max(0, Math.min(2, detected.bestTitleIndex || 0));
            const remoteTitle = detected.suggestedTitles[best];
            const remoteSub = detected.suggestedSubtitles?.[best] || "";
            if (remoteTitle) {
              proposals[0] = {
                ...proposals[0],
                title: remoteTitle,
                subtitle: remoteSub || proposals[0].subtitle,
              };
              setTitleProposals([...proposals]);
            }
            if (detected.genre) {
              const remoteInference = inferGenreFromText(remoteTitle || title, `${idea} ${detected.genre} ${detected.subcategory || ""}`);
              proposals[0] = { ...proposals[0], inference: remoteInference, perceivedGenre: remoteInference.label };
              setTitleProposals([...proposals]);
            }
          }
        } catch { /* local proposals still shown */ }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Crediti insufficienti o rigenerazione non disponibile.");
    } finally {
      setGeneratingTitles(false);
    }
  };

  const applyPreflightAutofill = () => {
    const config = buildConfig();
    const patch = buildWizardAutofillPatch(config, textInference, {
      narrativePromise,
      commercialGoal,
      coreConflict,
      setting,
      openingHook,
    });
    if (patch.bookTypeId) applyStudioGenre(patch.bookTypeId, { force: true, featuredSubgenre: patch.subgenre });
    if (patch.genre) setGenre(patch.genre);
    if (patch.category) setCategory(patch.category);
    if (patch.subcategory) setSubcategory(patch.subcategory);
    if (patch.subgenre) setSubgenre(patch.subgenre);
    if (patch.tone) setTone(patch.tone);
    if (patch.targetReader) setTargetReader(patch.targetReader);
    if (patch.narrativePromise && !narrativePromise.trim()) setNarrativePromise(patch.narrativePromise);
    if (patch.commercialGoal && !commercialGoal.trim()) setCommercialGoal(patch.commercialGoal);
    if (patch.chapters) setChapters(patch.chapters);
    if (patch.subtitle && !subtitle.trim()) setSubtitle(patch.subtitle);
    applyCoherenceAutoFix();
    const merged = normalizeBookConfig({
      ...config,
      ...(patch.genre ? { genre: patch.genre } : {}),
      ...(patch.category ? { category: patch.category } : {}),
      ...(patch.subcategory ? { subcategory: patch.subcategory } : {}),
      ...(patch.subgenre ? { subgenre: patch.subgenre } : {}),
      ...(patch.tone ? { tone: patch.tone } : {}),
      ...(patch.targetReader ? { targetReader: patch.targetReader } : {}),
      ...(patch.chapters ? { numberOfChapters: patch.chapters } : {}),
      ...(patch.subtitle ? { subtitle: patch.subtitle } : {}),
      ...(patch.bookTypeId ? { bookTypeId: patch.bookTypeId } : {}),
    });
    setPreflightResult(runBlueprintPreflight(merged, identityDraft));
    toast.success("Campi completati automaticamente.");
  };

  const applyGuidedStarter = (starter: (typeof GUIDED_STARTERS)[number]) => {
    applyStudioGenre(starter.bookTypeId);
    if (!title.trim()) setTitle(starter.title);
    if (!subtitle.trim()) setSubtitle(starter.subtitle);
    setGenre(starter.genre);
    setSubgenre(starter.subgenre);
    setTone(starter.tone);
    setTargetReader(starter.targetReader);
    setIdea(starter.idea);
    setCoreConflict(starter.conflict);
    setNarrativePromise(starter.promise);
    setSetting(starter.setting);
    setOpeningHook(starter.hook);
    setCommercialGoal(starter.commercialGoal);
    setVoiceConsistency("Non cambiare voce, desiderio, ferita, ritmo emotivo o promessa del libro durante i capitoli. La crescita deve essere graduale.");
    setCharacters((current) => current.some((character) => character.name.trim())
      ? current
      : [
          {
            name: "Protagonista",
            role: "Centro emotivo della storia",
            externalDesire: starter.conflict,
            wound: "Ferita coerente con il conflitto principale",
            secret: "Una verità che deve emergere gradualmente",
            personality: "Contraddittoria, specifica, non perfetta",
          },
        ]);
    toast.success(`${starter.label}: percorso guidato applicato.`);
  };

  const goNext = async () => {
    if (step === 0) {
      if (!title.trim()) {
        toast.error("Inserisci il titolo del libro, oppure genera titoli magici dalla tua idea.");
        return;
      }
      if (!genre || showCoherenceWarning) {
        const inf = textInference;
        if (showCoherenceWarning && !coherenceDismissed) {
          toast.error("Titolo e categoria non sono allineati. Correggi automaticamente o conferma la scelta.");
          return;
        }
        if (inf.confidence !== "low") applyInference(inf);
      }
    }
    if (step === 1) {
      if (!identityDraft.penName?.trim() && !authorName.trim()) {
        toast.error("Serve il nome autore in copertina prima di continuare.");
        return;
      }
      if (!targetReader.trim()) {
        toast.message("Manca il pubblico ideale: lo suggerisco dal titolo.");
        applyInference(textInference);
      }
      saveAuthorIdentity({ ...identityDraft, penName: identityDraft.penName || authorName, language });
    }
    if (step === 2 && chapters < 1) {
      toast.error("Imposta il numero di capitoli per la struttura del libro.");
      return;
    }
    if (step === 5 && validationIssues.length) {
      toast.error("Completa i campi mancanti prima di continuare.");
      return;
    }
    if (step === 6) {
      if (useGuidedInterview && !dnaConfirmed) {
        toast.error("Conferma il DNA del libro prima di generare il blueprint.");
        setShowAdvancedForge(true);
        return;
      }

      if (!onGenerateBlueprint) {
        const config = buildConfig();
        onStudioComplete?.({ config, mode: "studio-draft" });
        onClose();
        return;
      }

      const preflight = runBlueprintPreflight(buildConfig(), identityDraft);
      setPreflightResult(preflight);
      if (!preflight.ready) {
        toast.message(preflight.humanSummary);
        return;
      }

      setGeneratingBlueprint(true);
      setBlueprintError(null);
      try {
        const config = buildConfig();
        const bp = await onGenerateBlueprint(config);
        setBlueprintPreview(bp);
        setStep(7);
      } catch (e) {
        const message = humanizeBlueprintError(e, buildConfig());
        setBlueprintError(message);
        toast.error(message);
      } finally {
        setGeneratingBlueprint(false);
      }
      return;
    }
    setStep((s) => Math.min(STUDIO_STEPS.length - 1, s + 1));
  };

  const updateBlueprintChapterTitle = (chapterIndex: number, value: string) => {
    setBlueprintPreview((current) => {
      if (!current) return current;

      return {
        ...current,
        chapterOutlines: current.chapterOutlines.map((outline, index) =>
          index === chapterIndex
            ? { ...outline, title: value }
            : outline
        ),
      };
    });
  };

  const updateBlueprintSubchapterTitle = (
    chapterIndex: number,
    subchapterIndex: number,
    value: string
  ) => {
    setBlueprintPreview((current) => {
      if (!current) return current;

      return {
        ...current,
        chapterOutlines: current.chapterOutlines.map((outline, index) => {
          if (index !== chapterIndex) return outline;

          const subchapters = Array.isArray((outline as any).subchapters)
            ? (outline as any).subchapters
            : [];

          return {
            ...outline,
            subchapters: subchapters.map((subchapter: any, subIndex: number) =>
              subIndex === subchapterIndex
                ? { ...subchapter, title: value }
                : subchapter
            ),
          };
        }),
      };
    });
  };

  const finishApproved = async () => {
    if (!blueprintPreview) {
      toast.error("Genera e rivedi il blueprint prima di approvare.");
      return;
    }
    setLaunching(true);
    try {
      const config = buildConfig();
      const payload: StudioLaunchPayload = {
        config: { ...config, configStatus: "approved" },
        blueprint: blueprintPreview,
        blueprintApproved: true,
        mode: "studio-approved",
      };
      if (onStudioComplete) {
        onStudioComplete(payload);
        sessionStorage.removeItem(STUDIO_DRAFT_STORAGE_KEY);
        onClose();
        return;
      }
      onManualStudio?.(config);
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Avvio non riuscito");
    } finally {
      setLaunching(false);
    }
  };

  const detectFromIdea = async () => {
    if (idea.trim().length < 6) {
      toast.error("Scrivi almeno qualche riga di idea: anche grezza va bene.");
      return;
    }
    const local = inferGenreFromText(title, idea);
    applyInference(local);
    if (!onDetectIntent) return;
    try {
      const detected = await onDetectIntent(idea.trim(), language);
      if (detected?.suggestedTitles?.length && !title.trim()) {
        const best = Math.max(0, Math.min(2, detected.bestTitleIndex || 0));
        setTitle(detected.suggestedTitles[best] || "");
        setSubtitle(detected.suggestedSubtitles?.[best] || "");
      }
      if (detected?.numberOfChapters) setChapters(detected.numberOfChapters);
      if (detected?.genre || detected?.subcategory) {
        const merged = inferGenreFromText(title || detected.suggestedTitles?.[0] || "", `${idea} ${detected.genre || ""} ${detected.subcategory || ""}`);
        applyInference(merged);
      }
      toast.success("Suggerimenti applicati dall'idea.");
    } catch {
      toast.message("Analisi cloud non disponibile: ho applicato l'inferenza locale dal testo.");
    }
  };

  return (
    <div className="scriptora-modal-overlay fixed inset-0 z-[80] flex items-stretch justify-stretch overflow-hidden bg-black/70 p-[calc(env(safe-area-inset-top,0px)+0.35rem)_0.35rem_calc(env(safe-area-inset-bottom,0px)+0.35rem)] backdrop-blur-sm sm:items-center sm:justify-center sm:p-4">
      <div
        className="scriptora-modal-panel scriptora-wizard-shell flex h-full min-h-0 w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-slate-950 shadow-2xl"
          style={{
            height: "calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 0.7rem)",
            maxHeight: "calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 0.7rem)",
          }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5 sm:py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300">
                {forgePresetId ? "Scriptora Forge" : "Book Configuration Studio"}
              </p>
            <p className="text-sm font-semibold text-white">
                {forgePresetId ? `Preset: ${forgePresetLabel || "Libro rapido"}` : `Macro step ${step + 1}/${STUDIO_STEPS.length} — ${stepLabel}`}
              </p>
            <p className="mt-0.5 text-[11px] text-white/45">
                {useGuidedInterview
                  ? "Book Forge · intervista chat-first fino al DNA Lock"
                  : forgePresetId
                    ? "Configurazione rapida: controlla solo titolo, autore, lingua e idea."
                    : "20 decisioni guidate prima della generazione reale"}
              </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
            className="scriptora-modal-body scriptora-wizard-scroll min-h-0 flex-1 overflow-x-clip overflow-y-auto overscroll-contain px-4 py-4 sm:px-5 sm:py-5"
            style={{
              WebkitOverflowScrolling: "touch",
              overflowY: "auto",
              touchAction: "pan-y",
            }}
          >
          {step === 0 && mobileInterviewMode ? (
            <div className="flex min-h-[calc(100dvh-11rem)] flex-col">
              <GuidedInterviewPanel
                selectedGenre={mapForgeGenreToInterviewGenre(forgePresetId, bookTypeId)}
                language={language}
                variant="mobile"
                onComplete={handleInterviewCompleteFactory({
                  setNarrativePromise,
                  setCoreConflict,
                  setSetting,
                  setVoiceConsistency,
                  setCommercialGoal,
                  setTargetReader,
                  setShowAdvancedForge,
                })}
                onConfirmDna={() => {
                  setDnaConfirmed(true);
                  setShowAdvancedForge(true);
                }}
                onContinueInterview={() => {
                  setDnaConfirmed(false);
                  setShowAdvancedForge(false);
                }}
              />
            </div>
          ) : step === 0 && (
            <div className="space-y-3">
              <h2 className="text-xl font-semibold text-white">
                  {forgePresetId === "poetry" ? "Crea raccolta poetica" : forgePresetId ? `Crea ${forgePresetLabel || "libro"}` : "Crea libro"}
                </h2>
              <p className="text-sm text-white/65">
                  {forgePresetId === "poetry"
                    ? "Hai scelto Poesie: Scriptora userà sezioni poetiche, versi liberi, immagini, ritmo e silenzi. Niente dark romance, niente romanzo, niente saggio mascherato."
                    : forgePresetId
                      ? "Hai scelto un preset Forge: Scriptora ha già impostato struttura, tono e direzione. Controlla solo i campi essenziali."
                      : "Se parti da zero, scegli uno starter. Se hai già un'idea, scrivila: Scriptora la trasforma in una direzione editoriale."}
                </p>

              {!forgePresetId && <GuidedDecisionRail activeIndex={0} />}

              {!forgePresetId && (
              <div className="grid gap-2 md:grid-cols-3">
                {GUIDED_STARTERS.map((starter) => (
                  <button
                    key={starter.id}
                    type="button"
                    onClick={() => applyGuidedStarter(starter)}
                    className="rounded-2xl border border-white/12 bg-white/[0.055] p-3 text-left transition-colors hover:border-sky-300/35 hover:bg-sky-400/10"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-200/70">Starter guidato</span>
                    <span className="mt-2 block text-sm font-bold text-white">{starter.label}</span>
                    <span className="mt-1 line-clamp-2 text-[11px] leading-4 text-white/58">{starter.promise}</span>
                  </button>
                ))}
              </div>
              )}

              <label className="block space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/52">Titolo reale</span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={forgePresetId === "poetry" ? "Es. Geografia delle cose non dette" : "Es. La Cattedrale delle Anime Dimenticate"} className={inputClass} />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/52">Sottotitolo / promessa</span>
                <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder={forgePresetId === "poetry" ? "Es. Poesie sul silenzio, la memoria e la rinascita" : "Es. Ogni segreto ha un prezzo. Ogni anima reclama il proprio debito."} className={inputClass} />
              </label>

              {forgePresetId !== "poetry" && (
                <div className="rounded-2xl border border-violet-400/25 bg-gradient-to-br from-violet-500/10 via-sky-500/5 to-transparent p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-200/80">Forgia titoli magica</p>
                      <p className="mt-1 text-xs text-white/55">3–5 proposte titolo + sottotitolo allineate al filone editoriale.</p>
                    </div>
                    <button
                      type="button"
                      disabled={generatingTitles}
                      onClick={() => void runMagicalTitleGeneration()}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-sky-500 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                    >
                      {generatingTitles ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      {generatingTitles ? "Forgia in corso…" : "Genera titoli magici"}
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] text-white/45">
                    {freeTitleRegensLeft > 0
                      ? `Rigenerazioni gratuite rimaste: ${freeTitleRegensLeft}/${WIZARD_TITLE_FREE_REGENS}`
                      : "Nuova rigenerazione premium: 35 crediti"}
                  </p>
                  {generatingTitles && (
                    <div className="mt-4 space-y-2">
                      <div className="flex gap-1">
                        {TITLE_FORGE_PHASES.map((_, i) => (
                          <span key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= titleForgePhase ? "bg-violet-400" : "bg-white/10"}`} />
                        ))}
                      </div>
                      <p className="text-sm font-medium text-violet-100 animate-pulse">{titleForgeLabel || TITLE_FORGE_PHASES[0]}</p>
                    </div>
                  )}
                  {titleProposals.length > 0 && !generatingTitles && (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {titleProposals.map((proposal) => (
                        <button
                          key={`${proposal.title}-${proposal.badge}`}
                          type="button"
                          onClick={() => applyTitleProposal(proposal)}
                          className="rounded-xl border border-white/12 bg-white/[0.05] p-3 text-left transition-colors hover:border-violet-300/40 hover:bg-violet-400/10"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-bold text-white">{proposal.title}</span>
                            <span className="shrink-0 rounded-full border border-violet-300/30 bg-violet-300/10 px-2 py-0.5 text-[9px] font-bold text-violet-100">{proposal.badge}</span>
                          </div>
                          <p className="mt-1 text-[11px] leading-4 text-white/60">{proposal.subtitle}</p>
                          <p className="mt-2 text-[10px] text-sky-200/80">{proposal.perceivedGenre} · Hook {proposal.hookScore}/100</p>
                          <p className="mt-1 text-[10px] leading-4 text-white/45">{proposal.rationale}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="mb-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowAdvancedForge(v => !v)}
                  className="rounded-full border border-white/12 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-white/70 hover:bg-white/[0.08]"
                >
                  {showAdvancedForge
                    ? "Nascondi modalità avanzata"
                    : "⚙️ Modalità avanzata"}
                </button>
              </div>


              <div className="mb-4 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-200/80">
                      Forge intelligente
                    </p>

                    <p className="mt-1 text-sm text-white/65">
                      Lascia che Scriptora ti intervisti e costruisca il libro sotto il cofano.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUseGuidedInterview(v => !v);
                      setDnaConfirmed(false);
                    }}
                    className="rounded-full border border-white/12 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-white/70"
                  >
                    {useGuidedInterview
                      ? "✨ Intervista attiva"
                      : "⚙️ Manuale"}
                  </button>
                </div>

                {useGuidedInterview && (
                  <div className={`mt-4 overflow-hidden rounded-[28px] ${isMobileViewport ? "h-[min(72dvh,680px)]" : "h-[620px]"}`}>
                    <GuidedInterviewPanel
                      selectedGenre={mapForgeGenreToInterviewGenre(
                        forgePresetId,
                        bookTypeId
                      )}
                      language={language}
                      variant={isMobileViewport ? "mobile" : "desktop"}
                      onComplete={handleInterviewCompleteFactory({
                        setNarrativePromise,
                        setCoreConflict,
                        setSetting,
                        setVoiceConsistency,
                        setCommercialGoal,
                        setTargetReader,
                        setShowAdvancedForge,
                      })}
                      onConfirmDna={() => {
                        setDnaConfirmed(true);
                        setShowAdvancedForge(true);
                      }}
                      onContinueInterview={() => {
                        setDnaConfirmed(false);
                        setShowAdvancedForge(false);
                      }}
                    />
                  </div>
                )}

                {useGuidedInterview && dnaConfirmed && (
                  <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs text-emerald-100">
                    ✅ DNA del libro confermato. Scriptora può usare questa identità come blocco anti-drift prima del blueprint.
                  </div>
                )}
              </div>

              <label className="block space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/52">Nome autore</span>
                <input value={authorName} onChange={(e) => setAuthorName(e.target.value)} placeholder="Nome in copertina" className={inputClass} />
              </label>
              <select value={language} onChange={(e) => setLanguage(e.target.value as Language)} className={inputClass}>
                {STUDIO_LANGUAGES.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
              </select>
              <select value={amazonMarketplace} onChange={(e) => setAmazonMarketplace(e.target.value)} className={inputClass}>
                {AMAZON_MARKETPLACES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
              {showAdvancedForge && (
                <>
                  {forgePresetId !== "poetry" && (
                    <div className="rounded-2xl border border-white/12 bg-white/[0.04] p-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/52">
                        Tipi libro principali
                      </p>

                      <p className="mt-1 text-xs leading-5 text-white/50">
                        Se non sai da dove partire, scegli un formato:
                        Scriptora imposta genere, struttura e sottogenere.
                      </p>

                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {filteredFeaturedTypes.map((type) => {
                          const option = STUDIO_GENRES.find((g) => g.id === type.id);
                          if (!option) return null;

                          const active =
                            bookTypeId === option.id &&
                            (!type.subgenre || subgenre === type.subgenre);

                          return (
                            <button
                              key={`${type.id}-${type.label}`}
                              type="button"
                              onClick={() => applyFeaturedBookType(type)}
                              className={`min-h-[86px] rounded-xl border p-2.5 text-left transition-colors ${
                                active
                                  ? "border-sky-300/55 bg-sky-400/15 text-sky-50"
                                  : "border-white/12 bg-white/[0.045] text-white/72 hover:border-white/22 hover:bg-white/[0.075]"
                              }`}
                            >
                              <span className="block text-xs font-bold leading-4">
                                {type.label}
                              </span>

                              <span className="mt-1 block text-[10px] leading-4 text-white/50">
                                {type.helper}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {forgePresetId === "poetry" ? (
                    <div className="rounded-2xl border border-sky-300/20 bg-sky-400/10 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-200/80">
                        Raccolta poetica configurata
                      </p>

                      <p className="mt-1 text-sm font-semibold text-white">
                        Poesie · Versi liberi · Sezioni emotive
                      </p>

                      <p className="mt-1 text-xs leading-5 text-white/55">
                        Scriptora userà una struttura da raccolta poetica,
                        non da romanzo.
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      <select
                        value={bookTypeId}
                        onChange={(e) => applyStudioGenre(e.target.value)}
                        className={inputClass}
                      >
                        {visibleGenres.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.label} ({g.family})
                          </option>
                        ))}
                      </select>

                      <input
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="Categoria"
                        className={inputClass}
                      />

                      <input
                        value={subcategory}
                        onChange={(e) => setSubcategory(e.target.value)}
                        placeholder="Sottocategoria"
                        className={inputClass}
                      />

                      <input
                        value={subgenre}
                        onChange={(e) => {
                          setSubgenre(e.target.value);
                          setCoherenceDismissed(false);
                        }}
                        placeholder="Sottogenere (opzionale)"
                        className={inputClass}
                      />
                    </div>
                  )}

                  <div className="rounded-2xl border border-white/12 bg-white/[0.04] p-3">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/52">
                      Obiettivo commerciale
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {COMMERCIAL_GOAL_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setCommercialGoal(preset)}
                          className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
                            commercialGoal === preset
                              ? "border-emerald-300/50 bg-emerald-300/15 text-emerald-100"
                              : "border-white/12 text-white/65 hover:bg-white/[0.07]"
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>

                    <textarea
                      value={commercialGoal}
                      onChange={(e) => setCommercialGoal(e.target.value)}
                      rows={2}
                      placeholder="Oppure scrivi tu l'obiettivo: Amazon, BookTok, saga, manuale pratico..."
                      className={`${inputClass} mt-3`}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">Identità autore</h2>
                {onAuthorIdentity && (
                  <button type="button" onClick={onAuthorIdentity} className="text-xs text-sky-300">Apri Identity OS</button>
                )}
              </div>
              <input value={identityDraft.penName || authorName} onChange={(e) => setIdentityDraft((d) => ({ ...d, penName: e.target.value }))} placeholder="Pen name *" className={inputClass} />
              <textarea value={identityDraft.biography || ""} onChange={(e) => setIdentityDraft((d) => ({ ...d, biography: e.target.value }))} rows={3} placeholder="Bio breve *" className={inputClass} />
              <textarea value={identityDraft.voice || ""} onChange={(e) => setIdentityDraft((d) => ({ ...d, voice: e.target.value }))} rows={2} placeholder="Voce narrativa *" className={inputClass} />
              <input value={targetReader} onChange={(e) => setTargetReader(e.target.value)} placeholder="Target lettore" className={inputClass} />
              <div className="flex flex-wrap gap-2">
                {filteredTargetPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTargetReader(preset)}
                    className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${targetReader === preset ? "border-sky-300/50 bg-sky-300/15 text-sky-100" : "border-white/12 text-white/65 hover:bg-white/[0.07]"}`}
                  >
                    {preset.slice(0, 42)}…
                  </button>
                ))}
              </div>
              <input value={referenceAuthors} onChange={(e) => setReferenceAuthors(e.target.value)} placeholder="Autori di riferimento" className={inputClass} />
              <input value={identityDraft.archetype || ""} onChange={(e) => setIdentityDraft((d) => ({ ...d, archetype: e.target.value }))} placeholder="Stile prevalente / archetipo" className={inputClass} />
              {!isUserAuthorIdentityConfigured(identityDraft) && (
                <p className="text-xs text-amber-200">Completa pen name, bio e voce narrativa per sbloccare il blueprint.</p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Configurazione libro</h2>
              <label className="block text-sm text-white/70">Capitoli: {chapters}
                <input type="range" min={6} max={32} value={chapters} onChange={(e) => setChapters(Number(e.target.value))} className="mt-2 w-full accent-emerald-400" />
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["short", "medium", "long"] as const).map((len) => (
                  <button key={len} type="button" onClick={() => { setChapterLength(len); if (!isFree) setBookLength(len); }}
                    className={`rounded-xl border py-2 text-xs font-semibold capitalize ${chapterLength === len ? "border-emerald-400/50 bg-emerald-400/12 text-emerald-100" : "border-white/12 text-white/65"}`}>
                    Capitoli {len}
                  </button>
                ))}
              </div>
              <label className="flex items-center justify-between rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm text-white">
                Sottocapitoli
                <input type="checkbox" checked={subchaptersEnabled} onChange={(e) => setSubchaptersEnabled(e.target.checked)} />
              </label>
              {subchaptersEnabled && (
                <label className="block text-sm text-white/70">Sottocapitoli per capitolo: {subchaptersPerChapter}
                  <input type="range" min={1} max={5} value={subchaptersPerChapter} onChange={(e) => setSubchaptersPerChapter(Number(e.target.value))} className="mt-2 w-full accent-sky-400" />
                </label>
              )}
              {([
                ["frontMatterEnabled", "Front Matter"],
                ["backMatterEnabled", "Back Matter"],
                ["acknowledgmentsEnabled", "Ringraziamenti"],
                ["ctaEnabled", "CTA finale"],
                ["bibliographyEnabled", "Bibliografia"],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center justify-between rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm text-white">
                  {label}
                  <input type="checkbox" checked={matterOptions[key]} onChange={(e) => setMatterOptions((m) => ({ ...m, [key]: e.target.checked }))} />
                </label>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-semibold text-white">Personaggi</h2>
                <div className="flex gap-2">
                  <button type="button" disabled={generatingCharacter} onClick={async () => {
                    setGeneratingCharacter(true);
                    try {
                      const remaining = getWizardCharacterFreeRegensRemaining();
                      if (remaining <= 0) {
                        const { chargePremiumOperation } = await import("@/lib/billing/charge");
                        await chargePremiumOperation("character_studio_ai", { source: "wizard_character_generate" });
                      } else {
                        consumeWizardCharacterFreeRegen();
                        setFreeRegensLeft(getWizardCharacterFreeRegensRemaining());
                      }
                      const generated = generateWizardCharacter(`${idea}|${Date.now()}`);
                      setCharacters((list) => [...list.filter((c) => c.name?.trim()), generated]);
                      toast.success("Personaggio generato.");
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Errore generazione");
                    } finally {
                      setGeneratingCharacter(false);
                    }
                  }} className="inline-flex items-center gap-1 rounded-lg border border-sky-400/30 bg-sky-400/12 px-2.5 py-1 text-[11px] font-semibold text-sky-100">
                    {generatingCharacter ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                    Genera
                  </button>
                  <button type="button" onClick={() => setCharacters((c) => [...c, emptyCharacter()])} className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1 text-[11px] text-white/80">
                    <Plus className="h-3 w-3" /> Aggiungi
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-white/55">Rigenerazioni gratuite: {freeRegensLeft}</p>
              {characters.map((ch, idx) => (
                <div key={idx} className="rounded-xl border border-white/12 bg-white/5 p-3 space-y-2">
                  <div className="flex gap-2">
                    <input value={ch.name} onChange={(e) => setCharacters((list) => list.map((c, i) => i === idx ? { ...c, name: e.target.value } : c))} placeholder="Nome" className={inputClass} />
                    <button type="button" onClick={() => setCharacters((list) => list.filter((_, i) => i !== idx))} className="rounded-lg p-2 text-white/50 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  {([["role", "Ruolo"], ["externalDesire", "Obiettivo"], ["wound", "Ferita"], ["secret", "Segreto"], ["personality", "Arco narrativo"]] as const).map(([field, ph]) => (
                    <input key={field} value={String(ch[field] || "")} onChange={(e) => setCharacters((list) => list.map((c, i) => i === idx ? { ...c, [field]: e.target.value } : c))} placeholder={ph} className={inputClass} />
                  ))}
                </div>
              ))}
              <p className="text-[11px] text-white/50 flex items-center gap-1"><Users className="h-3 w-3" /> Salvati nella Story Bible del progetto.</p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Stile e tono</h2>
              <div className="flex flex-wrap gap-2">
                {STYLE_PRESETS.map((p) => (
                  <button key={p.id} type="button" onClick={() => applyPreset(p.id)}
                    className={`rounded-full border px-3 py-1 text-[11px] font-medium ${styleProfile.presetId === p.id ? "border-amber-300/50 bg-amber-400/15 text-amber-100" : "border-white/12 text-white/70"}`}>
                    {p.label}
                  </button>
                ))}
              </div>
              <input value={tone} onChange={(e) => setTone(e.target.value)} placeholder="Tono editoriale" className={inputClass} />
              {([
                ["voiceIntensity", "Voce autore"], ["emotionalIntensity", "Livello emotivo"], ["dialogueLevel", "Intensità dialoghi"],
                ["poeticLevel", "Intensità descrizioni"], ["narrativePace", "Ritmo narrativo"], ["tensionIntensity", "Livello tensione"],
                ["psychologicalDepth", "Livello dettaglio"],
              ] as const).map(([key, label]) => (
                <label key={key} className="block">
                  <span className="mb-1 flex justify-between text-[11px] text-white/70"><span>{label}</span><span>{styleProfile[key]}%</span></span>
                  <input type="range" min={0} max={100} value={styleProfile[key]} onChange={(e) => setStyleProfile((p) => ({ ...p, [key]: Number(e.target.value) }))} className="w-full accent-sky-400" />
                </label>
              ))}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-white">Validazione progetto</h2>
              {coherenceReport && coherenceReport.needsCorrection && (
                <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-semibold">Abbiamo rilevato alcune impostazioni incoerenti.</p>
                      <p className="mt-1 text-xs text-amber-100/80">
                        Coerenza complessiva: {coherenceReport.overall}/100
                        {coherenceReport.suggestedFixes.length > 0
                          ? ` · ${coherenceReport.suggestedFixes.length} correzioni disponibili`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={applyCoherenceAutoFix}
                    className="rounded-lg border border-amber-200/40 bg-amber-200/15 px-3 py-2 text-xs font-semibold text-amber-50 hover:bg-amber-200/25"
                  >
                    Correggi automaticamente
                  </button>
                </div>
              )}
              {validationIssues.length === 0 ? (
                <div className="flex items-start gap-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <p>Configurazione completa. Puoi generare il blueprint.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {validationIssues.map((issue) => (
                    <div key={issue.id} className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>Step {issue.step}: {issue.message}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="rounded-xl border border-white/12 bg-white/5 p-4 text-xs text-white/70 space-y-1">
                <p><strong className="text-white">Titolo:</strong> {title || "—"}</p>
                <p><strong className="text-white">Autore:</strong> {authorName || identityDraft.penName}</p>
                <p><strong className="text-white">Genere:</strong> {genre} / {subcategory}</p>
                <p><strong className="text-white">Capitoli:</strong> {chapters}{subchaptersEnabled ? ` · ${subchaptersPerChapter} sottocapitoli` : ""}</p>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-sky-300/25 bg-sky-400/10 shadow-[0_0_40px_rgba(56,189,248,0.16)]">
                <BookOpen className="h-6 w-6 text-sky-200" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">Generazione Blueprint</h2>
                <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/65">
                  Scriptora costruirà premessa, struttura, capitoli{subchaptersEnabled ? ", sottocapitoli" : ""}, front e back matter.
                </p>
              </div>
              {generatingBlueprint ? (
                <BlueprintForgePanel elapsedSeconds={blueprintElapsedSeconds} />
              ) : blueprintError ? (
                <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-left">
                  <p className="text-sm font-semibold text-rose-100">Blueprint non completato — controlliamo i punti critici</p>
                  <p className="mt-1 text-xs leading-5 text-rose-100/70">
                    {blueprintError}
                  </p>
                  <p className="mt-3 text-[11px] leading-4 text-white/45">
                    Controlla gli step precedenti: quelli incompleti o dubbi devono indicare chiaramente cosa manca. Nessun contenuto tecnico è stato salvato nel libro.
                  </p>
                </div>
              ) : preflightResult && !preflightResult.ready ? (
                <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-left space-y-3">
                  <p className="text-sm font-semibold text-amber-100">Completiamo il progetto</p>
                  <p className="text-xs leading-5 text-amber-100/75">{preflightResult.humanSummary}</p>
                  <ul className="space-y-2">
                    {preflightResult.issues.map((issue) => (
                      <li key={issue.id} className="flex items-start gap-2 text-xs text-amber-50/90">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>{issue.humanHint}</span>
                      </li>
                    ))}
                  </ul>
                  {preflightResult.issues.some((i) => i.autoFillable) && (
                    <button
                      type="button"
                      onClick={applyPreflightAutofill}
                      className="inline-flex items-center gap-2 rounded-xl border border-amber-200/40 bg-amber-200/15 px-4 py-2 text-xs font-bold text-amber-50"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Completa automaticamente con Scriptora
                    </button>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-white/12 bg-white/[0.045] p-4 text-left">
                  <p className="text-sm font-semibold text-white">Pronto per la forgia</p>
                  <p className="mt-1 text-xs leading-5 text-white/55">
                    Quando avvii, vedrai gli step di preparazione e un orologio live. La durata reale dipende dal modello AI e dalla complessità del libro.
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 7 && blueprintPreview && (
            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200/80">
                  Indice protagonista
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-white">Approvazione autore</h2>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  Rivedi e modifica i titoli prima dell’approvazione. Questi titoli diventeranno la struttura reale usata da Writer, generazione capitoli ed export.
                </p>
              </div>

              <div className="rounded-2xl border border-white/12 bg-white/[0.045] p-4 text-sm text-white/80 space-y-3">
                <p className="text-lg font-semibold text-white">{title}{subtitle ? `: ${subtitle}` : ""}</p>
                <p className="text-xs leading-relaxed text-white/60">
                  {blueprintPreview.overview.slice(0, 700)}{blueprintPreview.overview.length > 700 ? "…" : ""}
                </p>
                <div className="flex flex-wrap gap-2 text-[11px] text-white/55">
                  <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">
                    {blueprintPreview.chapterOutlines.length} capitoli pianificati
                  </span>
                  {subchaptersEnabled && (
                    <span className="rounded-full border border-violet-300/20 bg-violet-500/10 px-3 py-1 text-violet-100">
                      {subchaptersPerChapter} sottocapitoli per capitolo
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-amber-300/20 bg-amber-500/[0.06] p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">Indice modificabile</h3>
                    <p className="mt-1 text-xs leading-5 text-white/55">
                      Modifica i titoli qui. Non stai cambiando solo una preview: stai correggendo il blueprint che verrà approvato.
                    </p>
                  </div>
                  <span className="rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-100">
                    Live blueprint
                  </span>
                </div>

                <div className="max-h-[520px] space-y-4 overflow-y-auto pr-1">
                  {blueprintPreview.chapterOutlines.map((outline, chapterIndex) => {
                    const subchapters = Array.isArray((outline as any).subchapters)
                      ? (outline as any).subchapters
                      : [];

                    return (
                      <div
                        key={`editable-outline-${chapterIndex}`}
                        className="rounded-2xl border border-white/10 bg-black/25 p-4"
                      >
                        <label className="block">
                          <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200/80">
                            Capitolo {chapterIndex + 1}
                          </span>
                          <input
                            value={outline.title || ""}
                            onChange={(event) =>
                              updateBlueprintChapterTitle(chapterIndex, event.target.value)
                            }
                            className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-base font-semibold text-white outline-none focus:border-amber-300/50"
                            placeholder={`Titolo capitolo ${chapterIndex + 1}`}
                          />
                        </label>

                        {outline.summary && (
                          <p className="mt-3 rounded-xl bg-white/[0.035] p-3 text-xs leading-5 text-white/55">
                            {outline.summary}
                          </p>
                        )}

                        {subchapters.length > 0 && (
                          <div className="mt-4 space-y-2 border-l border-violet-300/20 pl-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-200/80">
                              Sottocapitoli
                            </p>

                            {subchapters.map((subchapter: any, subIndex: number) => (
                              <label
                                key={`editable-outline-${chapterIndex}-${subIndex}`}
                                className="block rounded-xl border border-white/8 bg-white/[0.035] p-3"
                              >
                                <span className="mb-1 block text-[10px] text-white/45">
                                  {chapterIndex + 1}.{subIndex + 1}
                                </span>
                                <input
                                  value={subchapter?.title || ""}
                                  onChange={(event) =>
                                    updateBlueprintSubchapterTitle(
                                      chapterIndex,
                                      subIndex,
                                      event.target.value
                                    )
                                  }
                                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm font-medium text-white outline-none focus:border-violet-300/50"
                                  placeholder={`Titolo sottocapitolo ${subIndex + 1}`}
                                />
                                {subchapter?.summary && (
                                  <p className="mt-2 text-[11px] leading-5 text-white/45">
                                    {subchapter.summary}
                                  </p>
                                )}
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="scriptora-wizard-footer flex shrink-0 items-center justify-between gap-3 border-t border-white/10 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-5 sm:py-4">
          <button type="button" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="inline-flex items-center gap-1 rounded-xl border border-white/15 px-4 py-2 text-sm text-white/80 disabled:opacity-30">
            <ArrowLeft className="h-4 w-4" /> Indietro
          </button>
          {step < 6 && (
            <button type="button" onClick={() => void goNext()} className="inline-flex items-center gap-1 rounded-xl bg-white px-5 py-2 text-sm font-bold text-slate-950">
              Avanti <ArrowRight className="h-4 w-4" />
            </button>
          )}
          {step === 6 && (
            <button type="button" disabled={generatingBlueprint} onClick={() => void goNext()}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-2 text-sm font-bold text-white disabled:opacity-50">
              {generatingBlueprint ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Genera Blueprint
            </button>
          )}
          {step === 7 && (
            <button type="button" disabled={launching} onClick={() => void finishApproved()}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-60">
              {launching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              Approva e apri Studio
            </button>
          )}
        </div>
      </div>

      {showTypeChangeModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-950 p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">Hai cambiato tipo di libro</h3>
            <p className="mt-2 text-sm leading-6 text-white/70">
              Alcune impostazioni verranno aggiornate automaticamente per mantenere qualità e coerenza narrativa.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowTypeChangeModal(false); setPendingBookTypeId(null); setPendingFeaturedSubgenre(undefined); }}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/75"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={confirmTypeChange}
                className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-bold text-white"
              >
                Aggiorna impostazioni
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GuidedDecisionRail({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="rounded-2xl border border-white/12 bg-white/[0.035] p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/52">Book Creation Super Flow</p>
        <span className="rounded-full border border-sky-300/25 bg-sky-300/10 px-2 py-1 text-[10px] font-semibold text-sky-100">
          20 passaggi guidati
        </span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {BOOK_CREATION_DECISIONS.map((decision, index) => (
          <span
            key={decision}
            className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
              index <= activeIndex
                ? "border-sky-300/40 bg-sky-300/12 text-sky-100"
                : "border-white/10 bg-white/[0.04] text-white/42"
            }`}
          >
            {index + 1}. {decision}
          </span>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-4 text-white/52">
        Ogni scelta alimenta blueprint, personaggi, struttura, mercato ed export. Puoi scrivere tu o usare gli starter.
      </p>
    </div>
  );
}

function BlueprintForgePanel({ elapsedSeconds }: { elapsedSeconds: number }) {
  const activeStep = Math.min(
    BLUEPRINT_FORGE_STEPS.length - 1,
    Math.floor(elapsedSeconds / 14),
  );
  const visualProgress = Math.min(92, 10 + elapsedSeconds * 1.1);
  const copy = BLUEPRINT_FORGE_COPY[activeStep] || BLUEPRINT_FORGE_COPY[BLUEPRINT_FORGE_COPY.length - 1];
  const slow = elapsedSeconds >= 45;

  return (
    <div className="overflow-hidden rounded-3xl border border-cyan-300/20 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),rgba(15,23,42,0.96)_48%,rgba(2,6,23,0.98))] p-4 text-left shadow-[0_24px_70px_rgba(8,47,73,0.35)] sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-200/70">Blueprint Forge</p>
          <p className="mt-1 text-sm font-semibold text-white">{copy}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-2xl border border-cyan-300/25 bg-black/35 px-3 py-2 shadow-[inset_0_0_24px_rgba(34,211,238,0.12)]">
          <Clock3 className="h-4 w-4 text-cyan-200" />
          <span className="font-mono text-2xl font-bold tabular-nums tracking-[0.16em] text-cyan-100 drop-shadow-[0_0_12px_rgba(103,232,249,0.65)]">
            {formatForgeTime(elapsedSeconds)}
          </span>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full border border-cyan-200/10 bg-black/35">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-fuchsia-300 shadow-[0_0_18px_rgba(56,189,248,0.55)] transition-[width] duration-700 ease-out"
          style={{ width: `${visualProgress}%` }}
        />
      </div>
      <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/35">
        Preparazione visuale · il tempo reale dipende dalla complessità del libro
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {BLUEPRINT_FORGE_STEPS.map((step, index) => {
          const active = index === activeStep;
          const done = index < activeStep;
          return (
            <div
              key={step}
              className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs transition-colors ${
                active
                  ? "border-cyan-300/45 bg-cyan-300/10 text-cyan-50"
                  : done
                    ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-50/75"
                    : "border-white/10 bg-white/[0.035] text-white/45"
              }`}
            >
              <span className={`h-2 w-2 shrink-0 rounded-full ${active ? "animate-pulse bg-cyan-200" : done ? "bg-emerald-300" : "bg-white/20"}`} />
              <span className="min-w-0 truncate">{index + 1}. {step}</span>
            </div>
          );
        })}
      </div>

      {slow && (
        <div className="mt-4 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-3 text-xs leading-5 text-amber-50/80">
          Sta richiedendo più tempo del previsto, ma il processo è ancora attivo. Non chiudere questa finestra: Scriptora sta finendo la struttura.
        </div>
      )}
    </div>
  );
}

function GuidedTextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block rounded-2xl border border-white/12 bg-white/[0.035] p-3">
      <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-white/52">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={3}
        placeholder={placeholder}
        className={inputClass}
      />
    </label>
  );
}
