import type { BookConfig } from "@/types/book";
import type {
  ChapterScenePurposeSnapshot,
  ScenePurpose,
  ScenePurposeEntry,
} from "./types";

const PURPOSE_SIGNALS: Record<ScenePurpose, RegExp[]> = {
  tension: [/\b(but|però|however|tension|tensione|edge|unspoken|non detto)\b/i],
  reveal: [/\b(reveal|rivel|discovered|scopr|truth|verità|realized|capì che)\b/i],
  emotional_progression: [/\b(felt|sentì|heart|cuore|tears|lacrime|trembl|shook)\b/i],
  plot_progression: [/\b(then|poi|next|decided|decise|arrived|arriv|left|partì|plan|piano)\b/i],
  foreshadowing: [/\b(later|più tardi|would matter|non immaginava|little did|prima o poi)\b/i],
  romance_escalation: [/\b(kiss|bacio|touch|tocco|desire|desider|proximity|vicin|yearn|brama)\b/i],
  conflict: [/\b(argu|litig|shout|grid|fight|combat|clash|scontro|accus)\b/i],
  world_building: [/\b(city|città|kingdom|regno|world|mondo|rule|legge|tradition|storia del)\b/i],
  mystery: [/\b(mystery|mistero|secret|segreto|unknown|sconosciut|who|chi|why|perché|\?)\b/i],
  emotional_recovery: [/\b(calm|calma|breathe|respir|healed|guar|peace|pace|quiet|silenzio)\b/i],
  pacing_relief: [/\b(laugh|rise|coffee|caffè|joke|scherz|light|leggero|break|pausa)\b/i],
  character_transformation: [/\b(changed|cambiat|never again|mai più|understood|comprese|shifted)\b/i],
  instruction: [/\b(step|passo|tool|strumento|measure|misur|season|stagione|how to|come)\b/i],
  unclear: [],
};

const NONFICTION_BRAINS = /manual|horticultural|self-help|productivity|business|education|cookbook|technical|study|finance|health|fitness|parenting/;

function isNonfictionBrain(config?: BookConfig): boolean {
  const brainId = config?.bookIntelligence?.layers?.writingBrainId || "";
  const domain = config?.bookIntelligence?.layers?.domain;
  if (domain === "nonfiction") return true;
  return NONFICTION_BRAINS.test(brainId);
}

function splitScenes(text: string): string[] {
  const normalized = text.trim();
  if (!normalized) return [];

  const byBreak = normalized.split(/\n\s*(?:---|\*\*\*|—{3,})\s*\n/);
  if (byBreak.length > 1) return byBreak.map(s => s.trim()).filter(Boolean);

  const paragraphs = normalized.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  if (paragraphs.length <= 1) return [normalized];

  // Default: each paragraph block is a scene unit for purpose analysis
  if (paragraphs.every(p => p.split(/\s+/).length >= 8)) {
    return paragraphs;
  }

  const scenes: string[] = [];
  let buffer: string[] = [];

  for (const para of paragraphs) {
    const isShift =
      /^(scene|scena|capitolo|chapter|\d+\.|\[)/i.test(para) ||
      /^(later|poi|the next|il giorno dopo|hours later|ore dopo)/i.test(para);

    if (isShift && buffer.length) {
      scenes.push(buffer.join("\n\n"));
      buffer = [para];
    } else {
      buffer.push(para);
    }
  }
  if (buffer.length) scenes.push(buffer.join("\n\n"));

  return scenes.length ? scenes : [normalized];
}

function scorePurposes(text: string, nonfiction: boolean): Array<{ purpose: ScenePurpose; score: number }> {
  const scores: Array<{ purpose: ScenePurpose; score: number }> = [];

  for (const [purpose, patterns] of Object.entries(PURPOSE_SIGNALS) as [ScenePurpose, RegExp[]][]) {
    if (purpose === "unclear") continue;
    let score = 0;
    for (const pattern of patterns) {
      const matches = text.match(new RegExp(pattern.source, "gi"));
      score += matches?.length || 0;
    }
    if (nonfiction && purpose === "instruction") score += 2;
    if (nonfiction && (purpose === "romance_escalation" || purpose === "foreshadowing")) score *= 0.3;
    if (score > 0) scores.push({ purpose, score });
  }

  scores.sort((a, b) => b.score - a.score);
  return scores;
}

function assessScene(
  sceneIndex: number,
  text: string,
  nonfiction: boolean,
): ScenePurposeEntry {
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const scored = scorePurposes(text, nonfiction);
  const purposes = scored.slice(0, 3).map(s => s.purpose);
  const primaryPurpose = purposes[0] || (nonfiction ? "instruction" : "unclear");

  let health: ScenePurposeEntry["health"] = "adequate";
  let issue: string | undefined;
  let recommendation: string | undefined;

  if (wordCount < 40 && primaryPurpose === "unclear") {
    health = "weak";
    issue = "Scene too thin to carry narrative purpose";
    recommendation = "Expand with a concrete story beat or cut and merge";
  } else if (primaryPurpose === "unclear" && wordCount >= 25) {
    health = "weak";
    issue = "Beautiful but unclear purpose";
    recommendation = "Define why this scene exists — tension, reveal, or progression";
  } else if (primaryPurpose === "unclear" && wordCount > 80) {
    health = "weak";
    issue = "Beautiful but unclear purpose";
    recommendation = "Define why this scene exists — tension, reveal, or progression";
  } else if (primaryPurpose === "emotional_recovery" && scored.filter(s => s.purpose === "emotional_progression").length === 0) {
    health = "adequate";
  } else if (scored[0]?.score >= 2) {
    health = "strong";
  }

  return {
    sceneIndex,
    wordCount,
    excerpt: text.slice(0, 140).trim() + (text.length > 140 ? "…" : ""),
    purposes: purposes.length ? purposes : [primaryPurpose],
    primaryPurpose,
    health,
    issue,
    recommendation,
  };
}

function detectRepetition(scenes: ScenePurposeEntry[]): { warnings: string[]; recommendations: string[] } {
  const warnings: string[] = [];
  const recommendations: string[] = [];

  let runPurpose: ScenePurpose | null = null;
  let runLength = 0;
  let maxRun = 0;
  let maxRunPurpose: ScenePurpose | null = null;

  for (const scene of scenes) {
    if (scene.primaryPurpose === runPurpose) {
      runLength += 1;
    } else {
      if (runLength > maxRun) {
        maxRun = runLength;
        maxRunPurpose = runPurpose;
      }
      runPurpose = scene.primaryPurpose;
      runLength = 1;
    }
  }
  if (runLength > maxRun) {
    maxRun = runLength;
    maxRunPurpose = runPurpose;
  }

  if (maxRun >= 3 && maxRunPurpose) {
    warnings.push(`${maxRun} consecutive "${maxRunPurpose.replace(/_/g, " ")}" scenes — repetition risk`);
    recommendations.push("Vary scene function: merge, compress, or add plot/reveal movement");
  }

  const introspectionRun = scenes.filter(s =>
    s.primaryPurpose === "emotional_progression" || s.primaryPurpose === "emotional_recovery",
  ).length;
  if (introspectionRun >= 4 && scenes.length >= 4) {
    warnings.push(`${introspectionRun} introspection-heavy scenes — reader momentum may stall`);
    recommendations.push("Compress emotional repetition; add external conflict or reveal");
  }

  const weakScenes = scenes.filter(s => s.health === "weak");
  if (weakScenes.length >= 2) {
    warnings.push(`${weakScenes.length} scenes lack clear purpose`);
    recommendations.push("Merge weak scenes or sharpen their narrative job");
  }

  const unclearRatio = scenes.filter(s => s.primaryPurpose === "unclear").length / Math.max(1, scenes.length);
  if (unclearRatio >= 0.5 && scenes.length >= 2) {
    warnings.push("Majority of scenes lack detectable purpose");
    recommendations.push("Each scene needs a job: tension, reveal, progression, or escalation");
  }

  return { warnings, recommendations };
}

export function analyzeChapterScenePurpose(input: {
  content: string;
  chapterIndex: number;
  config?: BookConfig;
}): ChapterScenePurposeSnapshot {
  const nonfiction = isNonfictionBrain(input.config);
  const rawScenes = splitScenes(input.content);
  const scenes = rawScenes.map((text, index) => assessScene(index + 1, text, nonfiction));
  const { warnings, recommendations } = detectRepetition(scenes);

  const weakCount = scenes.filter(s => s.health === "weak").length;
  const overallHealth: ChapterScenePurposeSnapshot["overallHealth"] =
    weakCount >= 2 || warnings.length >= 2
      ? "weak"
      : warnings.length >= 1 || weakCount === 1
        ? "at-risk"
        : "healthy";

  return {
    version: 1,
    chapterIndex: input.chapterIndex,
    evaluatedAt: new Date().toISOString(),
    overallHealth,
    scenes,
    warnings,
    recommendations,
  };
}

export function formatScenePurposeLabel(purpose: ScenePurpose): string {
  return purpose.replace(/_/g, " ");
}
