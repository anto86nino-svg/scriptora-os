import type { Language } from "@/types/book";
import { inferGenreFromText, type GenreInference } from "./genre-inference";

export const WIZARD_TITLE_FREE_REGENS = 3;
const FREE_REGENS_KEY = "scriptora-wizard-title-free-regens";

export type TitleProposalBadge =
  | "Più dark"
  | "Più commerciale"
  | "Più poetico"
  | "Più BookTok"
  | "Più KDP";

export type TitleProposal = {
  title: string;
  subtitle: string;
  perceivedGenre: string;
  editorialPromise: string;
  hookScore: number;
  rationale: string;
  badge: TitleProposalBadge;
  inference: GenreInference;
};

export const TITLE_FORGE_PHASES = [
  "Sto leggendo il DNA commerciale della tua idea…",
  "Sto cercando il titolo che resta addosso…",
  "Sto allineando genere, promessa e mercato…",
  "Sto modellando sottotitoli ad alta retention…",
  "Quasi pronto: seleziona il titolo che ti chiama.",
] as const;

function hashSeed(input: string): number {
  return Array.from(input).reduce((sum, char) => Math.imul(sum ^ char.charCodeAt(0), 16777619), 2166136261) >>> 0;
}

function pick<T>(list: T[], seed: number, offset = 0): T {
  return list[(seed + offset) % list.length];
}

export function getWizardTitleFreeRegensRemaining(): number {
  if (typeof window === "undefined") return WIZARD_TITLE_FREE_REGENS;
  try {
    const raw = sessionStorage.getItem(FREE_REGENS_KEY);
    if (raw === null) return WIZARD_TITLE_FREE_REGENS;
    const used = Number(raw);
    if (!Number.isFinite(used)) return WIZARD_TITLE_FREE_REGENS;
    return Math.max(0, WIZARD_TITLE_FREE_REGENS - used);
  } catch {
    return WIZARD_TITLE_FREE_REGENS;
  }
}

export function consumeWizardTitleFreeRegen(): number {
  const before = getWizardTitleFreeRegensRemaining();
  if (before <= 0) return 0;
  try {
    const used = WIZARD_TITLE_FREE_REGENS - before + 1;
    sessionStorage.setItem(FREE_REGENS_KEY, String(used));
  } catch { /* noop */ }
  return getWizardTitleFreeRegensRemaining();
}

const HORROR_TITLES = [
  "La Casa Sotto la Pelle",
  "Le Madri del Buio",
  "Quello che la Notte Conserva",
  "I Segni nel Sangue Silente",
  "La Stanza che Non Dimentica",
  "Dietro l'Ombra delle Madri",
  "Il Villaggio che Sussurra",
  "Nessuno Torna dal Fiume Nero",
];

const HORROR_SUBS = [
  "Un mistero disturbante che non lascia più dormire.",
  "Quando il paese nasconde ciò che le madri non possono dire.",
  "Ogni segreto ha un odore. Ogni verità ha un prezzo.",
  "La paura non arriva di colpo: si installa sotto la pelle.",
  "Un horror psicologico che stringe piano, fino a spezzare.",
];

const ROMANCE_TITLES = ["Il Patto delle Cose Spezzate", "Quando il Desiderio Fa Male", "La Stanza dei Segreti Dolci"];
const THRILLER_TITLES = ["La Verità che Non Aspetta", "Ombre sul Confine", "Il Silenzio del Testimone"];
const SELF_HELP_TITLES = ["L'Arte di Tornare a Sé", "Disciplina Senza Violenza", "Piccoli Passi, Grande Direzione"];
const FANTASY_TITLES = ["La Cattedrale delle Anime Dimenticate", "Il Regno delle Ombre Lente", "La Porta dei Nomi Persi"];

const BADGES: TitleProposalBadge[] = ["Più dark", "Più commerciale", "Più poetico", "Più BookTok", "Più KDP"];

function titlesForInference(inference: GenreInference): string[] {
  if (inference.bookTypeId === "horror" || inference.genre === "horror") return HORROR_TITLES;
  if (inference.bookTypeId === "dark-romance") return ROMANCE_TITLES;
  if (inference.bookTypeId === "thriller") return THRILLER_TITLES;
  if (inference.level1 === "self-help") return SELF_HELP_TITLES;
  if (inference.bookTypeId === "fantasy") return FANTASY_TITLES;
  return [...HORROR_TITLES, ...THRILLER_TITLES, ...ROMANCE_TITLES].slice(0, 6);
}

function subtitlesForInference(inference: GenreInference): string[] {
  if (inference.bookTypeId === "horror") return HORROR_SUBS;
  if (inference.level1 === "self-help") {
    return [
      "Una guida pratica per ritrovare calma, direzione e presenza.",
      "Strumenti concreti per uscire dal caos mentale.",
      "Dal sovraccarico a una pratica quotidiana sostenibile.",
    ];
  }
  return [
    inference.narrativePromise,
    "Una storia che resta addosso fino all'ultima pagina.",
    "Promessa editoriale forte, hook immediato, payoff memorabile.",
  ];
}

function rationaleFor(badge: TitleProposalBadge, inference: GenreInference): string {
  const map: Record<TitleProposalBadge, string> = {
    "Più dark": "Suona inquietante e memorabile per lettori horror/thriller.",
    "Più commerciale": "Titolo scannable su Amazon con promessa chiara nel sottotitolo.",
    "Più poetico": "Immagini forti senza perdere leggibilità commerciale.",
    "Più BookTok": "Hook emotivo adatto a clip, citazioni e tensione visiva.",
    "Più KDP": "Keyword naturali e posizionamento categoria coerente.",
  };
  return `${map[badge]} Filone: ${inference.label}.`;
}

export function generateWizardTitleProposals(
  titleSeed: string,
  idea: string,
  language: Language,
  regenSalt = "",
): TitleProposal[] {
  const inference = inferGenreFromText(titleSeed || idea, idea);
  const seed = hashSeed(`${titleSeed}|${idea}|${language}|${regenSalt}|${Date.now()}`);
  const titles = titlesForInference(inference);
  const subs = subtitlesForInference(inference);

  if (titleSeed.trim() && inference.bookTypeId === "horror" && !titles.includes(titleSeed.trim())) {
    titles.unshift(titleSeed.trim());
  }

  const proposals: TitleProposal[] = [];
  for (let i = 0; i < 5; i += 1) {
    const badge = BADGES[i % BADGES.length];
    const title = i === 0 && titleSeed.trim().length >= 4 ? titleSeed.trim() : pick(titles, seed, i * 3);
    const subtitle = pick(subs, seed, i * 5 + 1);
    const hookScore = Math.min(98, 72 + ((seed + i * 7) % 22));
    proposals.push({
      title,
      subtitle,
      perceivedGenre: inference.label,
      editorialPromise: inference.narrativePromise,
      hookScore,
      rationale: rationaleFor(badge, inference),
      badge,
      inference,
    });
  }

  return proposals.filter((p, idx, arr) => arr.findIndex((x) => x.title === p.title) === idx);
}

export async function runTitleForgeAnimation(
  onPhase: (index: number, text: string) => void,
  msPerPhase = 520,
): Promise<void> {
  for (let i = 0; i < TITLE_FORGE_PHASES.length; i += 1) {
    onPhase(i, TITLE_FORGE_PHASES[i]);
    await new Promise((r) => window.setTimeout(r, msPerPhase));
  }
}
