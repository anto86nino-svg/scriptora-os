import { buildRealWorldBenchmarkCorpus, type RealWorldProject } from "@/lib/live-author-validation/corpus/real-world-projects";

const CATEGORY_ORDER = [
  "Romance / Dark Romance",
  "Thriller / Crime",
  "Fantasy",
  "Memoir / Emotional Fiction",
  "Self-help",
  "Business",
  "Practical Guides",
] as const;

export function buildLiveTestMatrix(options?: { projectsPerCategory?: number; smoke?: boolean }): RealWorldProject[] {
  const perCategory = options?.smoke ? 1 : (options?.projectsPerCategory ?? 3);
  const corpus = buildRealWorldBenchmarkCorpus();
  const byCategory = new Map<string, RealWorldProject[]>();

  for (const project of corpus) {
    const list = byCategory.get(project.category) || [];
    list.push(project);
    byCategory.set(project.category, list);
  }

  const selected: RealWorldProject[] = [];
  for (const category of CATEGORY_ORDER) {
    const projects = byCategory.get(category) || [];
    selected.push(...projects.slice(0, perCategory));
  }

  return selected;
}

export function chapterGoalForProject(project: RealWorldProject, chapterIndex: number): string {
  const n = chapterIndex + 1;
  const genreGoals: Record<string, string> = {
    romance: "Build yearning and chemistry through restraint; delay payoff; sharpen emotional friction.",
    thriller: "Escalate stakes; plant a mystery beat; end on momentum or cliffhanger.",
    fantasy: "Advance canon; reinforce world rules; plant foreshadowing without exposition dump.",
    memoir: "Specific memory scene; vulnerability without over-explaining emotion.",
    selfHelp: "One actionable framework; authority through specificity, not fluff.",
    business: "Clear framework; practical decision logic; credible authority tone.",
    horticultural: "Step-by-step instruction; troubleshooting; zero self-help drift.",
  };

  const goal = genreGoals[project.genreKey] || "Advance the book arc with genre-appropriate tension.";
  return `Chapter ${n} of "${project.title}". ${goal}`;
}

export function wordTargetForHarness(project: RealWorldProject, smoke: boolean): number {
  if (smoke) return 600;
  if (project.genreKey === "fantasy") return 900;
  if (project.genreKey === "horticultural") return 700;
  return 800;
}

export function chaptersForProject(project: RealWorldProject, smoke: boolean, override?: number): number {
  if (typeof override === "number") return override;
  if (smoke) return 1;
  const minimums: Record<string, number> = {
    romance: 6,
    thriller: 6,
    fantasy: 10,
    memoir: 5,
    selfHelp: 4,
    business: 4,
    horticultural: 4,
  };
  return minimums[project.genreKey] ?? 3;
}

export const LIVE_TEST_MATRIX_STATS = {
  categories: CATEGORY_ORDER.length,
  minimumProjectsPerCategory: 3,
  smokeProjectsPerCategory: 1,
};
