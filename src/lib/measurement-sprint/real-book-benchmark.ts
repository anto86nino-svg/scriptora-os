import { buildRealWorldBenchmarkCorpus } from "@/lib/live-author-validation/corpus/real-world-projects";
import { runScriptoraPipeline } from "./helpers";
import type { RealBookBenchmarkRow } from "./types";

export function runRealBookBenchmarkSuite(): RealBookBenchmarkRow[] {
  const corpus = buildRealWorldBenchmarkCorpus();
  return corpus.map(project => {
    const { metrics } = runScriptoraPipeline({
      content: project.scriptoraSample,
      config: project.config,
      chapterIndex: 2,
    });
    return {
      projectId: project.id,
      title: project.title,
      category: project.category,
      supremeComposite: metrics.supremeComposite,
      greatnessComposite: metrics.greatnessComposite,
      narrativeMagicComposite: metrics.narrativeMagicComposite,
      rubricComposite: metrics.rubric.composite,
      criticalIssues: metrics.criticalIssues,
      passesPreDelivery: metrics.passesPreDelivery,
    };
  });
}
