import type { BookConfig } from "@/types/book";
import type { CorpusGenreKey } from "./competitor-corpus";
import {
  FIXTURE_DARK_ROMANCE_STRONG,
  FIXTURE_THRILLER_STRONG,
  FIXTURE_FANTASY_CANON_SEED,
  FIXTURE_MEMOIR_STRONG,
  FIXTURE_SELF_HELP_STRONG,
  FIXTURE_BUSINESS_STRONG,
  FIXTURE_HORTICULTURAL_STRONG,
} from "@/lib/intelligence-stabilization/fixtures/benchmark-corpus";

export interface RealWorldProject {
  id: string;
  category: string;
  genreKey: CorpusGenreKey;
  title: string;
  config: Partial<BookConfig>;
  scriptoraSample: string;
  chapterCount: number;
  wordTarget: number;
}

const ROMANCE_TITLES = [
  "Salt on His Skin",
  "The Room He Never Enters",
  "Borrowed Heat",
  "After the Fire Door",
  "No Saints in Milan",
];

const THRILLER_TITLES = [
  "The Wrong Timestamp",
  "Quiet House Protocol",
  "Debt of Silence",
  "Last Known Exit",
  "The Second Witness",
];

const FANTASY_TITLES = [
  "The Iron Pact",
  "Second Bell",
  "Ash Bridge",
  "Canon of Salt",
  "The Oath Brand",
];

const MEMOIR_TITLES = [
  "Leaving Before Knock",
  "Winter Sorting",
  "Mother's Door",
  "Boxes Not Failure",
  "Halfway Through",
];

const SELF_HELP_TITLES = [
  "Friction First Habits",
  "Seven Day Stack",
  "Environment Beats Will",
  "One Behavior Rule",
  "Cue Your Future Self",
];

const BUSINESS_TITLES = [
  "Price the Avoided Loss",
  "Churn Math",
  "Value Before Cost",
  "Buyer Problem Frame",
  "Week One ROI",
];

const HORTICULTURAL_TITLES = [
  "Tomato Soil Guide",
  "Seedling Hardening Manual",
  "Yellow Leaf Troubleshooting",
  "pH Before Planting",
  "Transplant Shock Prevention",
];

function romanceProjects(): RealWorldProject[] {
  return ROMANCE_TITLES.map((title, i) => ({
    id: `rw-romance-${i + 1}`,
    category: "Romance / Dark Romance",
    genreKey: "romance" as const,
    title,
    config: {
      genre: "dark-romance",
      tone: "intense, restrained",
      bookIntelligence: { layers: { writingBrainId: "dark-romance-brain", domain: "fiction" } },
    },
    scriptoraSample: FIXTURE_DARK_ROMANCE_STRONG + `\n\nProject variant ${i + 1}: ${title}.`,
    chapterCount: 24,
    wordTarget: 75000,
  }));
}

function thrillerProjects(): RealWorldProject[] {
  return THRILLER_TITLES.map((title, i) => ({
    id: `rw-thriller-${i + 1}`,
    category: "Thriller / Crime",
    genreKey: "thriller" as const,
    title,
    config: { genre: "thriller", tone: "paranoid, urgent", bookIntelligence: { layers: { writingBrainId: "thriller-brain", domain: "fiction" } } },
    scriptoraSample: FIXTURE_THRILLER_STRONG + `\n\nCase file ${i + 1}: ${title}.`,
    chapterCount: 28,
    wordTarget: 82000,
  }));
}

function fantasyProjects(): RealWorldProject[] {
  return FANTASY_TITLES.map((title, i) => ({
    id: `rw-fantasy-${i + 1}`,
    category: "Fantasy",
    genreKey: "fantasy" as const,
    title,
    config: { genre: "fantasy", numberOfChapters: 30, bookIntelligence: { layers: { writingBrainId: "fantasy-brain", domain: "fiction" } } },
    scriptoraSample: FIXTURE_FANTASY_CANON_SEED + `\n\nSaga ${i + 1}: ${title}.`,
    chapterCount: 30,
    wordTarget: 95000,
  }));
}

function memoirProjects(): RealWorldProject[] {
  return MEMOIR_TITLES.map((title, i) => ({
    id: `rw-memoir-${i + 1}`,
    category: "Memoir / Emotional Fiction",
    genreKey: "memoir" as const,
    title,
    config: { genre: "memoir", tone: "intimate, precise" },
    scriptoraSample: FIXTURE_MEMOIR_STRONG + `\n\nEssay ${i + 1}: ${title}.`,
    chapterCount: 18,
    wordTarget: 62000,
  }));
}

function selfHelpProjects(): RealWorldProject[] {
  return SELF_HELP_TITLES.map((title, i) => ({
    id: `rw-selfhelp-${i + 1}`,
    category: "Self-help",
    genreKey: "selfHelp" as const,
    title,
    config: { genre: "self-help", bookIntelligence: { layers: { writingBrainId: "self-help-brain", domain: "nonfiction" } } },
    scriptoraSample: FIXTURE_SELF_HELP_STRONG + `\n\nModule ${i + 1}: ${title}.`,
    chapterCount: 14,
    wordTarget: 55000,
  }));
}

function businessProjects(): RealWorldProject[] {
  return BUSINESS_TITLES.map((title, i) => ({
    id: `rw-business-${i + 1}`,
    category: "Business",
    genreKey: "business" as const,
    title,
    config: { genre: "business", bookIntelligence: { layers: { writingBrainId: "business-brain", domain: "nonfiction" } } },
    scriptoraSample: FIXTURE_BUSINESS_STRONG + `\n\nPlaybook ${i + 1}: ${title}.`,
    chapterCount: 12,
    wordTarget: 48000,
  }));
}

function horticulturalProjects(): RealWorldProject[] {
  return HORTICULTURAL_TITLES.map((title, i) => ({
    id: `rw-hort-${i + 1}`,
    category: "Practical Guides",
    genreKey: "horticultural" as const,
    title: `Manuale coltivazione pomodoro — ${title}`,
    config: {
      genre: "gardening",
      title: `Manuale coltivazione pomodoro — ${title}`,
      bookIntelligence: { layers: { writingBrainId: "horticultural-guide-brain", domain: "nonfiction" } },
    },
    scriptoraSample: FIXTURE_HORTICULTURAL_STRONG + `\n\nSection ${i + 1}.`,
    chapterCount: 10,
    wordTarget: 42000,
  }));
}

export function buildRealWorldBenchmarkCorpus(): RealWorldProject[] {
  return [
    ...romanceProjects(),
    ...thrillerProjects(),
    ...fantasyProjects(),
    ...memoirProjects(),
    ...selfHelpProjects(),
    ...businessProjects(),
    ...horticulturalProjects(),
  ];
}

export const REAL_WORLD_BENCHMARK_STATS = {
  totalProjects: 35,
  categories: 7,
  projectsPerCategory: 5,
};
