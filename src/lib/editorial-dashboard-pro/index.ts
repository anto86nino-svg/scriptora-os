import { analyzeNovel } from "@/lib/EditorialIntelligence";
import { evaluateBestsellerChapter } from "@/lib/bestseller-intelligence";
import { simulateReaderEmotion } from "@/lib/narrative-intelligence-v2/reader-emotion";
import { analyzeChapterScenePurpose } from "@/lib/narrative-intelligence-v2/scene-purpose";
import type { BookConfig, BookProject } from "@/types/book";

export interface ChapterHeatPoint {
  chapter: number;
  title: string;
  intensity: number;
  label: "low" | "medium" | "high";
}

export interface TensionPoint {
  chapter: number;
  tension: number;
}

export interface ChapterWarning {
  chapter: number;
  severity: "high" | "medium" | "low";
  code: string;
  message: string;
}

export interface CommercialReadability {
  bingeability: number;
  emotionalPull: number;
  pacingMomentum: number;
  sceneTension: number;
  payoffQuality: number;
  composite: number;
}

export interface BookEditorialDashboard {
  emotionalHeatmap: ChapterHeatPoint[];
  tensionCurve: TensionPoint[];
  dropRiskChapters: number[];
  warnings: ChapterWarning[];
  commercial: CommercialReadability;
}

function chapterContent(ch: BookProject["chapters"][number]): string {
  const subs = (ch.subchapters || []).map(s => s.content).join("\n");
  return `${ch.content}\n${subs}`.trim();
}

export function computeBookEditorialDashboard(project: BookProject): BookEditorialDashboard | null {
  const chapters = project.chapters.filter(ch => chapterContent(ch).length >= 80);
  if (chapters.length < 2) return null;

  const config = project.config as BookConfig;
  const emotionalHeatmap: ChapterHeatPoint[] = [];
  const tensionCurve: TensionPoint[] = [];
  const warnings: ChapterWarning[] = [];
  const dropRiskChapters: number[] = [];

  let bingeSum = 0;
  let pullSum = 0;
  let paceSum = 0;
  let tensionSum = 0;
  let payoffSum = 0;

  chapters.forEach((chapter, index) => {
    const content = chapterContent(chapter);
    const reader = simulateReaderEmotion({
      content,
      chapterIndex: index,
      config,
      totalChapters: project.chapters.length,
    });
    const scene = analyzeChapterScenePurpose({ content, chapterIndex: index, config });
    const editorial = analyzeNovel(content);
    const best = evaluateBestsellerChapter({
      content,
      chapterIndex: index,
      totalChapters: project.chapters.length,
      chapterTitle: chapter.title,
      genre: config.genre,
      bookIntelligence: config.bookIntelligence,
    });

    const intensity = Number(
      ((reader.curiosity + reader.compulsiveReadability + reader.emotionalTension) / 30).toFixed(1),
    );
    emotionalHeatmap.push({
      chapter: index + 1,
      title: chapter.title || `Chapter ${index + 1}`,
      intensity,
      label: intensity >= 7 ? "high" : intensity >= 4.5 ? "medium" : "low",
    });

    tensionCurve.push({
      chapter: index + 1,
      tension: Number((reader.emotionalTension / 100).toFixed(2)),
    });

    if (best.scores.hookStrength < 55 && index > 0) {
      warnings.push({
        chapter: index + 1,
        severity: "medium",
        code: "weak-hook",
        message: "Opening lacks a strong commercial hook.",
      });
    }

    if (editorial.warnings.some(w => w.type === "emotional_redundancy")) {
      warnings.push({
        chapter: index + 1,
        severity: "medium",
        code: "emotional-repetition",
        message: "Emotional beats repeat instead of escalating.",
      });
    }

    if (scene.overallHealth === "weak" || scene.overallHealth === "critical") {
      warnings.push({
        chapter: index + 1,
        severity: scene.overallHealth === "critical" ? "high" : "medium",
        code: "flat-conflict",
        message: scene.recommendations[0] || "Scene conflict feels flat or unresolved.",
      });
    }

    if (reader.compulsiveReadability < 45 && content.split(/\s+/).length > 400) {
      dropRiskChapters.push(index + 1);
      warnings.push({
        chapter: index + 1,
        severity: "high",
        code: "drop-risk",
        message: "Reader momentum slows — high drop risk mid-chapter.",
      });
    }

    if (index === chapters.length - 1 && best.scores.hookStrength > 70 && reader.emotionalTension < 50) {
      warnings.push({
        chapter: index + 1,
        severity: "low",
        code: "soft-ending",
        message: "Ending resolves tension too cleanly for the genre.",
      });
    }

    bingeSum += best.scores.bingeability;
    pullSum += reader.compulsiveReadability;
    paceSum += editorial.pacingConsistencyScore;
    tensionSum += reader.emotionalTension;
    payoffSum += scene.overallHealth === "healthy" ? 75 : scene.overallHealth === "mixed" ? 55 : 38;
  });

  const n = chapters.length;
  const commercial: CommercialReadability = {
    bingeability: Math.round(bingeSum / n),
    emotionalPull: Math.round(pullSum / n),
    pacingMomentum: Math.round(paceSum / n),
    sceneTension: Math.round(tensionSum / n),
    payoffQuality: Math.round(payoffSum / n),
    composite: Math.round((bingeSum + pullSum + paceSum + tensionSum + payoffSum) / (n * 5)),
  };

  return {
    emotionalHeatmap,
    tensionCurve,
    dropRiskChapters,
    warnings: warnings.slice(0, 12),
    commercial,
  };
}
