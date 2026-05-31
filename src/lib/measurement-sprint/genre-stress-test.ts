import type { Chapter } from "@/types/book";
import { generateValidationCorpus } from "@/lib/editorial-validation-suite/corpus-generator";
import { evaluateOrchestratorChapter } from "@/lib/editorial-validation-suite/orchestrator-pipeline";
import type { ValidationGenre } from "@/lib/editorial-validation-suite/types";
import type { GenreStressResult } from "./types";

const STRESS_GENRES: ValidationGenre[] = ["romance", "thriller", "fantasy", "self-help"];

export function runGenreStressTest(genre: ValidationGenre): GenreStressResult {
  const corpus = generateValidationCorpus().filter(c => c.genre === genre);
  const previousChapters: Chapter[] = [];
  const metricsList = [];

  for (const item of corpus) {
    const { metrics, deliveredChapter } = evaluateOrchestratorChapter({
      genre: item.genre,
      chapterIndex: item.chapterIndex,
      title: item.title,
      rawContent: item.content,
      previousChapters: [...previousChapters],
    });
    metricsList.push(metrics);
    previousChapters.push(deliveredChapter);
  }

  const n = metricsList.length || 1;
  const weaknessCounts = new Map<string, number>();

  for (const m of metricsList) {
    if (m.criticalIssues > 0) weaknessCounts.set("critical_issues", (weaknessCounts.get("critical_issues") || 0) + 1);
    if (m.problems.cliches > 0) weaknessCounts.set("cliches", (weaknessCounts.get("cliches") || 0) + 1);
    if (m.problems.explainedEmotions > 0) weaknessCounts.set("explained_emotions", (weaknessCounts.get("explained_emotions") || 0) + 1);
    if (m.problems.characterIncoherences > 0) weaknessCounts.set("character_incoherence", (weaknessCounts.get("character_incoherence") || 0) + 1);
    if (m.problems.missingPayoffs > 0) weaknessCounts.set("missing_payoffs", (weaknessCounts.get("missing_payoffs") || 0) + 1);
    if (m.readerRetention < 50) weaknessCounts.set("low_retention", (weaknessCounts.get("low_retention") || 0) + 1);
    if (!m.passesPreDelivery) weaknessCounts.set("pre_delivery_fail", (weaknessCounts.get("pre_delivery_fail") || 0) + 1);
    if (m.supremeComposite < 75) weaknessCounts.set("supreme_below_target", (weaknessCounts.get("supreme_below_target") || 0) + 1);
  }

  const topWeaknesses = [...weaknessCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k, v]) => `${k}: ${v}/${n} chapters`);

  return {
    genre,
    chapterCount: n,
    avgSupreme: Math.round(metricsList.reduce((s, m) => s + m.supremeComposite, 0) / n),
    avgGreatness: Math.round(metricsList.reduce((s, m) => s + m.greatnessComposite, 0) / n),
    avgNarrativeMagic: Math.round(metricsList.reduce((s, m) => s + m.narrativeMagicComposite, 0) / n),
    totalCriticalIssues: metricsList.reduce((s, m) => s + m.criticalIssues, 0),
    preDeliveryPassRate: Math.round((metricsList.filter(m => m.passesPreDelivery).length / n) * 100),
    topWeaknesses,
    chaptersFailingRetention: metricsList.filter(m => m.readerRetention < 50).length,
  };
}

export function runAllGenreStressTests(): GenreStressResult[] {
  return STRESS_GENRES.map(runGenreStressTest);
}

export function runRomanceStressTest(): GenreStressResult {
  return runGenreStressTest("romance");
}

export function runThrillerStressTest(): GenreStressResult {
  return runGenreStressTest("thriller");
}

export function runSelfHelpStressTest(): GenreStressResult {
  return runGenreStressTest("self-help");
}

export function runFantasyStressTest(): GenreStressResult {
  return runGenreStressTest("fantasy");
}
