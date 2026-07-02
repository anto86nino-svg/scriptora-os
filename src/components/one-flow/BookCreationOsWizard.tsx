import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  X, ArrowLeft, ArrowRight, Rocket, Sparkles, Plus, Trash2, Users, Loader2,
  CheckCircle2, AlertTriangle, BookOpen, Clock3, Info,
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
import WelcomeStarterGrid from "./steps/WelcomeStarterGrid";
import WelcomeForgePanel from "./steps/WelcomeForgePanel";
import StepValidation from "./steps/StepValidation";

import WizardFooter from "./steps/WizardFooter";
import {
  emptyCharacter,
  cleanStr,
  parseHandoffLanguage,
  normalizeHandoffGenre,
  applyInterviewGenreToWizard,
  formatForgeTime,
} from "./wizard/utils";

import { STUDIO_STEPS, AMAZON_MARKETPLACES, STUDIO_GENRES, STUDIO_LANGUAGES } from "@/lib/book-config-studio/constants";
import { DEFAULT_MATTER_OPTIONS, normalizeBookConfig } from "@/lib/book-config-studio/defaults";
import { validateBookConfigStudio } from "@/lib/book-config-studio/validation";
import type { StudioLaunchPayload } from "@/lib/book-config-studio/types";
import { getUserFriendlyError } from "@/lib/user-friendly-error";
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
  computeTitleCategoryCoherence,
  type GenreInference,
  type TitleCategoryCoherenceLevel,
} from "@/lib/book-creation-os/genre-inference";
import {
  buildWizardAutofillPatch,
  humanizeBlueprintError,
  runBlueprintPreflight,
  type BlueprintPreflightResult,
} from "@/lib/book-creation-os/blueprint-preflight";
import {
  applyGreatnessGateToConfig,
  enforceKernelGreatnessBeforeForge,
} from "@/lib/book-intelligence";
import { useMobileForgeBodyLock } from "@/hooks/useMobileForgeViewport";
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
import { BlueprintTheater } from "@/components/blueprint-theater/BlueprintTheater";
import { consumeForgeBrief } from "@/lib/one-flow/forge-brief-prefill";
import {
  buildForgeGuidedBriefExtras,
  buildForgeInterviewSeed,
  mapForgeCharactersToBookCharacters,
  resolveForgeCommercialHook,
  resolveForgeCommercialPromise,
  resolveForgeSubtitle,
  resolveForgeTitle,
  validateForgeHandoffForBlueprint,
  type ForgeInterviewSeed,
} from "@/lib/guided-interview/forge-blueprint-handoff";
import { repairForgeHandoffSeedForBlueprint } from "@/lib/guided-interview/express-book-package";
import { enrichBookConfigFromForgeSeed } from "@/lib/guided-interview/forge-writer-bridge";
import { saveForgeDnaLock, loadForgeDnaLock } from "@/lib/guided-interview/interview-state";
import type { GuidedInterviewState } from "@/lib/guided-interview/types";
import {
  bookForgeStartStepToStudioStep,
  isFictionHandoff,
  isManualHandoff,
  isPoetryHandoff,
  mergeHandoffIntoBookConfig,
  type BookForgeHandoff,
} from "@/lib/book-forge/book-forge-handoff";
import {
  buildProjectHandoffSeed,
  saveProjectHandoffSeed,
} from "@/lib/book-forge/project-handoff";
import {
  isStepComplete,
  canAdvanceToStep,
  stepCompletionHint,
  canOpenWriter,
  isNarrativeReadyForBlueprint,
  NARRATIVE_BLUEPRINT_BLOCKED_MESSAGE,
  type BookForgeWizardState,
} from "@/lib/book-forge/step-completion";
import {
  analyzeLongIdeaForProposal,
  detectGenreWithConfidence,
  LONG_IDEA_THRESHOLD,
  type AutoDetectionProposal,
} from "@/lib/book-forge/auto-detection-engine";
import { shouldBlockCloudGenreMutation } from "@/lib/book-forge/genre-priority";
import {
  resolveWizardGenreInference,
  resolveWizardBookFormat,
  applyDominanceToWizardPatch,
} from "@/lib/book-forge/genre-lock-wizard";
import { GuidedInterviewPanel } from "@/components/guided-interview/GuidedInterviewPanel";
import { buildIdeaBookDraft } from "@/lib/book-creation-os/idea-book-flow";
import { analyzeConceptFromIdea } from "@/lib/concept-dominance";
import GuidedFieldActions from "@/components/book-forge/GuidedFieldActions";
import GuidedEmptyState from "@/components/book-forge/GuidedEmptyState";
import AutoDetectionProposalCard from "@/components/book-forge/AutoDetectionProposal";
import ShortIdeaDetectionCard from "@/components/book-forge/ShortIdeaDetectionCard";
import StepApprovalChecklist, {
  approvalChecklistComplete,
  type ApprovalCheckItem,
} from "@/components/book-forge/StepApprovalChecklist";

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
  /** Legacy compatibility: open directly at blueprint after an existing DNA handoff. */
  forgeEntry?: "full" | "post-dna";
  initialStep?: number;
  interviewSeed?: ForgeInterviewSeed;
  bookForgeHandoff?: BookForgeHandoff | null;
  /** Render inside mobile creation shell — single page scroll, no modal overlay. */
  embeddedInMobileForge?: boolean;
  mobileForgeHeader?: ReactNode;
}

function emptyCharacter(): BookCharacter {
  return { name: "", role: "", wound: "", secret: "", externalDesire: "", personality: "" };
}



function cleanStr(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseHandoffLanguage(raw: unknown): Language | null {
  const value = cleanStr(raw).toLowerCase();
  if (!value) return null;
  if (/ingles|english/.test(value)) return "English";
  if (/spagn|spanish|español/.test(value)) return "Spanish";
  if (/franc|french/.test(value)) return "French";
  if (/tedesc|german|deutsch/.test(value)) return "German";
  if (/ital|italian/.test(value)) return "Italian";
  return null;
}

function normalizeHandoffGenre(raw: unknown): Genre | null {
  const value = cleanStr(raw).toLowerCase();
  if (!value) return null;
  if (/dark.?romance/.test(value)) return "dark-romance";
  if (/romance/.test(value)) return "romance";
  if (/thriller|crime|suspense/.test(value)) return "thriller";
  if (/fantasy/.test(value)) return "fantasy";
  if (/horror/.test(value)) return "horror";
  if (/self.?help|crescita|mindset/.test(value)) return "self-help";
  if (/business|marketing|leadership/.test(value)) return "business";
  if (/poetry|poesia/.test(value)) return "poetry";
  if (/manual|manuale|guide|guida/.test(value)) return "manual";
  return null;
}

function applyInterviewGenreToWizard(
  selectedGenre: string | undefined,
  setters: {
    setBookTypeId: (v: string) => void;
    setGenre: (v: Genre) => void;
    setLevel1BookType: (v: Level1BookType) => void;
  },
) {
  const map: Record<string, { bookTypeId: string; genre: Genre }> = {
    romance: { bookTypeId: "romance", genre: "romance" },
    "dark-romance": { bookTypeId: "dark-romance", genre: "dark-romance" },
    thriller: { bookTypeId: "thriller", genre: "thriller" },
    fantasy: { bookTypeId: "fantasy", genre: "fantasy" },
    "self-help": { bookTypeId: "self-help", genre: "self-help" },
    business: { bookTypeId: "business", genre: "business" },
    manual: { bookTypeId: "manual", genre: "manual" },
    poetry: { bookTypeId: "poetry", genre: "poetry" },
    "literary-fiction": { bookTypeId: "literary", genre: "literary-fiction" },
  };
  const hit = map[selectedGenre || ""] ?? { bookTypeId: "literary", genre: "literary-fiction" as Genre };
  setters.setBookTypeId(hit.bookTypeId);
  setters.setGenre(hit.genre);
  setters.setLevel1BookType(resolveLevel1FromBookTypeId(hit.bookTypeId));
}

const inputClass =
  "w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-sky-400/50 focus:outline-none";

export const BOOK_CREATION_DECISIONS = [
  "Base libro",
  "Stile e lettore",
  "Struttura",
  "Narrativa",
  "Limiti e regole",
  "Mercato e pubblicazione",
  "Blueprint",
  "Conferma e Writer",
] as const;

export const BOOK_FLOW_REQUIRED_CONFIGURATION_FIELDS = [
  "lingua",
  "genere",
  "sottogenere",
  "lunghezza",
  "capitoli",
  "sottocapitoli",
  "tono",
  "pov",
  "finale",
  "protagonista",
  "ambientazione",
  "regole canoniche",
] as const;

const LEVEL1_BOOK_TYPE_OPTIONS: { id: Level1BookType; label: string }[] = [
  { id: "romanzo", label: "Romanzo / narrativa" },
  { id: "poesia", label: "Poesie e raccolte" },
  { id: "manuale", label: "Manuale / guida" },
  { id: "self-help", label: "Self-help" },
  { id: "business", label: "Business" },
  { id: "educazione", label: "Materiale didattico" },
  { id: "biografia", label: "Biografia / memoir" },
  { id: "saggistica", label: "Saggistica" },
  { id: "bambini", label: "Libro per bambini" },
];

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
  "Non chiudere: Scriptora sta preparando architettura, indice e piano capitoli.",
] as const;


export function BookCreationOsWizard({
  open,
  onClose,
  authorIdentity,
  onAuthorIdentity,
  onManualStudio,
  onStudioComplete,
  onGenerateBlueprint,
  onDetectIntent,
  forgeEntry = "full",
  initialStep = 0,
  interviewSeed,
  bookForgeHandoff,
  embeddedInMobileForge = false,
  mobileForgeHeader,
}: BookCreationOsWizardProps) {
  useMobileForgeBodyLock(embeddedInMobileForge && open);
  const { plan } = usePlan();
  const isFree = plan === "free";
  const resolvedInitialStep = bookForgeHandoff
    ? bookForgeStartStepToStudioStep(bookForgeHandoff.recommendedStartStep)
    : initialStep;
  const [step, setStep] = useState(forgeEntry === "post-dna" || bookForgeHandoff ? resolvedInitialStep : 0);
  const [showAdvancedForge, setShowAdvancedForge] = useState(forgeEntry === "post-dna" || Boolean(bookForgeHandoff));
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

  const [useGuidedInterview, setUseGuidedInterview] = useState(false);
  const [dnaConfirmed, setDnaConfirmed] = useState(forgeEntry === "post-dna" || Boolean(bookForgeHandoff));

  const postDnaForge = forgeEntry === "post-dna";
  const approvedHandoffSlots = bookForgeHandoff?.prefill.approvedSlots ?? [];
  const canonicalCharacterHandoff =
    bookForgeHandoff?.source === "character-studio" ||
    bookForgeHandoff?.prefill.canonicalSource === "character-studio";
  const titleLockedByCharacterStudio =
    canonicalCharacterHandoff &&
    approvedHandoffSlots.includes("title") &&
    approvedHandoffSlots.includes("subtitle");

  useEffect(() => {
    if (!open || forgeEntry !== "post-dna" || !interviewSeed) return;
    const ext = interviewSeed.extracted ?? {};

    const normalizedForgeText = [
      ext.bookType,
      ext.genre,
      ext.subgenre,
      ext.structurePreference,
      ext.genreDNA,
      ext.commercialGoal,
    ]
      .map((v) => cleanStr(v).toLowerCase())
      .filter(Boolean)
      .join(" ");

    const parseLanguage = (raw?: string): Language | null => {
      const value = cleanStr(raw).toLowerCase();
      if (!value) return null;
      if (/ingles|english/.test(value)) return "English";
      if (/spagn|spanish|español/.test(value)) return "Spanish";
      if (/franc|french/.test(value)) return "French";
      if (/tedesc|german|deutsch/.test(value)) return "German";
      if (/ital|italian/.test(value)) return "Italian";
      return null;
    };

    const parseBookLength = (raw?: string): "short" | "medium" | "long" | null => {
      const value = cleanStr(raw).toLowerCase();
      if (!value) return null;
      if (/breve|short|snello/.test(value)) return "short";
      if (/lungo|long|completo|kdp|amazon|profondo/.test(value)) return "long";
      if (/medio|medium|standard/.test(value)) return "medium";
      return null;
    };

    const parseChapterCount = (raw?: string): number | null => {
      const value = cleanStr(raw).toLowerCase();
      if (!value || /ottimizza|decidi|scegli tu/.test(value)) return null;
      const match = value.match(/\b(\d{1,2})\b/);
      if (!match) return null;
      const parsed = Number(match[1]);
      if (!Number.isFinite(parsed)) return null;
      return Math.min(32, Math.max(6, parsed));
    };

    const parseSubchapterPreference = (raw?: string): { enabled: boolean; count: number } | null => {
      const value = cleanStr(raw).toLowerCase();
      if (!value) return null;
      if (/\bno\b|senza|solo capitoli/.test(value)) return { enabled: false, count: 0 };
      const explicit = value.match(/\b([1-5])\b/);
      if (/s[iì]|sottocapitoli|leggeri|decidi|servono/.test(value)) {
        return { enabled: true, count: explicit ? Number(explicit[1]) : 3 };
      }
      return null;
    };

    const applyForgeBookType = () => {
      if (!normalizedForgeText) return;

      if (/poesia|poet|versi|raccolta poetica|libro poetico|prosa poetica|prosa lirica|saggio poetico|frammenti|meditazioni|aforismi|voce autentica|silenzio|margine|crepa|domanda interiore|identit|verit/.test(normalizedForgeText)) {
        setLevel1BookType("poesia");
        setBookTypeId("poetry");
        setGenre("poetry" as Genre);
        setCategory("Poesia");
        setSubcategory("Poesia");
        setSubgenre(cleanStr(ext.genre) || cleanStr(ext.subgenre) || "raccolta poetica / prosa lirica");
        setSubchaptersEnabled(false);
        setSubchaptersPerChapter(0);
        setChapters((current) => Math.min(current || 7, 10));
        return;
      }

      if (/manuale|guida pratica|tutorial|passo/.test(normalizedForgeText)) {
        setLevel1BookType("manual" as any);
        setBookTypeId("manual");
        setGenre("nonfiction" as Genre);
        setCategory("Nonfiction");
        setSubcategory("Manual");
        setSubgenre(cleanStr(ext.genre) || "manuale pratico");
        setSubchaptersEnabled(true);
        setSubchaptersPerChapter(3);
        return;
      }

      if (/self[- ]?help|crescita|benessere|mindset|motivaz/.test(normalizedForgeText)) {
        setLevel1BookType("self-help" as any);
        setBookTypeId("self-help");
        setGenre("self-help" as Genre);
        setCategory("Nonfiction");
        setSubcategory("Self-help");
        setSubgenre(cleanStr(ext.genre) || "self-help pratico");
        setSubchaptersEnabled(true);
        setSubchaptersPerChapter(3);
        return;
      }

      if (/business|startup|leadership|vendite|marketing|produttivit/.test(normalizedForgeText)) {
        setLevel1BookType("business" as any);
        setBookTypeId("business");
        setGenre("nonfiction" as Genre);
        setCategory("Nonfiction");
        setSubcategory("Business");
        setSubgenre(cleanStr(ext.genre) || "business pratico");
        setSubchaptersEnabled(true);
        setSubchaptersPerChapter(3);
        return;
      }

      if (/studio|universit|educativ|didattic|esame|student/.test(normalizedForgeText)) {
        setLevel1BookType("education" as any);
        setBookTypeId("education");
        setGenre("nonfiction" as Genre);
        setCategory("Nonfiction");
        setSubcategory("Education");
        setSubgenre(cleanStr(ext.genre) || "libro educativo");
        setSubchaptersEnabled(true);
        setSubchaptersPerChapter(3);
        return;
      }

      if (/thriller|horror|mistero|crime|gotic|psicologico|colpi di scena/.test(normalizedForgeText)) {
        setLevel1BookType("romanzo");
        setBookTypeId(/horror/.test(normalizedForgeText) ? "horror" : "thriller");
        setGenre(/horror/.test(normalizedForgeText) ? ("horror" as Genre) : ("thriller" as Genre));
        setCategory("Fiction");
        setSubcategory(/horror/.test(normalizedForgeText) ? "Horror" : "Thriller");
        setSubgenre(cleanStr(ext.genre) || cleanStr(ext.subgenre) || "thriller psicologico");
        setSubchaptersEnabled(true);
        setSubchaptersPerChapter(3);
        return;
      }

      if (/dark romance|romance|amore|slow burn|passione|relazione/.test(normalizedForgeText)) {
        setLevel1BookType("romanzo");
        setBookTypeId("romance");
        setGenre("romance" as Genre);
        setCategory("Fiction");
        setSubcategory("Romance");
        setSubgenre(cleanStr(ext.genre) || cleanStr(ext.subgenre) || "dark romance");
        setSubchaptersEnabled(true);
        setSubchaptersPerChapter(3);
        return;
      }

      if (/fantasy|magia|regno|epic|drago/.test(normalizedForgeText)) {
        setLevel1BookType("romanzo");
        setBookTypeId("fantasy");
        setGenre("fantasy" as Genre);
        setCategory("Fiction");
        setSubcategory("Fantasy");
        setSubgenre(cleanStr(ext.genre) || cleanStr(ext.subgenre) || "fantasy");
        setSubchaptersEnabled(true);
        setSubchaptersPerChapter(3);
      }
    };

    const forgeLanguage = parseLanguage(ext.language);
    if (forgeLanguage) {
      setLanguage(forgeLanguage);
      if (forgeLanguage === "Italian") setAmazonMarketplace("amazon.it");
      if (forgeLanguage === "English") setAmazonMarketplace("amazon.com");
      if (forgeLanguage === "Spanish") setAmazonMarketplace("amazon.es");
      if (forgeLanguage === "French") setAmazonMarketplace("amazon.fr");
      if (forgeLanguage === "German") setAmazonMarketplace("amazon.de");
    }

    const forgeAuthor = cleanStr(ext.authorName);
    if (forgeAuthor && !/decidiamolo|decidere|dopo/i.test(forgeAuthor)) {
      setAuthorName(forgeAuthor);
    }

    applyForgeBookType();

    const forgeLength = parseBookLength(ext.bookLength);
    if (forgeLength) {
      setBookLength(isFree ? "short" : forgeLength);
      setChapterLength(forgeLength);
    }

    const forgeChapters = parseChapterCount(ext.chapterCount);
    if (forgeChapters) setChapters(forgeChapters);

    const forgeSubchapters = parseSubchapterPreference(ext.subchaptersPreference);
    if (forgeSubchapters) {
      setSubchaptersEnabled(forgeSubchapters.enabled);
      setSubchaptersPerChapter(forgeSubchapters.count);
    }

    if (cleanStr(ext.structurePreference)) {
      setVoiceConsistency((prev) =>
        `${prev}\n\nStruttura richiesta nel percorso libro: ${cleanStr(ext.structurePreference)}`.trim(),
      );
    }

    setNarrativePromise(cleanStr(ext.promise) || cleanStr(ext.readerTransformation));
    setCoreConflict(cleanStr(ext.centralConflict));
    setSetting(cleanStr(ext.setting));
    setVoiceConsistency((prev) => cleanStr(ext.emotionalTone) || prev);
    setTargetReader(cleanStr(ext.targetReader));
    setCommercialGoal(cleanStr(ext.commercialGoal) || cleanStr(ext.promise));
    setTone((prev) => cleanStr(ext.emotionalTone) || prev);
    if (cleanStr(ext.openingHook)) setOpeningHook(cleanStr(ext.openingHook));

    const ideaBlob = [
      ext.language && `Lingua richiesta: ${cleanStr(ext.language)}`,
      ext.authorName && `Identità autore: ${cleanStr(ext.authorName)}`,
      ext.bookType && `Tipo libro: ${cleanStr(ext.bookType)}`,
      ext.genre && `Genere/nicchia: ${cleanStr(ext.genre)}`,
      ext.bookLength && `Lunghezza: ${cleanStr(ext.bookLength)}`,
      ext.chapterCount && `Capitoli: ${cleanStr(ext.chapterCount)}`,
      ext.subchaptersPreference && `Sottocapitoli: ${cleanStr(ext.subchaptersPreference)}`,
      ext.structurePreference && `Struttura: ${cleanStr(ext.structurePreference)}`,
      ext.readerTransformation,
      ext.centralConflict,
      ext.emotionalTone,
      ext.genreDNA,
      ext.promise,
      ext.setting,
      ext.targetReader,
      ext.commercialGoal,
    ]
      .map((v) => cleanStr(v))
      .filter(Boolean)
      .join("\n\n");

    if (ideaBlob) setIdea(ideaBlob);

    const handoff = interviewSeed as ForgeInterviewSeed;
    const forgeTitle = resolveForgeTitle(handoff);
    const forgeSubtitle = resolveForgeSubtitle(handoff);
    if (forgeTitle) {
      setTitle(forgeTitle);
    }
    if (forgeSubtitle) {
      setSubtitle(forgeSubtitle);
    }

    applyInterviewGenreToWizard(interviewSeed.selectedGenre, {
      setBookTypeId,
      setGenre,
      setLevel1BookType,
    });

    setStep(initialStep);
    setDnaConfirmed(true);
    setUseGuidedInterview(false);
    setShowAdvancedForge(true);
  }, [open, forgeEntry, interviewSeed, initialStep, isFree]);

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
  const [bookFormat, setBookFormat] = useState("");
  const [genreManuallyLocked, setGenreManuallyLocked] = useState(false);
  const [identityDraft, setIdentityDraft] = useState<AuthorIdentity>(authorIdentity);
  const [chapters, setChapters] = useState(18);
  const [chapterLength, setChapterLength] = useState<"short" | "medium" | "long">("medium");
  const [bookLength, setBookLength] = useState<"short" | "medium" | "long">(isFree ? "short" : "medium");
  const [subchaptersEnabled, setSubchaptersEnabled] = useState(true);
  const [subchaptersPerChapter, setSubchaptersPerChapter] = useState(DEFAULT_SUBCHAPTERS_PER_CHAPTER);
  const [matterOptions, setMatterOptions] = useState(DEFAULT_MATTER_OPTIONS);
  const [characters, setCharacters] = useState<BookCharacter[]>([emptyCharacter()]);
  const [forgeHandoff, setForgeHandoff] = useState<ForgeInterviewSeed | null>(null);
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
  const [showFullCustomization, setShowFullCustomization] = useState(false);
  const [targetAge, setTargetAge] = useState("");
  const [languageLevel, setLanguageLevel] = useState("accessibile");
  const [structureType, setStructureType] = useState("classica a tre atti");
  const [wordsPerChapter, setWordsPerChapter] = useState("");
  const [protagonist, setProtagonist] = useState("");
  const [antagonist, setAntagonist] = useState("");
  const [secondaryCast, setSecondaryCast] = useState("");
  const [pov, setPov] = useState("terza persona limitata");
  const [tense, setTense] = useState("passato");
  const [endingType, setEndingType] = useState("finale con twist");
  const [canonRules, setCanonRules] = useState("");
  const [forbiddenContent, setForbiddenContent] = useState("");
  const [avoidThemes, setAvoidThemes] = useState("");
  const [violenceLevel, setViolenceLevel] = useState("medio");
  const [darknessLevel, setDarknessLevel] = useState("medio");
  const [spiceLevel, setSpiceLevel] = useState("basso");
  const [explicitLanguage, setExplicitLanguage] = useState(false);
  const [romancePresence, setRomancePresence] = useState(false);
  const [supernaturalPresence, setSupernaturalPresence] = useState(false);
  const [marketTarget, setMarketTarget] = useState("Italia");
  const [publishingPlatform, setPublishingPlatform] = useState("KDP");
  const [kdpCategory, setKdpCategory] = useState("");
  const [initialKeywords, setInitialKeywords] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [marketingPromise, setMarketingPromise] = useState("");

  const applyForgeHandoffSeed = useCallback((seed: ForgeInterviewSeed) => {
    setForgeHandoff(seed);

    const forgeTitle = resolveForgeTitle(seed);
    const forgeSubtitle = resolveForgeSubtitle(seed);
    const forgeHook = resolveForgeCommercialHook(seed);
    const forgePromise = resolveForgeCommercialPromise(seed);

    if (forgeTitle) setTitle(forgeTitle);
    if (forgeSubtitle) setSubtitle(forgeSubtitle);
    if (forgeHook) setOpeningHook(forgeHook);
    if (forgePromise) {
      setNarrativePromise(forgePromise);
      setCommercialGoal(forgePromise);
    }

    const mapped = mapForgeCharactersToBookCharacters(seed.characters);
    if (mapped.length) setCharacters(mapped);

    const { canonBrief, characterBibleText } = buildForgeGuidedBriefExtras(seed);
    if (canonBrief || characterBibleText) {
      setIdea((prev) => {
        const extras = [characterBibleText, canonBrief].filter(Boolean).join("\n\n");
        if (!extras) return prev;
        if (prev.includes("BLUEPRINT CANON BRIEF")) return prev;
        return prev.trim() ? `${prev.trim()}\n\n${extras}` : extras;
      });
    }
  }, []);

  useEffect(() => {
    if (!open || !bookForgeHandoff) return;
    const p = bookForgeHandoff.prefill;
    saveProjectHandoffSeed(buildProjectHandoffSeed(bookForgeHandoff.source, {
      title: p.title,
      subtitle: p.subtitle || p.promise,
      authorName: p.authorName || p.author || p.writerName,
      language: p.language,
      marketplace: p.marketplace || p.amazonMarketplace,
      bookType: p.bookType || p.bookTypeId,
      genre: p.genre,
      category: p.category,
      subcategory: p.subcategory,
      niche: p.niche || p.subgenre,
      targetReader: p.targetReader,
      promise: p.promise || p.transformation,
      tone: p.tone || p.style,
      chapterCount: p.chapterCount || p.numberOfChapters,
      bookLength: p.bookLength,
      keywords: p.keywords,
      backendKeywords: p.keywords,
      comparableBooks: p.comparableBooks,
      commercialAngle: p.commercialAngle,
    }));

    setUseGuidedInterview(false);
    setDnaConfirmed(true);
    setShowAdvancedForge(true);
    setStep(bookForgeStartStepToStudioStep(bookForgeHandoff.recommendedStartStep));

    if (cleanStr(p.title)) setTitle(cleanStr(p.title));
    if (cleanStr(p.subtitle || p.promise)) setSubtitle(cleanStr(p.subtitle || p.promise));
    if (cleanStr(p.authorName || p.author || p.writerName)) setAuthorName(cleanStr(p.authorName || p.author || p.writerName));
    const handoffLanguage = parseHandoffLanguage(p.language);
    if (handoffLanguage) setLanguage(handoffLanguage);
    if (cleanStr(p.amazonMarketplace || p.marketplace)) setAmazonMarketplace(cleanStr(p.amazonMarketplace || p.marketplace));
    if (cleanStr(p.category)) setCategory(cleanStr(p.category));
    if (cleanStr(p.subcategory || p.niche)) setSubcategory(cleanStr(p.subcategory || p.niche));
    if (cleanStr(p.subgenre || p.niche)) setSubgenre(cleanStr(p.subgenre || p.niche));
    if (cleanStr(p.bookTypeId || p.bookType)) {
      const nextBookType = cleanStr(p.bookTypeId || p.bookType);
      setBookTypeId(nextBookType);
      setLevel1BookType(resolveLevel1FromBookTypeId(nextBookType));
    }
    const nextGenre = normalizeHandoffGenre(p.genre || p.bookType || p.bookTypeId);
    if (nextGenre) setGenre(nextGenre);

    if (isPoetryHandoff(p)) {
      setForgePresetId("poetry");
      setBookTypeId("literary");
      setLevel1BookType("poesia");
      setGenre("poetry" as Genre);
      setCategory(p.category || "Poetry");
      setSubcategory(p.subcategory || "Poetry Collection");
      setSubchaptersEnabled(false);
      setSubchaptersPerChapter(0);
      setCharacters([]);
    } else if (isManualHandoff(p)) {
      setForgePresetId("manual");
      setBookTypeId("manual");
      setLevel1BookType("manuale");
      setGenre("manual");
      setCategory(p.category || "Manuali");
      setSubcategory(p.subcategory || p.niche || "Manuale pratico");
      setSubchaptersEnabled(true);
      setSubchaptersPerChapter(Number(p.subchaptersPerChapter || 3));
      setCharacters([]);
    }

    if (cleanStr(p.targetReader)) setTargetReader(cleanStr(p.targetReader));
    if (cleanStr(p.tone || p.style)) setTone(cleanStr(p.tone || p.style));
    if (cleanStr(p.promise || p.transformation)) {
      setNarrativePromise(cleanStr(p.promise || p.transformation));
      setCommercialGoal(cleanStr(p.commercialAngle || p.promise || p.transformation));
    }
    if (cleanStr(p.conflict)) setCoreConflict(cleanStr(p.conflict));
    if (Array.isArray(p.characters) && p.characters.some((character) => cleanStr(character?.name))) {
      setCharacters(p.characters.filter((character) => cleanStr(character?.name)));
    }
    if (Number(p.numberOfChapters || p.chapterCount) > 0) setChapters(Number(p.numberOfChapters || p.chapterCount));
    if (p.bookLength === "short" || p.bookLength === "medium" || p.bookLength === "long") {
      setBookLength(isFree ? "short" : p.bookLength);
      setChapterLength(p.bookLength);
    }
    if (p.subchaptersEnabled != null) setSubchaptersEnabled(Boolean(p.subchaptersEnabled));
    if (Number(p.subchaptersPerChapter) > 0) setSubchaptersPerChapter(Number(p.subchaptersPerChapter));
    if (p.authorIdentity) setIdentityDraft(p.authorIdentity);
    if (p.blueprint?.chapterOutlines?.length) setBlueprintPreview(p.blueprint);

    const ideaParts = [
      cleanStr(p.idea),
      cleanStr(p.plot) && `Trama: ${cleanStr(p.plot)}`,
      cleanStr(p.conflict) && `Conflitto: ${cleanStr(p.conflict)}`,
      cleanStr(p.transformation) && `Trasformazione: ${cleanStr(p.transformation)}`,
      cleanStr(p.commercialAngle) && `Angolo commerciale: ${cleanStr(p.commercialAngle)}`,
      p.keywords?.length ? `Keyword: ${p.keywords.join(", ")}` : "",
      p.comparableBooks?.length ? `Comparable: ${p.comparableBooks.join(", ")}` : "",
      `Handoff da ${bookForgeHandoff.source}: ${bookForgeHandoff.lockReason}`,
    ].filter(Boolean).join("\n\n");
    if (ideaParts) setIdea(ideaParts);
  }, [open, bookForgeHandoff, isFree]);

  useEffect(() => {
    if (!open) return;
    if (bookForgeHandoff) return;
    const brief = consumeForgeBrief();
    if (!brief) return;
    if (brief.prefilledTitle) setTitle(brief.prefilledTitle);
    if (brief.prefilledSubtitle) setSubtitle(brief.prefilledSubtitle);
    if (brief.idea) setIdea(brief.idea);
    if (brief.language) setLanguage(brief.language as Language);
    if (brief.authorName) setAuthorName(brief.authorName);
    if (brief.authorIdentity) setIdentityDraft(brief.authorIdentity);
    if (brief.numberOfChapters) setChapters(brief.numberOfChapters);
    if (brief.subchaptersEnabled != null) setSubchaptersEnabled(brief.subchaptersEnabled);
    if (brief.subchaptersPerChapter) setSubchaptersPerChapter(brief.subchaptersPerChapter);
    if (brief.bookLength) setBookLength(brief.bookLength);
    if (brief.readerPromise) {
      setNarrativePromise(brief.readerPromise);
      setCommercialGoal(brief.readerPromise);
    }
    if (brief.targetAudience) setTargetReader(brief.targetAudience);
    if (brief.tone) setTone(brief.tone);
  }, [open, bookForgeHandoff]);

  useEffect(() => {
    if (!open || !interviewSeed) return;
    if (bookForgeHandoff) return;
    const seed = interviewSeed as ForgeInterviewSeed;
    if (!seed.canon && !seed.characters?.length && !seed.titleIntelligence) return;
    applyForgeHandoffSeed(seed);
  }, [open, interviewSeed, applyForgeHandoffSeed, bookForgeHandoff]);

  useEffect(() => {
    if (!open || forgeHandoff) return;
    if (bookForgeHandoff) return;
    const saved = loadForgeDnaLock();
    if (!saved?.canon && !saved?.characters?.length && !saved?.titleIntelligence) return;
    if (dnaConfirmed || forgeEntry === "post-dna") {
      applyForgeHandoffSeed(buildForgeInterviewSeed(saved as GuidedInterviewState));
    }
  }, [open, forgeHandoff, dnaConfirmed, forgeEntry, applyForgeHandoffSeed, bookForgeHandoff]);

  const handleForgeDnaConfirm = useCallback((state: GuidedInterviewState) => {
    const seed = buildForgeInterviewSeed(state);
    applyForgeHandoffSeed(seed);
    saveForgeDnaLock(state);
    setDnaConfirmed(true);
    setShowAdvancedForge(true);
  }, [applyForgeHandoffSeed]);

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
  const [titleCategoryCoherence, setTitleCategoryCoherence] = useState<TitleCategoryCoherenceLevel>("high");
  const [forgePresetId, setForgePresetId] = useState<string | null>(null);
  const [forgePresetLabel, setForgePresetLabel] = useState<string | null>(null);
  const [autoDetectionDismissed, setAutoDetectionDismissed] = useState(false);
  const [genreDetectionAccepted, setGenreDetectionAccepted] = useState(false);
  const [narrativeAutoApproved, setNarrativeAutoApproved] = useState(false);
  const [shortIdeaForceDetect, setShortIdeaForceDetect] = useState(false);
  const [pendingAutoDetection, setPendingAutoDetection] = useState<AutoDetectionProposal | null>(null);
  const [generatingGuidedField, setGeneratingGuidedField] = useState<string | null>(null);
  const ideaInputRef = useRef<HTMLTextAreaElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const targetReaderInputRef = useRef<HTMLInputElement>(null);
  const toneInputRef = useRef<HTMLInputElement>(null);

  const genreMutationContext = useMemo(
    () => ({
      genreManuallyLocked,
      genreDetectionAccepted,
      hasPendingAutoDetection: Boolean(pendingAutoDetection),
    }),
    [genreManuallyLocked, genreDetectionAccepted, pendingAutoDetection],
  );

  const shortIdeaHypotheses = useMemo(() => {
    if (!idea.trim() || idea.trim().length >= LONG_IDEA_THRESHOLD) return [];
    return detectGenreWithConfidence(idea, {
      title,
      existingGenre: genre,
      existingSubgenre: subgenre,
      existingBookTypeId: bookTypeId,
      genreManuallyLocked,
    });
  }, [idea, title, genre, subgenre, bookTypeId, genreManuallyLocked]);

  const textInference = useMemo(
    () => resolveWizardGenreInference(title, idea, {
      title,
      idea,
      genre,
      subgenre,
      bookTypeId,
      category,
      subcategory,
      bookFormat,
      genreManuallyLocked,
    }),
    [title, idea, genre, subgenre, bookTypeId, category, subcategory, bookFormat, genreManuallyLocked],
  );
  const shouldUseCharacterForge = useMemo(() => {
    if (bookForgeHandoff) return isFictionHandoff(bookForgeHandoff.prefill);
    if (level1BookType === "poesia" || level1BookType === "manuale" || level1BookType === "educazione") return false;
    if (["self-help", "business", "manual", "education", "poetry"].includes(String(bookTypeId))) return false;
    return true;
  }, [bookForgeHandoff, level1BookType, bookTypeId]);

  useEffect(() => {
    const result = computeTitleCategoryCoherence({
      title,
      subtitle,
      idea,
      genre,
      category,
      subcategory,
      subgenre,
      bookTypeId,
    });
    setTitleCategoryCoherence(result.level);
  }, [title, subtitle, idea, genre, category, subcategory, subgenre, bookTypeId]);

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

  const buildConfig = useCallback((handoffOverride?: ForgeInterviewSeed | null): BookConfig => {
    const activeHandoff = handoffOverride ?? forgeHandoff;
    const styleDirective = profileToStyleDirective(styleProfile);
    const presetLabel = STYLE_PRESETS.find((p) => p.id === styleProfile.presetId)?.label || "Bestseller Commerciale";
    const mergedIdentity = saveAuthorIdentity({
      ...identityDraft,
      penName: identityDraft.penName || authorName,
      biography: identityDraft.biography || "",
      voice: identityDraft.voice || "",
      language,
    });
    const handoffExtras = activeHandoff ? buildForgeGuidedBriefExtras(activeHandoff) : null;
    const forgedCharacters = activeHandoff
      ? mapForgeCharactersToBookCharacters(activeHandoff.characters)
      : [];
    const manualCharacters: BookCharacter[] = [
      protagonist.trim() && {
        name: protagonist.trim(),
        role: "Protagonista scelto dall'autore",
        externalDesire: coreConflict.trim(),
        wound: "",
        secret: "",
        personality: "",
      },
      antagonist.trim() && {
        name: antagonist.trim(),
        role: "Antagonista / forza oppositiva scelta dall'autore",
        externalDesire: "",
        wound: "",
        secret: "",
        personality: "",
      },
      ...secondaryCast
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => ({
          name,
          role: "Cast secondario scelto dall'autore",
          externalDesire: "",
          wound: "",
          secret: "",
          personality: "",
        })),
    ].filter(Boolean) as BookCharacter[];
    const resolvedCharacters =
      forgedCharacters.length > 0
        ? forgedCharacters
        : [
            ...manualCharacters,
            ...characters.filter((c) => {
              const name = String(c.name || "").trim();
              return name && !manualCharacters.some((manual) => manual.name?.toLowerCase() === name.toLowerCase());
            }),
          ];

    const guidedBrief = [
      handoffExtras?.characterBibleText &&
        `FORGE CHARACTER & CANON LOCK:\n${handoffExtras.characterBibleText}`,
      handoffExtras?.canonBrief,
      `Configurazione autore:\nFormato libro: ${level1BookType}\nLingua: ${language}\nGenere: ${genre}\nSottogenere: ${subgenre.trim() || subcategory}\nLunghezza: ${bookLength}\nCapitoli: ${chapters}\nSottocapitoli: ${subchaptersEnabled ? `${subchaptersPerChapter} per capitolo` : "no"}\nTono: ${tone}\nPOV: ${pov}\nTempo verbale: ${tense}\nFinale: ${endingType}`,
      idea.trim() && `Idea del libro:\n${idea.trim()}`,
      protagonist.trim() && `Protagonista confermato:\n${protagonist.trim()}`,
      antagonist.trim() && `Antagonista / opposizione confermata:\n${antagonist.trim()}`,
      secondaryCast.trim() && `Cast secondario confermato:\n${secondaryCast.trim()}`,
      coreConflict.trim() && `Conflitto principale:\n${coreConflict.trim()}`,
      narrativePromise.trim() && `Promessa narrativa/editoriale:\n${narrativePromise.trim()}`,
      setting.trim() && `Ambientazione:\n${setting.trim()}`,
      openingHook.trim() && `Hook iniziale:\n${openingHook.trim()}`,
      mainTwists.trim() && `Twist principali:\n${mainTwists.trim()}`,
      targetAge.trim() && `Eta target:\n${targetAge.trim()}`,
      languageLevel.trim() && `Livello linguistico:\n${languageLevel.trim()}`,
      structureType.trim() && `Tipo struttura:\n${structureType.trim()}`,
      wordsPerChapter.trim() && `Parole per capitolo:\n${wordsPerChapter.trim()}`,
      canonRules.trim() && `Regole canoniche vincolanti:\n${canonRules.trim()}`,
      forbiddenContent.trim() && `Cose vietate dall'autore:\n${forbiddenContent.trim()}`,
      avoidThemes.trim() && `Temi da evitare:\n${avoidThemes.trim()}`,
      `Limiti contenuto:\nViolenza: ${violenceLevel}\nOscurita: ${darknessLevel}\nSpice: ${spiceLevel}\nLinguaggio esplicito: ${explicitLanguage ? "si" : "no"}\nRomance: ${romancePresence ? "si" : "no"}\nSoprannaturale: ${supernaturalPresence ? "si" : "no"}`,
      commercialGoal.trim() && `Obiettivo commerciale:\n${commercialGoal.trim()}`,
      `Mercato e pubblicazione:\nMercato target: ${marketTarget}\nPiattaforma: ${publishingPlatform}\nCategoria KDP: ${kdpCategory || category}\nKeyword iniziali: ${initialKeywords || "da definire"}\nDescrizione breve: ${shortDescription || "da definire"}\nPromessa marketing: ${marketingPromise || commercialGoal || narrativePromise || "da definire"}`,
      voiceConsistency.trim() && `Voice consistency:\n${voiceConsistency.trim()}`,
    ].filter(Boolean).join("\n\n");

    const resolvedTitle =
      (activeHandoff && resolveForgeTitle(activeHandoff)) || title.trim() || "Romanzo senza titolo";
    const resolvedSubtitle =
      (activeHandoff && resolveForgeSubtitle(activeHandoff)) || subtitle.trim();

    const raw = normalizeBookConfig(applyAuthorIdentityToConfig({
      title: resolvedTitle,
      subtitle: resolvedSubtitle,
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
      characters: resolvedCharacters,
      characterBibleText: handoffExtras?.characterBibleText || undefined,
      configStatus: "validated",
    }, mergedIdentity) as BookConfig);
    const { config: sanitized } = sanitizeBookConfiguration(raw);
    const handoffMerged = bookForgeHandoff
      ? mergeHandoffIntoBookConfig(sanitized, bookForgeHandoff)
      : sanitized;
    if (!activeHandoff) return handoffMerged;

    const enriched = enrichBookConfigFromForgeSeed(handoffMerged, activeHandoff);
    const wizardExtras = [
      `Configurazione autore:\nFormato libro: ${level1BookType}\nLingua: ${language}\nGenere: ${genre}\nSottogenere: ${subgenre.trim() || subcategory}\nLunghezza: ${bookLength}\nCapitoli: ${chapters}\nSottocapitoli: ${subchaptersEnabled ? `${subchaptersPerChapter} per capitolo` : "no"}\nTono: ${tone}\nPOV: ${pov}\nTempo verbale: ${tense}\nFinale: ${endingType}`,
      protagonist.trim() && `Protagonista confermato:\n${protagonist.trim()}`,
      antagonist.trim() && `Antagonista / opposizione confermata:\n${antagonist.trim()}`,
      secondaryCast.trim() && `Cast secondario confermato:\n${secondaryCast.trim()}`,
      coreConflict.trim() && `Conflitto principale:\n${coreConflict.trim()}`,
      narrativePromise.trim() && `Promessa narrativa/editoriale:\n${narrativePromise.trim()}`,
      setting.trim() && `Ambientazione:\n${setting.trim()}`,
      openingHook.trim() && `Hook iniziale:\n${openingHook.trim()}`,
      mainTwists.trim() && `Twist principali:\n${mainTwists.trim()}`,
      targetAge.trim() && `Eta target:\n${targetAge.trim()}`,
      languageLevel.trim() && `Livello linguistico:\n${languageLevel.trim()}`,
      structureType.trim() && `Tipo struttura:\n${structureType.trim()}`,
      wordsPerChapter.trim() && `Parole per capitolo:\n${wordsPerChapter.trim()}`,
      canonRules.trim() && `Regole canoniche vincolanti:\n${canonRules.trim()}`,
      forbiddenContent.trim() && `Cose vietate dall'autore:\n${forbiddenContent.trim()}`,
      avoidThemes.trim() && `Temi da evitare:\n${avoidThemes.trim()}`,
      `Limiti contenuto:\nViolenza: ${violenceLevel}\nOscurita: ${darknessLevel}\nSpice: ${spiceLevel}\nLinguaggio esplicito: ${explicitLanguage ? "si" : "no"}\nRomance: ${romancePresence ? "si" : "no"}\nSoprannaturale: ${supernaturalPresence ? "si" : "no"}`,
      commercialGoal.trim() && `Obiettivo commerciale:\n${commercialGoal.trim()}`,
      `Mercato e pubblicazione:\nMercato target: ${marketTarget}\nPiattaforma: ${publishingPlatform}\nCategoria KDP: ${kdpCategory || category}\nKeyword iniziali: ${initialKeywords || "da definire"}\nDescrizione breve: ${shortDescription || "da definire"}\nPromessa marketing: ${marketingPromise || commercialGoal || narrativePromise || "da definire"}`,
      voiceConsistency.trim() && `Voice consistency:\n${voiceConsistency.trim()}`,
    ].filter(Boolean).join("\n\n");
    if (wizardExtras) {
      enriched.idea = [enriched.idea, wizardExtras].filter(Boolean).join("\n\n");
    }
    return enriched;
  }, [
    styleProfile, identityDraft, authorName, title, subtitle, idea, language, amazonMarketplace,
    bookTypeId, genre, category, subcategory, subgenre, tone, targetReader, referenceAuthors, chapterLength,
    bookLength, isFree, chapters, subchaptersEnabled, subchaptersPerChapter, matterOptions, characters,
      coreConflict, narrativePromise, setting, openingHook, mainTwists, commercialGoal, voiceConsistency,
      level1BookType, protagonist, antagonist, secondaryCast, pov, tense, endingType, targetAge, languageLevel,
      structureType, wordsPerChapter, canonRules, forbiddenContent, avoidThemes, violenceLevel, darknessLevel,
      spiceLevel, explicitLanguage, romancePresence, supernaturalPresence, marketTarget, publishingPlatform,
      kdpCategory, initialKeywords, shortDescription, marketingPromise,
      forgeHandoff,
      bookForgeHandoff,
  ]);

  useEffect(() => {
    if (step === 6 && open) {
      setPreflightResult(runBlueprintPreflight(buildConfig(), identityDraft));
    }
  }, [step, open, buildConfig, identityDraft]);

  
const closeWizard = () => {
  try {
    sessionStorage.removeItem(STUDIO_DRAFT_STORAGE_KEY);
  } catch {}

  onClose();
};

const persistDraft = useCallback(() => {
    try {
      sessionStorage.setItem(STUDIO_DRAFT_STORAGE_KEY, JSON.stringify({
        step, title, subtitle, idea, authorName, language, amazonMarketplace, category, subcategory,
        bookTypeId, genre, subgenre, chapters, chapterLength, bookLength, subchaptersEnabled, subchaptersPerChapter,
        matterOptions, characters, styleProfile, tone, targetReader, referenceAuthors,
        coreConflict, narrativePromise, setting, openingHook, mainTwists, commercialGoal, voiceConsistency,
        showFullCustomization, targetAge, languageLevel, structureType, wordsPerChapter,
        protagonist, antagonist, secondaryCast, pov, tense, endingType, canonRules, forbiddenContent,
        avoidThemes, violenceLevel, darknessLevel, spiceLevel, explicitLanguage, romancePresence,
        supernaturalPresence, marketTarget, publishingPlatform, kdpCategory, initialKeywords,
        shortDescription, marketingPromise,
      }));
    } catch { /* noop */ }
  }, [
    step, title, subtitle, idea, authorName, language, amazonMarketplace, category, subcategory,
    bookTypeId, genre, subgenre, chapters, chapterLength, bookLength, subchaptersEnabled, subchaptersPerChapter,
    matterOptions, characters, styleProfile, tone, targetReader, referenceAuthors,
    coreConflict, narrativePromise, setting, openingHook, mainTwists, commercialGoal, voiceConsistency,
    showFullCustomization, targetAge, languageLevel, structureType, wordsPerChapter,
    protagonist, antagonist, secondaryCast, pov, tense, endingType, canonRules, forbiddenContent,
    avoidThemes, violenceLevel, darknessLevel, spiceLevel, explicitLanguage, romancePresence,
    supernaturalPresence, marketTarget, publishingPlatform, kdpCategory, initialKeywords,
    shortDescription, marketingPromise,
  ]);

  useEffect(() => {
    if (!open) return;
    if (bookForgeHandoff) return;
    try {
      const raw = sessionStorage.getItem(STUDIO_DRAFT_STORAGE_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw);
      const draftStep = Number(draft.step ?? 0);

      if (draftStep >= 6) {
        sessionStorage.removeItem(STUDIO_DRAFT_STORAGE_KEY);
        setStep(0);
        return;
      }

      if (draft.step != null) setStep(draftStep);
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
      if (draft.showFullCustomization != null) setShowFullCustomization(Boolean(draft.showFullCustomization));
      if (draft.targetAge) setTargetAge(draft.targetAge);
      if (draft.languageLevel) setLanguageLevel(draft.languageLevel);
      if (draft.structureType) setStructureType(draft.structureType);
      if (draft.wordsPerChapter) setWordsPerChapter(draft.wordsPerChapter);
      if (draft.protagonist) setProtagonist(draft.protagonist);
      if (draft.antagonist) setAntagonist(draft.antagonist);
      if (draft.secondaryCast) setSecondaryCast(draft.secondaryCast);
      if (draft.pov) setPov(draft.pov);
      if (draft.tense) setTense(draft.tense);
      if (draft.endingType) setEndingType(draft.endingType);
      if (draft.canonRules) setCanonRules(draft.canonRules);
      if (draft.forbiddenContent) setForbiddenContent(draft.forbiddenContent);
      if (draft.avoidThemes) setAvoidThemes(draft.avoidThemes);
      if (draft.violenceLevel) setViolenceLevel(draft.violenceLevel);
      if (draft.darknessLevel) setDarknessLevel(draft.darknessLevel);
      if (draft.spiceLevel) setSpiceLevel(draft.spiceLevel);
      if (draft.explicitLanguage != null) setExplicitLanguage(Boolean(draft.explicitLanguage));
      if (draft.romancePresence != null) setRomancePresence(Boolean(draft.romancePresence));
      if (draft.supernaturalPresence != null) setSupernaturalPresence(Boolean(draft.supernaturalPresence));
      if (draft.marketTarget) setMarketTarget(draft.marketTarget);
      if (draft.publishingPlatform) setPublishingPlatform(draft.publishingPlatform);
      if (draft.kdpCategory) setKdpCategory(draft.kdpCategory);
      if (draft.initialKeywords) setInitialKeywords(draft.initialKeywords);
      if (draft.shortDescription) setShortDescription(draft.shortDescription);
      if (draft.marketingPromise) setMarketingPromise(draft.marketingPromise);
    } catch { /* noop */ }
  }, [open, bookForgeHandoff]);

  useEffect(() => {
    if (!open) return;
    if (bookForgeHandoff) return;

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
  }, [open, isFree, bookForgeHandoff]);

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

  useEffect(() => {
    if (!open || step !== 0 || autoDetectionDismissed || !idea.trim()) {
      if (!open || step !== 0) setPendingAutoDetection(null);
      return;
    }
    const isShort = idea.trim().length < LONG_IDEA_THRESHOLD;
    if (isShort && !shortIdeaForceDetect) {
      setPendingAutoDetection(null);
      return;
    }
    const result = analyzeLongIdeaForProposal(idea, {
      existingGenre: genre,
      existingSubgenre: subgenre,
      existingBookTypeId: bookTypeId,
      genreManuallyLocked,
      title,
    });
    setPendingAutoDetection(result.shouldPropose ? result.proposal : null);
  }, [open, step, idea, genre, subgenre, bookTypeId, title, autoDetectionDismissed, genreManuallyLocked, shortIdeaForceDetect]);

  const prevIdeaRef = useRef(idea);
  useEffect(() => {
    if (prevIdeaRef.current !== idea) {
      setAutoDetectionDismissed(false);
      setShortIdeaForceDetect(false);
      prevIdeaRef.current = idea;
    }
  }, [idea]);

  if (!open) return null;

  const validationIssues = validateBookConfigStudio(buildConfig(), identityDraft);
  const coherenceReport = step >= 5 ? validateConfigCoherence(buildConfig()) : null;
  const stepLabel = BOOK_CREATION_DECISIONS[step] || STUDIO_STEPS[step];

  const forgeWizardState: BookForgeWizardState = {
    language,
    bookTypeId,
    genre,
    subgenre,
    idea,
    title,
    targetReader,
    tone,
    subtitle,
    authorName: authorName.trim() || identityDraft.penName?.trim() || "",
    identityBasicsOk: isUserAuthorIdentityConfigured(identityDraft),
    pov,
    chapters,
    bookLength,
    structureType,
    narrativePromise,
    coreConflict,
    setting,
    openingHook,
    protagonist,
    shouldUseCharacterForge,
    hasNamedCharacter: characters.some((character) => character.name?.trim()),
    canonRules,
    forbiddenContent,
    validationIssueCount: validationIssues.length,
    commercialGoal,
    shortDescription,
    blueprintPreview: Boolean(blueprintPreview),
    narrativeAutoApproved,
  };

  const currentStepComplete = isStepComplete(step, forgeWizardState);
  const stepAdvanceHint = stepCompletionHint(step, forgeWizardState);

  const jumpToWizardStep = (target: number) => {
    if (target < step) {
      setStep(target);
      return;
    }
    if (!canAdvanceToStep(target, forgeWizardState)) {
      for (let s = 0; s < target; s += 1) {
        if (!isStepComplete(s, forgeWizardState)) {
          toast.error(stepCompletionHint(s, forgeWizardState) || "Completa gli step precedenti.");
          return;
        }
      }
      toast.error("Completa gli step precedenti prima di saltare avanti.");
      return;
    }
    setStep(target);
  };

  const approvalChecklistItems: ApprovalCheckItem[] = [
    {
      id: "blueprint",
      label: "Blueprint generato e visibile",
      done: Boolean(blueprintPreview),
      hint: "Torna allo step Blueprint e premi Genera Blueprint.",
    },
    {
      id: "title",
      label: "Titolo e sottotitolo confermati",
      done: Boolean(title.trim().length >= 3 && subtitle.trim().length >= 8),
      hint: "Completa o rigenera titolo e promessa in copertina.",
    },
    {
      id: "structure",
      label: "Capitoli strutturati nel blueprint",
      done: Boolean(blueprintPreview?.chapterOutlines?.length),
      hint: "Il blueprint deve includere almeno un capitolo.",
    },
    {
      id: "identity",
      label: "Identità autore pronta per Writer",
      done: isUserAuthorIdentityConfigured(identityDraft) || Boolean(authorName.trim().length >= 2),
      hint: "Completa pen name, bio e voce nello step Stile e lettore.",
    },
  ];

  const approvalReady = approvalChecklistComplete(approvalChecklistItems);

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

  const applyStudioGenre = (id: string, opts?: { force?: boolean; featuredSubgenre?: string; lockGenre?: boolean }) => {
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

    const dominated = applyDominanceToWizardPatch(
      {
        bookTypeId: g.id,
        genre: g.genre,
        category: g.category,
        subcategory: g.defaultSubcategory,
        subgenre: opts?.featuredSubgenre || subgenre,
      },
      { bookTypeId: g.id, genre: g.genre, subgenre, category, subcategory },
    );
    if (dominated.genre) setGenre(dominated.genre as Genre);
    if (dominated.bookTypeId) setBookTypeId(String(dominated.bookTypeId));
    const nextFormat = resolveWizardBookFormat({
      bookTypeId: String(dominated.bookTypeId || g.id),
      genre: String(dominated.genre || g.genre),
      subgenre: opts?.featuredSubgenre || subgenre,
      category: g.category,
      subcategory: g.defaultSubcategory,
      idea,
      title,
    });
    if (nextFormat) setBookFormat(nextFormat);
    if (opts?.lockGenre !== false) {
      setGenreManuallyLocked(true);
      setGenreDetectionAccepted(false);
    }
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

  const applyInference = (inference: GenreInference, opts?: { keepTitle?: boolean; lockGenre?: boolean }) => {
    const dominated = resolveWizardGenreInference(title, idea, {
      title,
      idea,
      genre: inference.genre,
      subgenre: inference.subgenre,
      bookTypeId: inference.bookTypeId,
      category: inference.category,
      subcategory: inference.subcategory,
      bookFormat: inference.bookFormat,
      genreManuallyLocked: opts?.lockGenre ?? false,
    });
    applyStudioGenre(dominated.bookTypeId, { force: true, featuredSubgenre: dominated.subgenre, lockGenre: opts?.lockGenre ?? false });
    setGenre(dominated.genre);
    setCategory(dominated.category);
    setSubcategory(dominated.subcategory);
    setSubgenre(dominated.subgenre);
    setTone(dominated.tone);
    setBookFormat(dominated.bookFormat);
    if (!targetReader.trim()) setTargetReader(dominated.targetReader);
    if (!narrativePromise.trim()) setNarrativePromise(dominated.narrativePromise);
    if (!commercialGoal.trim()) setCommercialGoal(dominated.commercialGoal);
    if (!chapters || chapters < 6) setChapters(dominated.suggestedChapters);
    if (["poetry_collection", "poetic_essay", "lyrical_prose"].includes(inference.bookFormat)) {
      setLevel1BookType("poesia");
      setBookTypeId("poetry");
      setGenre("poetry" as Genre);
      setCategory("Poesia");
      setSubcategory("Poesia");
      setSubchaptersEnabled(false);
      setSubchaptersPerChapter(0);
      setChapters((current) => Math.min(inference.suggestedChapters || current || 7, 12));
    }
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
            if (
              !shouldBlockCloudGenreMutation(genreMutationContext)
              && detected.genre
            ) {
              const remoteInference = inferGenreFromText(remoteTitle || title, `${idea} ${detected.genre} ${detected.subcategory || ""}`);
              proposals[0] = { ...proposals[0], inference: remoteInference, perceivedGenre: remoteInference.label };
              setTitleProposals([...proposals]);
            }
          }
        } catch { /* local proposals still shown */ }
      }
    } catch (e) {
      toast.error(getUserFriendlyError(e, {
        area: "blueprint",
        fallback: "Non sono riuscito a completare la rigenerazione titolo. I dati del libro restano salvati: puoi riprovare tra poco.",
      }));
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
      genreManuallyLocked,
      genreDetectionAccepted,
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
      : [emptyCharacter()]);
    toast.success(`${starter.label}: percorso guidato applicato.`);
  };

  const acceptAutoDetection = () => {
    if (!pendingAutoDetection) return;
    applyStudioGenre(pendingAutoDetection.bookTypeId, { force: true, lockGenre: false });
    setGenre(pendingAutoDetection.genre as Genre);
    setCategory(pendingAutoDetection.category);
    setSubcategory(pendingAutoDetection.subcategory);
    setBookFormat(pendingAutoDetection.bookFormat);
    if (pendingAutoDetection.subgenre) setSubgenre(pendingAutoDetection.subgenre);
    if (pendingAutoDetection.tone) setTone(pendingAutoDetection.tone);
    if (pendingAutoDetection.targetReader) setTargetReader(pendingAutoDetection.targetReader);
    if (pendingAutoDetection.protagonist) setProtagonist(pendingAutoDetection.protagonist);
    if (pendingAutoDetection.setting) setSetting(pendingAutoDetection.setting);
    setGenreManuallyLocked(true);
    setGenreDetectionAccepted(true);
    const detectedLabel = pendingAutoDetection.detectedLabel;
    setPendingAutoDetection(null);
    setAutoDetectionDismissed(true);
    toast.success(`Proposta accettata: ${detectedLabel}.`);
  };

  const generateIdeaFromContext = async () => {
    const seed = idea.trim() || title.trim();
    if (!seed) {
      toast.error("Scrivi almeno un'indizio — anche una frase — per generare l'idea.");
      return;
    }
    setGeneratingGuidedField("idea");
    try {
      const draft = buildIdeaBookDraft(seed, { language, planIsFree: isFree });
      const expanded = [
        draft.originalIdea,
        draft.promise && `Promessa: ${draft.promise}`,
        draft.targetReader && `Lettore ideale: ${draft.targetReader}`,
        draft.tone && `Tono: ${draft.tone}`,
      ].filter(Boolean).join("\n\n");
      setIdea(expanded);
      if (!shouldBlockCloudGenreMutation(genreMutationContext)) {
        applyInference(inferGenreFromText(draft.title, expanded));
      }
      if (!title.trim() && draft.title) setTitle(draft.title);
      toast.success("Idea espansa da Scriptora.");
    } finally {
      setGeneratingGuidedField(null);
    }
  };

  const generateReaderToneFields = () => {
    const patch = buildWizardAutofillPatch(buildConfig(), textInference, { genreManuallyLocked, genreDetectionAccepted });
    if (patch.targetReader) setTargetReader(patch.targetReader);
    if (patch.tone) setTone(patch.tone);
    if (!pov.trim()) setPov("terza persona limitata");
    toast.success("Pubblico e tono suggeriti.");
  };

  const generateStructureFields = () => {
    const patch = buildWizardAutofillPatch(buildConfig(), textInference, { genreManuallyLocked, genreDetectionAccepted });
    if (patch.chapters) setChapters(patch.chapters);
    if (!structureType.trim()) {
      setStructureType(level1BookType === "romanzo" ? "classica a tre atti" : "moduli pratici");
    }
    if (!wordsPerChapter.trim()) {
      setWordsPerChapter(bookLength === "short" ? "1200-1800" : bookLength === "long" ? "2200-3000" : "1800-2500");
    }
    toast.success("Struttura suggerita applicata.");
  };

  const generateNarrativeFields = () => {
    const patch = buildWizardAutofillPatch(buildConfig(), textInference, {
      narrativePromise,
      commercialGoal,
      coreConflict,
      setting,
      openingHook,
      genreManuallyLocked,
      genreDetectionAccepted,
    });
    if (patch.narrativePromise) setNarrativePromise(patch.narrativePromise);
    if (patch.coreConflict) setCoreConflict(patch.coreConflict);
    if (patch.setting) setSetting(patch.setting);
    if (patch.openingHook) setOpeningHook(patch.openingHook);
    const analysis = analyzeConceptFromIdea(idea);
    if (analysis.protagonist && !protagonist.trim()) setProtagonist(analysis.protagonist);
    if (analysis.setting && !setting.trim()) setSetting(analysis.setting);
    if (!pov.trim()) setPov("terza persona limitata");
    setNarrativeAutoApproved(true);
    toast.success("Scheda narrativa completata.");
  };

  const generateLimitsFields = () => {
    if (!canonRules.trim()) {
      setCanonRules("Mantieni coerenza di voce, POV e promessa emotiva. Nessun salto di tono senza motivazione narrativa.");
    }
    toast.success("Regole canoniche base applicate.");
  };

  const generateMarketFields = () => {
    if (!commercialGoal.trim()) setCommercialGoal(textInference.commercialGoal);
    if (!shortDescription.trim()) setShortDescription(textInference.narrativePromise.slice(0, 220));
    if (!kdpCategory.trim()) setKdpCategory(category);
    if (!marketingPromise.trim()) setMarketingPromise(textInference.narrativePromise);
    toast.success("Dati mercato suggeriti.");
  };

  const runExtendedTitleSuggestions = async () => {
    if (!idea.trim() && !title.trim()) {
      toast.error("Scrivi almeno un'idea o un titolo di partenza.");
      return;
    }
    setGeneratingGuidedField("titles");
    try {
      const titleForgeContext: TitleForgeContext = {
        bookTypeId,
        level1BookType,
        forgePresetId,
        category,
        subcategory,
        subgenre,
      };
      const merged = ["a", "b", "c"].flatMap((salt) =>
        generateWizardTitleProposals(title, idea, language, salt, titleForgeContext),
      );
      const unique = merged.filter(
        (proposal, index, list) =>
          list.findIndex((item) => item.title.toLowerCase() === proposal.title.toLowerCase()) === index,
      ).slice(0, 10);
      setTitleProposals(unique);
      toast.success(`${unique.length} titoli suggeriti.`);
    } finally {
      setGeneratingGuidedField(null);
    }
  };

  const goNext = async () => {
    if (!currentStepComplete && step < 6) {
      toast.error(stepAdvanceHint || "Completa questo step prima di andare avanti.");
      return;
    }
    if (step === 0) {
      if (!genre && !bookTypeId) {
        toast.error("Scegli genere e formato, oppure accetta la proposta di Scriptora dall'idea.");
        return;
      }
    }
    if (step === 1) {
      if (!title.trim()) {
        toast.error("Inserisci il titolo del libro, oppure genera titoli magici dalla tua idea.");
        return;
      }
      if (!identityDraft.penName?.trim() && !authorName.trim()) {
        toast.error("Serve il nome autore in copertina prima di continuare.");
        return;
      }
      if (!targetReader.trim()) {
        toast.message("Puoi indicare il pubblico ideale ora o completarlo prima del blueprint.");
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
      if (!isNarrativeReadyForBlueprint(forgeWizardState)) {
        toast.error(NARRATIVE_BLUEPRINT_BLOCKED_MESSAGE);
        return;
      }

      if (useGuidedInterview && !dnaConfirmed) {
        toast.error("Conferma il DNA del libro prima di generare il blueprint.");
        setShowAdvancedForge(true);
        return;
      }

      if (!onGenerateBlueprint) {
        const config = buildConfig();
        onStudioComplete?.({ config, mode: "studio-draft" });
        closeWizard();
        return;
      }

      let resolvedForgeHandoff: ForgeInterviewSeed | null = forgeHandoff;
      if (resolvedForgeHandoff) {
        let forgeCheck = validateForgeHandoffForBlueprint(resolvedForgeHandoff);
        if (!forgeCheck.ready) {
          resolvedForgeHandoff = repairForgeHandoffSeedForBlueprint(resolvedForgeHandoff);
          applyForgeHandoffSeed(resolvedForgeHandoff);
          forgeCheck = validateForgeHandoffForBlueprint(resolvedForgeHandoff);
        }
        if (!forgeCheck.ready) {
          toast.message("Quasi pronti — completo gli ultimi campi del libro.");
          applyPreflightAutofill();
          return;
        }
      }

      const preflight = runBlueprintPreflight(buildConfig(resolvedForgeHandoff), identityDraft, forgeWizardState);
      setPreflightResult(preflight);
      if (!preflight.ready) {
        toast.message(preflight.humanSummary);
        return;
      }

      const draftConfig = buildConfig(resolvedForgeHandoff);
      const greatnessGate = enforceKernelGreatnessBeforeForge({ config: draftConfig });
      if (!greatnessGate.allowed) {
        toast.error(greatnessGate.message);
        return;
      }
      if (greatnessGate.refined) {
        toast.message("Ho rafforzato il concept prima del Blueprint.");
      }
      const gatedConfig = applyGreatnessGateToConfig(draftConfig, greatnessGate);

      setGeneratingBlueprint(true);
      setBlueprintError(null);
      try {
        const bp = await onGenerateBlueprint(gatedConfig);
        setBlueprintPreview(bp);
        setStep(7);
      } catch (e) {
        const message = humanizeBlueprintError(e, gatedConfig);
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

  const reorderBlueprintChapter = (index: number, direction: "up" | "down") => {
    setBlueprintPreview((current) => {
      if (!current) return current;
      const outlines = [...current.chapterOutlines];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= outlines.length) return current;
      [outlines[index], outlines[target]] = [outlines[target], outlines[index]];
      return { ...current, chapterOutlines: outlines };
    });
  };

  const forgeTheaterCopy =
    BLUEPRINT_FORGE_COPY[
      Math.min(BLUEPRINT_FORGE_COPY.length - 1, Math.floor(blueprintElapsedSeconds / 14))
    ] || BLUEPRINT_FORGE_COPY[0];

  const finishApproved = async () => {
    const writerGate = canOpenWriter(forgeWizardState);
    if (!writerGate.ok) {
      toast.error(writerGate.message);
      return;
    }
    if (!approvalReady) {
      toast.error("Completa la checklist di approvazione prima di aprire Writer.");
      return;
    }
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
        closeWizard();
        return;
      }
      onManualStudio?.(config);
      closeWizard();
    } catch (e) {
      toast.error(getUserFriendlyError(e, {
        area: "blueprint",
        fallback: "Avvio Writer non completato. Il blueprint resta salvato: riprova tra poco.",
      }));
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
    if (!shouldBlockCloudGenreMutation(genreMutationContext)) {
      applyInference(local);
    }
    if (!onDetectIntent) return;
    try {
      const detected = await onDetectIntent(idea.trim(), language);
      if (detected?.suggestedTitles?.length && !title.trim()) {
        const best = Math.max(0, Math.min(2, detected.bestTitleIndex || 0));
        setTitle(detected.suggestedTitles[best] || "");
        setSubtitle(detected.suggestedSubtitles?.[best] || "");
      }
      if (detected?.numberOfChapters) setChapters(detected.numberOfChapters);
      if (
        !shouldBlockCloudGenreMutation(genreMutationContext)
        && (detected?.genre || detected?.subcategory)
      ) {
        const merged = inferGenreFromText(title || detected.suggestedTitles?.[0] || "", `${idea} ${detected.genre || ""} ${detected.subcategory || ""}`);
        applyInference(merged);
      }
      toast.success("Suggerimenti applicati dall'idea.");
    } catch {
      toast.message("Analisi cloud non disponibile: ho applicato l'inferenza locale dal testo.");
    }
  };

  return (
    <div
      className={
        embeddedInMobileForge
          ? "scriptora-book-forge-mobile fixed inset-0 z-[100] flex h-[100dvh] max-h-[100dvh] flex-col bg-slate-950"
          : "scriptora-modal-overlay fixed inset-0 z-[80] flex items-stretch justify-stretch overflow-y-auto overscroll-contain bg-black/70 p-[calc(env(safe-area-inset-top,0px)+0.35rem)_0.35rem_calc(env(safe-area-inset-bottom,0px)+0.35rem)] backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"
      }
    >
      {embeddedInMobileForge ? mobileForgeHeader : null}
      <div
        className={
          embeddedInMobileForge
            ? "flex min-h-0 flex-1 flex-col"
            : "scriptora-modal-panel scriptora-wizard-shell flex h-full min-h-0 w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-slate-950 shadow-2xl"
        }
        style={
          embeddedInMobileForge
            ? undefined
            : {
                height: "calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 0.7rem)",
                maxHeight: "calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 0.7rem)",
              }
        }
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5 sm:py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300">
                {postDnaForge ? "Blueprint Preview" : forgePresetId ? "Percorso libro" : "Crea libro"}
              </p>
            <p className="text-sm font-semibold text-white">
                {postDnaForge
                  ? step === 7
                    ? "La struttura del libro prende forma"
                    : "Forgia la struttura"
                  : forgePresetId
                    ? `Configurazione: ${forgePresetLabel || "Libro"}`
                    : `Step ${step + 1}/${STUDIO_STEPS.length} — ${stepLabel}`}
              </p>
            <p className="mt-0.5 text-[11px] text-white/45">
                {postDnaForge
                  ? "DNA confermato — genera architettura e indice prima del writer"
                  : forgePresetId
                      ? "Configurazione rapida: controlla solo titolo, autore, lingua e idea."
                      : "Una sola configurazione manuale prima di blueprint e Writer"}
              </p>
          </div>
          {!embeddedInMobileForge && (
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
          )}
        </div>

        <div
            className={
              embeddedInMobileForge
                ? "scriptora-book-forge-scroll min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain px-4 py-4 pb-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] sm:px-5 sm:py-5"
                : "scriptora-modal-body scriptora-wizard-scroll min-h-0 flex-1 overflow-x-clip overflow-y-auto overscroll-contain px-4 py-4 pb-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] sm:px-5 sm:py-5 sm:pb-5"
            }
            style={{
              WebkitOverflowScrolling: "touch",
              touchAction: "pan-y",
            }}
          >
          {!forgePresetId && !postDnaForge && !useGuidedInterview && (
            <div className="mb-4">
              <GuidedDecisionRail
                activeIndex={step}
                onJump={jumpToWizardStep}
                forgeState={forgeWizardState}
              />
            </div>
          )}

          {useGuidedInterview && step <= 1 && !bookForgeHandoff ? (
            <div className="space-y-4">
              <WelcomeForgePanel
                header={(
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-violet-50">Intervista guidata Scriptora</p>
                      <p className="mt-1 text-xs leading-5 text-white/55">
                        Rispondi alle domande: Scriptora blocca genere e DNA prima del wizard manuale.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUseGuidedInterview(false)}
                      className="rounded-xl border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/75"
                    >
                      Torna al wizard manuale
                    </button>
                  </div>
                )}
              >
                <GuidedInterviewPanel
                  selectedGenre={genre}
                  language={language}
                  penName={authorName}
                  authorName={authorName}
                  variant={embeddedInMobileForge || isMobileViewport ? "mobile" : "desktop"}
                  unifiedScroll={embeddedInMobileForge}
                  onConfirmDna={handleForgeDnaConfirm}
                />
              </WelcomeForgePanel>
            </div>
          ) : null}

          {!useGuidedInterview && step === 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  {forgePresetId === "poetry"
                    ? "Base raccolta poetica"
                    : forgePresetId
                      ? `Base ${forgePresetLabel || "libro"}`
                    : "Base libro"}
                </h2>
                <p className="mt-1 text-sm leading-6 text-white/65">
                  Scegli tu le fondamenta. Scriptora costruisce solo sopra le decisioni che confermi.
                </p>
              </div>

              {!bookForgeHandoff && (
                <WelcomeForgePanel
                  header={(
                    <p className="mb-2 text-sm font-semibold text-violet-50">Preferisci un percorso dialogato?</p>
                  )}
                >
                  <p className="text-xs leading-5 text-white/55">
                    L&apos;intervista guidata blocca genere e DNA del libro prima di compilare i campi manualmente.
                  </p>
                  <button
                    type="button"
                    onClick={() => setUseGuidedInterview(true)}
                    className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-violet-500 px-4 py-2 text-xs font-bold text-white"
                  >
                    <Sparkles className="h-4 w-4" />
                    Avvia intervista guidata
                  </button>
                </WelcomeForgePanel>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/52">Formato libro</span>
                  <select
                    value={level1BookType}
                    onChange={(event) => {
                      const nextLevel = event.target.value as Level1BookType;
                      setLevel1BookType(nextLevel);
                      const firstType = getVisibleBookTypesForLevel1(nextLevel)[0];
                      if (firstType) {
                        applyStudioGenre(firstType.id, { force: true, lockGenre: true });
                      }
                    }}
                    className={inputClass}
                  >
                    {LEVEL1_BOOK_TYPE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/52">Lingua</span>
                  <select value={language} onChange={(event) => setLanguage(event.target.value as Language)} className={inputClass}>
                    {STUDIO_LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/52">Genere</span>
                  <select value={bookTypeId} onChange={(event) => applyStudioGenre(event.target.value)} className={inputClass}>
                    {visibleGenres.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/52">Sottogenere</span>
                  <input value={subgenre} onChange={(event) => setSubgenre(event.target.value)} placeholder="Es. thriller psicologico, dark romance, poesia contemporanea" className={inputClass} />
                </label>

                <label className="block space-y-1.5 sm:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/52">Titolo provvisorio</span>
                    <GuidedFieldActions
                      compact
                      hasValue={Boolean(title.trim())}
                      generating={generatingGuidedField === "titles" || generatingTitles}
                      onWrite={() => titleInputRef.current?.focus()}
                      onGenerate={() => void runExtendedTitleSuggestions()}
                      onSuggest={() => void runExtendedTitleSuggestions()}
                      onRegenerate={() => void runMagicalTitleGeneration()}
                      showRegenerate={Boolean(title.trim())}
                      generateLabel="Suggerisci titoli"
                    />
                  </div>
                  <input
                    ref={titleInputRef}
                    value={title}
                    readOnly={titleLockedByCharacterStudio}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Puoi lasciarlo vuoto e generarlo dopo"
                    className={inputClass}
                  />
                </label>

                <label className="block space-y-1.5 sm:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/52">Idea del libro</span>
                    <GuidedFieldActions
                      compact
                      hasValue={Boolean(idea.trim())}
                      generating={generatingGuidedField === "idea"}
                      onWrite={() => ideaInputRef.current?.focus()}
                      onGenerate={() => void generateIdeaFromContext()}
                      onRegenerate={() => void generateIdeaFromContext()}
                      showRegenerate={Boolean(idea.trim())}
                    />
                  </div>
                  <textarea
                    ref={ideaInputRef}
                    value={idea}
                    onChange={(event) => setIdea(event.target.value)}
                    rows={6}
                    placeholder="Descrivi la tua idea. Questa materia non sovrascrive formato, genere o regole che scegli tu."
                    className={inputClass}
                  />
                </label>
              </div>

              {shortIdeaHypotheses.length > 0 && !genreManuallyLocked && !genreDetectionAccepted && (
                <ShortIdeaDetectionCard
                  hypotheses={shortIdeaHypotheses}
                  expanding={generatingGuidedField === "idea"}
                  onAskQuestions={() => setUseGuidedInterview(true)}
                  onExpand={() => void generateIdeaFromContext()}
                  onDetectAnyway={() => {
                    setShortIdeaForceDetect(true);
                    toast.message("Rilevamento genere attivato per idea breve.");
                  }}
                />
              )}

              {pendingAutoDetection && (
                <AutoDetectionProposalCard
                  proposal={pendingAutoDetection}
                  onAccept={acceptAutoDetection}
                  onKeep={() => {
                    setPendingAutoDetection(null);
                    setAutoDetectionDismissed(true);
                  }}
                />
              )}

              {(title.trim() || idea.trim()) && (
                <div
                  className={
                    titleCategoryCoherence === "high"
                      ? "rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-3"
                      : titleCategoryCoherence === "medium"
                        ? "rounded-2xl border border-sky-400/25 bg-sky-500/10 p-3"
                        : "rounded-2xl border border-amber-400/25 bg-amber-500/10 p-3"
                  }
                >
                  <p className="flex items-center gap-2 text-sm font-semibold text-white">
                    {titleCategoryCoherence === "high" ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" />
                        <span className="text-emerald-50">Titolo e categoria coerenti</span>
                      </>
                    ) : titleCategoryCoherence === "medium" ? (
                      <>
                        <Info className="h-4 w-4 shrink-0 text-sky-300" />
                        <span className="text-sky-50">Verifica consigliata</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />
                        <span className="text-amber-50">Titolo e categoria potrebbero non essere allineati</span>
                      </>
                    )}
                  </p>
                  {titleCategoryCoherence !== "high" && (
                    <p className="mt-1 text-xs leading-5 text-white/55">
                      {titleCategoryCoherence === "medium"
                        ? "Il titolo è evocativo: controlla che genere e sottogenere rispecchino l'idea del libro."
                        : "Titolo e categoria sembrano in conflitto. Puoi comunque procedere e correggere dopo."}
                    </p>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowFullCustomization((value) => !value)}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-lime-300/25 bg-lime-300/10 px-4 text-sm font-bold text-lime-50"
              >
                <Sparkles className="h-4 w-4" />
                Personalizza tutto
              </button>

              {showFullCustomization && (
                <div className="rounded-2xl border border-white/12 bg-white/[0.04] p-4">
                  <p className="text-sm font-semibold text-white">Scorciatoie facoltative</p>
                  <p className="mt-1 text-xs leading-5 text-white/55">
                    Gli starter compilano campi vuoti per iniziare più velocemente. Puoi modificare ogni valore dopo.
                  </p>
                  <div className="mt-3">
                    <WelcomeStarterGrid
                      starters={GUIDED_STARTERS}
                      hidden={!!forgePresetId}
                      onSelect={applyGuidedStarter}
                    />
                  </div>
                </div>
              )}

              {!bookForgeHandoff && (
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3">
                  <p className="text-sm font-semibold text-emerald-50">Scelte autore al centro</p>
                  <p className="mt-1 text-xs leading-5 text-white/55">
                    Le tue scelte restano sempre al centro del libro. Scriptora può completare i campi vuoti quando glielo chiedi.
                  </p>
                </div>
              )}
            </div>
          )}

          {!useGuidedInterview && step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Stile e lettore</h2>
                <p className="mt-1 text-sm leading-6 text-white/60">
                  Definisci voce, pubblico e promessa visibile del libro. Ogni campo resta modificabile.
                </p>
              </div>

              {!bookForgeHandoff && (
                <WelcomeForgePanel
                  header={<p className="mb-2 text-sm font-semibold text-violet-50">Vuoi rifinire il DNA con Scriptora?</p>}
                >
                  <button
                    type="button"
                    onClick={() => setUseGuidedInterview(true)}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-violet-300/35 bg-violet-500/15 px-4 py-2 text-xs font-bold text-violet-50"
                  >
                    <Sparkles className="h-4 w-4" />
                    Continua con intervista guidata
                  </button>
                </WelcomeForgePanel>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                {!targetReader.trim() ? (
                  <div className="sm:col-span-2">
                    <GuidedEmptyState
                      missingLabel="pubblico ideale"
                      description="Scriptora può dedurlo da genere, titolo e idea."
                      onGenerate={generateReaderToneFields}
                      onWrite={() => targetReaderInputRef.current?.focus()}
                    />
                  </div>
                ) : (
                  <input ref={targetReaderInputRef} value={targetReader} onChange={(e) => setTargetReader(e.target.value)} placeholder="Target lettore" className={inputClass} />
                )}
                <input value={targetAge} onChange={(e) => setTargetAge(e.target.value)} placeholder="Eta target" className={inputClass} />
                <input value={languageLevel} onChange={(e) => setLanguageLevel(e.target.value)} placeholder="Livello linguistico" className={inputClass} />
                {!tone.trim() ? (
                  <div className="sm:col-span-2">
                    <GuidedEmptyState
                      missingLabel="tono editoriale"
                      description="Scegli un preset sotto o lascia che Scriptora lo proponga."
                      onGenerate={generateReaderToneFields}
                      onWrite={() => toneInputRef.current?.focus()}
                    />
                  </div>
                ) : (
                  <input ref={toneInputRef} value={tone} onChange={(e) => setTone(e.target.value)} placeholder="Tono editoriale" className={inputClass} />
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {STYLE_PRESETS.map((p) => (
                  <button key={p.id} type="button" onClick={() => applyPreset(p.id)}
                    className={`rounded-full border px-3 py-1 text-[11px] font-medium ${styleProfile.presetId === p.id ? "border-amber-300/50 bg-amber-400/15 text-amber-100" : "border-white/12 text-white/70"}`}>
                    {p.label}
                  </button>
                ))}
              </div>

              <label className="block space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/52">Titolo reale</span>
                  <GuidedFieldActions
                    compact
                    hasValue={Boolean(title.trim())}
                    generating={generatingGuidedField === "titles" || generatingTitles}
                    onWrite={() => titleInputRef.current?.focus()}
                    onGenerate={() => void runMagicalTitleGeneration()}
                    onSuggest={() => void runExtendedTitleSuggestions()}
                    onRegenerate={() => void runMagicalTitleGeneration()}
                    showRegenerate={Boolean(title.trim())}
                  />
                </div>
                <input
                  ref={titleInputRef}
                  value={title}
                  readOnly={titleLockedByCharacterStudio}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={forgePresetId === "poetry" ? "Es. Geografia delle cose non dette" : "Es. La Cattedrale delle Anime Dimenticate"}
                  className={inputClass}
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/52">Sottotitolo / promessa</span>
                <input
                  value={subtitle}
                  readOnly={titleLockedByCharacterStudio}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder={forgePresetId === "poetry" ? "Es. Poesie sul silenzio, la memoria e la rinascita" : "Es. Ogni segreto ha un prezzo. Ogni anima reclama il proprio debito."}
                  className={inputClass}
                />
              </label>

              {titleLockedByCharacterStudio && (
                <div className="rounded-2xl border border-emerald-300/25 bg-emerald-400/10 p-3 text-xs leading-5 text-emerald-50">
                  Titolo e sottotitolo sono confermati: Scriptora li riusa per blueprint, cover, export e Writer senza rigenerarli.
                </div>
              )}

              {forgePresetId !== "poetry" && !titleLockedByCharacterStudio && (
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
                          <p className="mt-2 text-[10px] text-sky-200/80">
                            {proposal.perceivedGenre} · Score {proposal.titleScore ?? proposal.hookScore}/100 · Specificita' {proposal.specificityScore ?? "—"}
                          </p>
                          {proposal.usedDistinctiveElements?.length ? (
                            <p className="mt-1 text-[10px] leading-4 text-emerald-200/75">
                              Elementi: {proposal.usedDistinctiveElements.slice(0, 3).join(", ")}
                            </p>
                          ) : null}
                          <p className="mt-1 text-[10px] leading-4 text-white/45">{proposal.rationale}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white/90">Identità autore</h3>
                {onAuthorIdentity && (
                  <button type="button" onClick={onAuthorIdentity} className="text-xs text-sky-300">Apri Identity OS</button>
                )}
              </div>
              <input value={identityDraft.penName || authorName} onChange={(e) => setIdentityDraft((d) => ({ ...d, penName: e.target.value }))} placeholder="Pen name *" className={inputClass} />
              <textarea value={identityDraft.biography || ""} onChange={(e) => setIdentityDraft((d) => ({ ...d, biography: e.target.value }))} rows={3} placeholder="Bio breve *" className={inputClass} />
              <textarea value={identityDraft.voice || ""} onChange={(e) => setIdentityDraft((d) => ({ ...d, voice: e.target.value }))} rows={2} placeholder="Voce narrativa *" className={inputClass} />
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

          {!useGuidedInterview && step === 2 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                <h2 className="text-xl font-semibold text-white">Struttura</h2>
                <p className="mt-1 text-sm leading-6 text-white/60">
                  Scegli dimensione, capitoli, sottocapitoli e parti editoriali prima del blueprint.
                </p>
                </div>
                <GuidedFieldActions
                  compact
                  hasValue={Boolean(structureType.trim() && wordsPerChapter.trim() && chapters >= 1)}
                  onGenerate={generateStructureFields}
                  onRegenerate={generateStructureFields}
                  showRegenerate
                  generateLabel="Suggerisci struttura"
                />
              </div>
              {!structureType.trim() && !wordsPerChapter.trim() && (
                <GuidedEmptyState
                  missingLabel="tipo struttura e parole per capitolo"
                  description="Scriptora può proporre una struttura coerente con genere e lunghezza."
                  onGenerate={generateStructureFields}
                  onWrite={() => setStructureType("classica a tre atti")}
                />
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/52">Lunghezza</span>
                  <select value={bookLength} disabled={isFree} onChange={(event) => setBookLength(event.target.value as "short" | "medium" | "long")} className={inputClass}>
                    <option value="short">Breve</option>
                    <option value="medium">Media</option>
                    <option value="long">Lunga</option>
                  </select>
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/52">Parole per capitolo</span>
                  <input value={wordsPerChapter} onChange={(event) => setWordsPerChapter(event.target.value)} placeholder="Es. 1800-2500" className={inputClass} />
                </label>
                <label className="block space-y-1.5 sm:col-span-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/52">Tipo struttura</span>
                  <input value={structureType} onChange={(event) => setStructureType(event.target.value)} placeholder="Es. tre atti, viaggio dell'eroe, moduli pratici, sezioni poetiche" className={inputClass} />
                </label>
              </div>
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

          {!useGuidedInterview && step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Narrativa</h2>
                <p className="mt-1 text-sm leading-6 text-white/60">
                  Compila la scheda libro: personaggi quando servono, ma sempre promessa, hook, ambientazione e regole di racconto.
                </p>
              </div>

              {(!narrativePromise.trim() && !coreConflict.trim() && !openingHook.trim()) && (
                <GuidedEmptyState
                  missingLabel="promessa narrativa, conflitto o hook"
                  description="Parti dall'idea: Scriptora può estrarre protagonista, ambientazione e tensione."
                  onGenerate={generateNarrativeFields}
                  onWrite={() => setNarrativePromise("")}
                />
              )}

              <div className="flex justify-end">
                <GuidedFieldActions
                  compact
                  hasValue={Boolean(narrativePromise.trim() || coreConflict.trim())}
                  onGenerate={generateNarrativeFields}
                  onRegenerate={generateNarrativeFields}
                  showRegenerate
                  generateLabel="Genera scheda"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <input value={protagonist} onChange={(event) => setProtagonist(event.target.value)} placeholder="Protagonista" className={inputClass} />
                <input value={antagonist} onChange={(event) => setAntagonist(event.target.value)} placeholder="Antagonista / forza oppositiva" className={inputClass} />
                <input value={secondaryCast} onChange={(event) => setSecondaryCast(event.target.value)} placeholder="Cast secondario, separato da virgole" className={inputClass} />
                <input value={setting} onChange={(event) => setSetting(event.target.value)} placeholder="Ambientazione" className={inputClass} />
                <input value={pov} onChange={(event) => setPov(event.target.value)} placeholder="POV" className={inputClass} />
                <input value={tense} onChange={(event) => setTense(event.target.value)} placeholder="Tempo verbale" className={inputClass} />
                <input value={endingType} onChange={(event) => setEndingType(event.target.value)} placeholder="Tipo di finale" className={inputClass} />
                <input value={coreConflict} onChange={(event) => setCoreConflict(event.target.value)} placeholder="Conflitto centrale" className={inputClass} />
                <input value={narrativePromise} onChange={(event) => setNarrativePromise(event.target.value)} placeholder="Promessa narrativa / editoriale" className={inputClass} />
                <input value={openingHook} onChange={(event) => setOpeningHook(event.target.value)} placeholder="Hook" className={inputClass} />
                <textarea value={mainTwists} onChange={(event) => setMainTwists(event.target.value)} rows={3} placeholder="Twist, tema, regole del mondo o elementi chiave" className={`${inputClass} sm:col-span-2`} />
              </div>

              {!shouldUseCharacterForge && (
                <div className="rounded-xl border border-emerald-400/25 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-50">
                  Questo formato non richiede cast da romanzo. Scriptora userà struttura, promessa, tono e lettore per costruire il blueprint.
                </div>
              )}

              {shouldUseCharacterForge && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-white/90">Schede personaggio</h3>
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
                          toast.error(getUserFriendlyError(e, {
                            area: "blueprint",
                            fallback: "Personaggio non generato. Le schede esistenti restano salvate.",
                          }));
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
            </div>
          )}

          {!useGuidedInterview && step === 4 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                <h2 className="text-xl font-semibold text-white">Limiti e regole</h2>
                <p className="mt-1 text-sm leading-6 text-white/60">
                  Blocca canone, contenuti vietati e soglie creative prima che Scriptora generi la struttura.
                </p>
                </div>
                <GuidedFieldActions
                  compact
                  hasValue={Boolean(canonRules.trim() || forbiddenContent.trim())}
                  onGenerate={generateLimitsFields}
                  onRegenerate={generateLimitsFields}
                  showRegenerate
                  generateLabel="Regole base"
                />
              </div>

              {!canonRules.trim() && !forbiddenContent.trim() && (
                <GuidedEmptyState
                  missingLabel="regole canoniche o contenuti vietati"
                  description="Puoi partire da un set base e poi personalizzare."
                  onGenerate={generateLimitsFields}
                  onWrite={() => setCanonRules("")}
                />
              )}

              <textarea value={canonRules} onChange={(event) => setCanonRules(event.target.value)} rows={3} placeholder="Regole canoniche: cosa deve restare sempre vero nel libro" className={inputClass} />
              <textarea value={forbiddenContent} onChange={(event) => setForbiddenContent(event.target.value)} rows={3} placeholder="Cose vietate: elementi, svolte o contenuti da non generare" className={inputClass} />
              <textarea value={avoidThemes} onChange={(event) => setAvoidThemes(event.target.value)} rows={3} placeholder="Temi da evitare o trattare con cautela" className={inputClass} />

              <div className="grid gap-3 sm:grid-cols-3">
                {([
                  ["Violenza", violenceLevel, setViolenceLevel],
                  ["Oscurita", darknessLevel, setDarknessLevel],
                  ["Spice", spiceLevel, setSpiceLevel],
                ] as const).map(([label, value, setter]) => (
                  <label key={label} className="block space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/52">{label}</span>
                    <select value={value} onChange={(event) => setter(event.target.value)} className={inputClass}>
                      <option value="assente">Assente</option>
                      <option value="basso">Basso</option>
                      <option value="medio">Medio</option>
                      <option value="alto">Alto</option>
                      <option value="estremo">Estremo</option>
                    </select>
                  </label>
                ))}
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                {([
                  ["Linguaggio esplicito", explicitLanguage, setExplicitLanguage],
                  ["Romance", romancePresence, setRomancePresence],
                  ["Soprannaturale", supernaturalPresence, setSupernaturalPresence],
                ] as const).map(([label, value, setter]) => (
                  <label key={label} className="flex items-center justify-between rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm text-white">
                    {label}
                    <input type="checkbox" checked={value} onChange={(event) => setter(event.target.checked)} />
                  </label>
                ))}
              </div>

              <div className="rounded-2xl border border-white/12 bg-white/[0.04] p-3">
                <p className="text-sm font-semibold text-white">Controlli di stile</p>
                <div className="mt-3 space-y-3">
                  {([
                    ["voiceIntensity", "Voce autore"], ["emotionalIntensity", "Intensita emotiva"], ["dialogueLevel", "Dialoghi"],
                    ["poeticLevel", "Descrizioni"], ["narrativePace", "Ritmo narrativo"], ["tensionIntensity", "Tensione"],
                    ["psychologicalDepth", "Profondita"],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="block">
                      <span className="mb-1 flex justify-between text-[11px] text-white/70"><span>{label}</span><span>{styleProfile[key]}%</span></span>
                      <input type="range" min={0} max={100} value={styleProfile[key]} onChange={(e) => setStyleProfile((p) => ({ ...p, [key]: Number(e.target.value) }))} className="w-full accent-sky-400" />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {!useGuidedInterview && step === 5 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                <h2 className="text-xl font-semibold text-white">Mercato e pubblicazione</h2>
                <p className="mt-1 text-sm leading-6 text-white/60">
                  Aggiungi destinazione commerciale e dati utili per export, KDP Launch e readiness.
                </p>
                </div>
                <GuidedFieldActions
                  compact
                  hasValue={Boolean(commercialGoal.trim() && shortDescription.trim())}
                  onGenerate={generateMarketFields}
                  onRegenerate={generateMarketFields}
                  showRegenerate
                  generateLabel="Suggerisci mercato"
                />
              </div>

              {(!commercialGoal.trim() && !shortDescription.trim()) && (
                <GuidedEmptyState
                  missingLabel="obiettivo commerciale e descrizione breve"
                  description="Scriptora può derivarli da promessa narrativa e genere."
                  onGenerate={generateMarketFields}
                  onWrite={() => setCommercialGoal("")}
                />
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/52">Marketplace Amazon</span>
                  <select value={amazonMarketplace} onChange={(event) => setAmazonMarketplace(event.target.value)} className={inputClass}>
                    {AMAZON_MARKETPLACES.map((marketplace) => (
                      <option key={marketplace.id} value={marketplace.id}>{marketplace.label}</option>
                    ))}
                  </select>
                </label>
                <input value={marketTarget} onChange={(event) => setMarketTarget(event.target.value)} placeholder="Mercato target" className={inputClass} />
                <input value={publishingPlatform} onChange={(event) => setPublishingPlatform(event.target.value)} placeholder="Piattaforma: KDP, StreetLib, Kobo, Apple..." className={inputClass} />
                <input value={kdpCategory} onChange={(event) => setKdpCategory(event.target.value)} placeholder="Categoria KDP" className={inputClass} />
                <input value={initialKeywords} onChange={(event) => setInitialKeywords(event.target.value)} placeholder="Keyword iniziali" className={inputClass} />
                <input value={commercialGoal} onChange={(event) => setCommercialGoal(event.target.value)} placeholder="Obiettivo commerciale" className={inputClass} />
                <textarea value={shortDescription} onChange={(event) => setShortDescription(event.target.value)} rows={3} placeholder="Descrizione breve" className={`${inputClass} sm:col-span-2`} />
                <textarea value={marketingPromise} onChange={(event) => setMarketingPromise(event.target.value)} rows={3} placeholder="Promessa marketing" className={`${inputClass} sm:col-span-2`} />
              </div>

              <StepValidation
                coherenceReport={coherenceReport}
                validationIssues={validationIssues}
                applyCoherenceAutoFix={applyCoherenceAutoFix}
                title={title}
                authorName={authorName}
                identityDraft={identityDraft}
                genre={genre}
                subcategory={subcategory}
                chapters={chapters}
                subchaptersEnabled={subchaptersEnabled}
                subchaptersPerChapter={subchaptersPerChapter}
              />
            </div>
          )}

          {postDnaForge && (step === 6 || step === 7) ? (
            <div className="space-y-4">
              {step === 6 && blueprintError && (
                <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-left">
                  <p className="text-sm font-semibold text-rose-100">Blueprint non completato — controlliamo i punti critici</p>
                  <p className="mt-1 text-xs leading-5 text-rose-100/70">{blueprintError}</p>
                </div>
              )}
              {step === 6 && !blueprintError && preflightResult && !preflightResult.ready && (
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
              )}
              <BlueprintTheater
                mode="forge"
                title={title}
                subtitle={subtitle}
                author={authorName || identityDraft.penName}
                genre={[genre, subcategory].filter(Boolean).join(" · ")}
                blueprint={blueprintPreview}
                generatingBlueprint={generatingBlueprint}
                blueprintElapsedSeconds={blueprintElapsedSeconds}
                forgeCopy={forgeTheaterCopy}
                chapterCount={chapters}
                editable={step === 7 && Boolean(blueprintPreview)}
                reorderable={step === 7 && Boolean(blueprintPreview)}
                onChapterTitleChange={updateBlueprintChapterTitle}
                onSubchapterTitleChange={updateBlueprintSubchapterTitle}
                onReorderChapter={reorderBlueprintChapter}
                onTitleChange={setTitle}
                onSubtitleChange={setSubtitle}
                italianUi={language === "Italian"}
              />
            </div>
          ) : !useGuidedInterview && step === 6 ? (
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
                  <p className="mt-1 text-xs leading-5 text-rose-100/70">{blueprintError}</p>
                </div>
              ) : preflightResult && !preflightResult.ready ? (
                <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-left space-y-3">
                  <p className="text-sm font-semibold text-amber-100">Completiamo il progetto</p>
                  <p className="text-xs leading-5 text-amber-100/75">{preflightResult.humanSummary}</p>
                  <ul className="space-y-2">
                    {preflightResult.issues.map((issue) => (
                      <li key={issue.id} className="flex items-start gap-2 text-xs text-amber-50/90">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>{issue.humanHint || issue.message}</span>
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
                </div>
              )}
            </div>
          ) : !useGuidedInterview && step === 7 && blueprintPreview ? (
            <div className="space-y-5">
              <h2 className="text-2xl font-semibold text-white">Approvazione autore</h2>
              <p className="text-sm text-white/65">Rivedi blueprint e checklist prima di aprire Writer.</p>
              <StepApprovalChecklist items={approvalChecklistItems} />
            </div>
          ) : null}
        </div>
        <WizardFooter
          step={step}
          postDnaForge={postDnaForge}
          generatingBlueprint={generatingBlueprint}
          launching={launching}
          shouldUseCharacterForge={shouldUseCharacterForge}
          closeWizard={closeWizard}
          setStep={setStep}
          goNext={goNext}
          finishApproved={finishApproved}
          canAdvance={currentStepComplete || step >= 6}
          advanceHint={stepAdvanceHint}
          approvalReady={approvalReady}
        />
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

function GuidedDecisionRail({
  activeIndex,
  onJump,
  forgeState,
}: {
  activeIndex: number;
  onJump: (step: number) => void;
  forgeState: BookForgeWizardState;
}) {
  return (
    <div className="rounded-2xl border border-white/12 bg-white/[0.035] p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/52">Percorso libro</p>
        <span className="rounded-full border border-sky-300/25 bg-sky-300/10 px-2 py-1 text-[10px] font-semibold text-sky-100">
          8 step guidati
        </span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {BOOK_CREATION_DECISIONS.map((decision, index) => {
          const reachable = index <= activeIndex || canAdvanceToStep(index, forgeState);
          return (
            <button
              key={decision}
              type="button"
              disabled={!reachable}
              onClick={() => onJump(index)}
              className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                index === activeIndex
                  ? "border-sky-300/60 bg-sky-300/20 text-sky-50"
                  : index < activeIndex
                    ? "border-sky-300/40 bg-sky-300/12 text-sky-100 hover:bg-sky-300/18"
                    : reachable
                      ? "border-white/15 bg-white/[0.06] text-white/65 hover:bg-white/10"
                      : "border-white/10 bg-white/[0.04] text-white/35 cursor-not-allowed"
              }`}
            >
              {index + 1}. {decision}
            </button>
          );
        })}
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
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-200/70">Blueprint</p>
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
